export interface IAppConfig {
  app: IApplicationConfig;
  opcua: IOpcUaConfig;
  video: IVideoConfig;
  storage: IStorageConfig;
  cloud: ICloudConfig;
  monitor: IMonitorConfig;
  security: ISecurityConfig;
}

export interface IApplicationConfig {
  nodeEnv: string;
  logLevel: string;
  port: number;
}

export interface IOpcUaConfig {
  serverUrl: string;
  clientName: string;
  connectionTimeout: number;
  requestTimeout: number;
  securityMode?: string;
  securityPolicy?: string;
  certificatePath?: string;
  privateKeyPath?: string;
}

export interface IVideoConfig {
  bufferSizeSeconds: number;
  clipPreSeconds: number;
  clipPostSeconds: number;
  encoding: 'h264' | 'h265';
  cameras: ICameraConfig[];
}

export interface ICameraConfig {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  fps?: number;
  resolution?: string;
}

export interface IStorageConfig {
  maxSizeGB: number;
  cleanupIntervalHours: number;
  eventRetentionDays: number;
  bufferPath: string;
  eventsPath: string;
}

export interface ICloudConfig {
  provider: 'aws' | 'azure' | 'gcp';
  uploadEnabled: boolean;
  uploadRetryAttempts: number;
  uploadRetryDelayMs: number;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface IMonitorConfig {
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  checkIntervalSeconds: number;
}

export interface ISecurityConfig {
  enableHttps: boolean;
  sslKeyPath?: string;
  sslCertPath?: string;
}