import { ConfigManager } from './ConfigManager';
import fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');
jest.mock('../../utils/logger');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockConfigPath = path.join(process.cwd(), 'config', 'app.config.json');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (ConfigManager as any).instance = null;
    configManager = ConfigManager.getInstance();
  });

  afterEach(() => {
    configManager.destroy();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with default config', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      process.env.OPCUA_SERVER_URL = 'opc.tcp://localhost:4840';
      
      await configManager.initialize();
      
      const config = configManager.getConfig();
      expect(config).toBeDefined();
      expect(config.app.nodeEnv).toBe('test');
      expect(config.opcua.serverUrl).toBe('opc.tcp://localhost:4840');
    });

    it('should load config from file if exists', async () => {
      const mockConfig = {
        app: { nodeEnv: 'production', logLevel: 'error', port: 8080 },
        opcua: { serverUrl: 'opc.tcp://test:4840', clientName: 'TestClient' },
      };
      
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
      
      await configManager.initialize();
      
      const config = configManager.getConfig();
      expect(config.app.port).toBe(8080);
      expect(config.opcua.clientName).toBe('TestClient');
    });
  });

  describe('getModuleConfig', () => {
    it('should return specific module config', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      process.env.OPCUA_SERVER_URL = 'opc.tcp://localhost:4840';
      
      await configManager.initialize();
      
      const opcuaConfig = configManager.getModuleConfig('opcua');
      expect(opcuaConfig.serverUrl).toBe('opc.tcp://localhost:4840');
    });

    it('should throw error if config not initialized', () => {
      expect(() => configManager.getModuleConfig('opcua')).toThrow('Configuration not initialized');
    });
  });

  describe('updateConfig', () => {
    it('should update config and save to file', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      process.env.OPCUA_SERVER_URL = 'opc.tcp://localhost:4840';
      
      await configManager.initialize();
      
      const updates = {
        app: { port: 5000 },
      };
      
      await configManager.updateConfig(updates);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('"port": 5000')
      );
      
      const config = configManager.getConfig();
      expect(config.app.port).toBe(5000);
    });

    it('should validate config before updating', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      process.env.OPCUA_SERVER_URL = 'opc.tcp://localhost:4840';
      
      await configManager.initialize();
      
      const invalidUpdates = {
        app: { port: 'invalid' as any },
      };
      
      await expect(configManager.updateConfig(invalidUpdates)).rejects.toThrow('Configuration validation failed');
    });
  });

  describe('event handling', () => {
    it('should emit config:changed event on config change', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      process.env.OPCUA_SERVER_URL = 'opc.tcp://localhost:4840';
      
      const changeHandler = jest.fn();
      configManager.on('config:changed', changeHandler);
      
      await configManager.initialize();
      
      expect(changeHandler).toHaveBeenCalledWith(expect.objectContaining({
        app: expect.any(Object),
        opcua: expect.any(Object),
      }));
    });

    it('should emit config:error event on error', async () => {
      const errorHandler = jest.fn();
      configManager.on('config:error', errorHandler);
      
      await expect(configManager.initialize()).rejects.toThrow();
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});