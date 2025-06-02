import Joi from 'joi';

export const configSchema = Joi.object({
  app: Joi.object({
    nodeEnv: Joi.string().valid('development', 'production', 'test').default('development'),
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    port: Joi.number().port().default(3000),
  }).required(),

  opcua: Joi.object({
    serverUrl: Joi.string().uri({ scheme: ['opc.tcp'] }).required(),
    clientName: Joi.string().default('EdgeConsoleClient'),
    connectionTimeout: Joi.number().min(1000).default(10000),
    requestTimeout: Joi.number().min(1000).default(5000),
    securityMode: Joi.string().valid('None', 'Sign', 'SignAndEncrypt').optional(),
    securityPolicy: Joi.string().valid('None', 'Basic128Rsa15', 'Basic256', 'Basic256Sha256').optional(),
    certificatePath: Joi.string().optional(),
    privateKeyPath: Joi.string().optional(),
  }).required(),

  video: Joi.object({
    bufferSizeSeconds: Joi.number().min(60).max(3600).default(300),
    clipPreSeconds: Joi.number().min(5).max(300).default(30),
    clipPostSeconds: Joi.number().min(5).max(300).default(30),
    encoding: Joi.string().valid('h264', 'h265').default('h264'),
    cameras: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        url: Joi.string().uri({ scheme: ['rtsp', 'rtmp', 'http', 'https'] }).required(),
        username: Joi.string().optional(),
        password: Joi.string().optional(),
        fps: Joi.number().min(1).max(60).optional(),
        resolution: Joi.string().pattern(/^\d+x\d+$/).optional(),
      })
    ).default([]),
  }).required(),

  storage: Joi.object({
    maxSizeGB: Joi.number().min(10).default(100),
    cleanupIntervalHours: Joi.number().min(1).default(24),
    eventRetentionDays: Joi.number().min(1).default(30),
    bufferPath: Joi.string().default('./data/buffer'),
    eventsPath: Joi.string().default('./data/events'),
  }).required(),

  cloud: Joi.object({
    provider: Joi.string().valid('aws', 'azure', 'gcp').default('aws'),
    uploadEnabled: Joi.boolean().default(true),
    uploadRetryAttempts: Joi.number().min(0).max(10).default(3),
    uploadRetryDelayMs: Joi.number().min(1000).default(5000),
    endpoint: Joi.string().uri().optional(),
    region: Joi.string().optional(),
    bucket: Joi.string().optional(),
    accessKeyId: Joi.string().optional(),
    secretAccessKey: Joi.string().optional(),
  }).required(),

  monitor: Joi.object({
    cpuThreshold: Joi.number().min(0).max(100).default(80),
    memoryThreshold: Joi.number().min(0).max(100).default(80),
    diskThreshold: Joi.number().min(0).max(100).default(90),
    checkIntervalSeconds: Joi.number().min(10).default(60),
  }).required(),

  security: Joi.object({
    enableHttps: Joi.boolean().default(false),
    sslKeyPath: Joi.string().when('enableHttps', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    sslCertPath: Joi.string().when('enableHttps', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }).required(),
});