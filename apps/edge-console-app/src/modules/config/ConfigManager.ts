import { EventEmitter } from 'eventemitter3';
import fs from 'fs/promises';
import path from 'path';
import { IAppConfig } from '../../interfaces/config.interface';
import { configSchema } from './config.schema';
import { logger } from '../../utils/logger';

export interface ConfigManagerEvents {
  'config:changed': (config: IAppConfig) => void;
  'config:error': (error: Error) => void;
}

export class ConfigManager extends EventEmitter<ConfigManagerEvents> {
  private static instance: ConfigManager;
  private config: IAppConfig | null = null;
  private configPath: string;
  private watcherHandle?: NodeJS.Timer;

  private constructor() {
    super();
    this.configPath = path.join(process.cwd(), 'config', 'app.config.json');
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      this.startConfigWatcher();
      logger.info('Configuration Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Configuration Manager', error);
      throw error;
    }
  }

  public async loadConfig(): Promise<void> {
    try {
      // Load configuration from environment variables
      const envConfig = this.loadFromEnv();
      
      // Try to load from config file if it exists
      let fileConfig = {};
      try {
        const configFile = await fs.readFile(this.configPath, 'utf-8');
        fileConfig = JSON.parse(configFile);
      } catch (error) {
        logger.warn('Config file not found, using environment variables only');
      }

      // Merge configurations (file config takes precedence over env)
      const mergedConfig = this.mergeConfigs(envConfig, fileConfig);

      // Validate configuration
      const { error, value } = configSchema.validate(mergedConfig, { 
        abortEarly: false,
        stripUnknown: true 
      });

      if (error) {
        throw new Error(`Configuration validation failed: ${error.message}`);
      }

      this.config = value as IAppConfig;
      this.emit('config:changed', this.config);
      
      logger.info('Configuration loaded successfully');
    } catch (error) {
      logger.error('Failed to load configuration', error);
      this.emit('config:error', error as Error);
      throw error;
    }
  }

  private loadFromEnv(): Partial<IAppConfig> {
    return {
      app: {
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info',
        port: parseInt(process.env.PORT || '3000', 10),
      },
      opcua: {
        serverUrl: process.env.OPCUA_SERVER_URL || '',
        clientName: process.env.OPCUA_CLIENT_NAME || 'EdgeConsoleClient',
        connectionTimeout: parseInt(process.env.OPCUA_CONNECTION_TIMEOUT || '10000', 10),
        requestTimeout: parseInt(process.env.OPCUA_REQUEST_TIMEOUT || '5000', 10),
      },
      video: {
        bufferSizeSeconds: parseInt(process.env.VIDEO_BUFFER_SIZE_SECONDS || '300', 10),
        clipPreSeconds: parseInt(process.env.VIDEO_CLIP_PRE_SECONDS || '30', 10),
        clipPostSeconds: parseInt(process.env.VIDEO_CLIP_POST_SECONDS || '30', 10),
        encoding: (process.env.VIDEO_ENCODING as 'h264' | 'h265') || 'h264',
        cameras: [],
      },
      storage: {
        maxSizeGB: parseInt(process.env.STORAGE_MAX_SIZE_GB || '100', 10),
        cleanupIntervalHours: parseInt(process.env.STORAGE_CLEANUP_INTERVAL_HOURS || '24', 10),
        eventRetentionDays: parseInt(process.env.EVENT_RETENTION_DAYS || '30', 10),
        bufferPath: './data/buffer',
        eventsPath: './data/events',
      },
      cloud: {
        provider: (process.env.CLOUD_PROVIDER as 'aws' | 'azure' | 'gcp') || 'aws',
        uploadEnabled: process.env.CLOUD_UPLOAD_ENABLED === 'true',
        uploadRetryAttempts: parseInt(process.env.CLOUD_UPLOAD_RETRY_ATTEMPTS || '3', 10),
        uploadRetryDelayMs: parseInt(process.env.CLOUD_UPLOAD_RETRY_DELAY_MS || '5000', 10),
      },
      monitor: {
        cpuThreshold: parseInt(process.env.MONITOR_CPU_THRESHOLD || '80', 10),
        memoryThreshold: parseInt(process.env.MONITOR_MEMORY_THRESHOLD || '80', 10),
        diskThreshold: parseInt(process.env.MONITOR_DISK_THRESHOLD || '90', 10),
        checkIntervalSeconds: parseInt(process.env.MONITOR_CHECK_INTERVAL_SECONDS || '60', 10),
      },
      security: {
        enableHttps: process.env.ENABLE_HTTPS === 'true',
        sslKeyPath: process.env.SSL_KEY_PATH,
        sslCertPath: process.env.SSL_CERT_PATH,
      },
    };
  }

  private mergeConfigs(base: any, override: any): any {
    const merged = { ...base };
    
    for (const key in override) {
      if (override[key] !== null && override[key] !== undefined) {
        if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
          merged[key] = this.mergeConfigs(merged[key] || {}, override[key]);
        } else {
          merged[key] = override[key];
        }
      }
    }
    
    return merged;
  }

  private startConfigWatcher(): void {
    // Watch for configuration file changes every 30 seconds
    this.watcherHandle = setInterval(async () => {
      try {
        await this.loadConfig();
      } catch (error) {
        logger.error('Failed to reload configuration', error);
      }
    }, 30000);
  }

  public getConfig(): IAppConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return this.config;
  }

  public getModuleConfig<K extends keyof IAppConfig>(module: K): IAppConfig[K] {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return this.config[module];
  }

  public async updateConfig(updates: Partial<IAppConfig>): Promise<void> {
    try {
      const newConfig = this.mergeConfigs(this.config, updates);
      
      // Validate new configuration
      const { error, value } = configSchema.validate(newConfig, { 
        abortEarly: false,
        stripUnknown: true 
      });

      if (error) {
        throw new Error(`Configuration validation failed: ${error.message}`);
      }

      // Save to file
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(value, null, 2));

      this.config = value as IAppConfig;
      this.emit('config:changed', this.config);
      
      logger.info('Configuration updated successfully');
    } catch (error) {
      logger.error('Failed to update configuration', error);
      throw error;
    }
  }

  public destroy(): void {
    if (this.watcherHandle) {
      clearInterval(this.watcherHandle);
      this.watcherHandle = undefined;
    }
    this.removeAllListeners();
  }
}