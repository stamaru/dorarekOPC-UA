import { 
  OPCUAClient, 
  ClientSession, 
  ClientSubscription,
  MessageSecurityMode,
  SecurityPolicy,
  UserTokenType,
  ConnectionStrategyOptions,
  AttributeIds,
  DataValue,
  StatusCodes,
  NodeId,
  coerceNodeId
} from 'node-opcua';
import { EventEmitter } from 'eventemitter3';
import { logger } from '../../utils/logger';
import { IOpcUaConfig } from '../../interfaces/config.interface';
import { IOpcUaClientEvents, MonitoredNode, SubscriptionOptions } from '../../interfaces/opcua.interface';

export abstract class OpcUaClientBase extends EventEmitter<IOpcUaClientEvents> {
  protected client: OPCUAClient | null = null;
  protected session: ClientSession | null = null;
  protected subscription: ClientSubscription | null = null;
  protected config: IOpcUaConfig;
  protected isConnected: boolean = false;
  protected reconnectAttempt: number = 0;
  protected maxReconnectAttempts: number = 10;
  protected reconnectDelay: number = 5000;

  constructor(config: IOpcUaConfig) {
    super();
    this.config = config;
  }

  public async connect(): Promise<void> {
    try {
      logger.info('Connecting to OPC-UA server', { url: this.config.serverUrl });

      // Create client with security settings
      const connectionStrategy: ConnectionStrategyOptions = {
        initialDelay: 1000,
        maxRetry: this.maxReconnectAttempts,
        maxDelay: 10000,
      };

      const clientOptions = {
        applicationName: this.config.clientName,
        connectionStrategy,
        securityMode: this.getSecurityMode(),
        securityPolicy: this.getSecurityPolicy(),
        endpointMustExist: false,
        requestedSessionTimeout: 60000,
        clientCertificateManager: undefined, // TODO: Implement certificate manager
      };

      this.client = OPCUAClient.create(clientOptions);

      // Set up event handlers
      this.client.on('connection_lost', () => {
        logger.warn('Connection lost to OPC-UA server');
        this.isConnected = false;
        this.emit('connection_lost');
      });

      this.client.on('backoff', (retry: number, delay: number) => {
        logger.info(`Reconnecting to OPC-UA server (attempt ${retry}, delay ${delay}ms)`);
        this.reconnectAttempt = retry;
        this.emit('reconnecting', retry);
      });

      // Connect to server
      await this.client.connect(this.config.serverUrl);
      
      // Create session
      this.session = await this.client.createSession({
        type: UserTokenType.Anonymous,
      });

      this.isConnected = true;
      this.reconnectAttempt = 0;
      
      logger.info('Successfully connected to OPC-UA server');
      this.emit('connected');

      // Initialize monitoring
      await this.initializeMonitoring();
      
    } catch (error) {
      logger.error('Failed to connect to OPC-UA server', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from OPC-UA server');

      if (this.subscription) {
        await this.subscription.terminate();
        this.subscription = null;
      }

      if (this.session) {
        await this.session.close();
        this.session = null;
      }

      if (this.client) {
        await this.client.disconnect();
        this.client = null;
      }

      this.isConnected = false;
      logger.info('Successfully disconnected from OPC-UA server');
      this.emit('disconnected');
      
    } catch (error) {
      logger.error('Error during disconnect', error);
      throw error;
    }
  }

  protected async createSubscription(options?: SubscriptionOptions): Promise<ClientSubscription> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const subscriptionOptions = {
      requestedPublishingInterval: options?.requestedPublishingInterval || 1000,
      requestedLifetimeCount: options?.requestedLifetimeCount || 100,
      requestedMaxKeepAliveCount: options?.requestedMaxKeepAliveCount || 10,
      maxNotificationsPerPublish: options?.maxNotificationsPerPublish || 100,
      publishingEnabled: options?.publishingEnabled !== false,
      priority: options?.priority || 0,
    };

    this.subscription = await this.session.createSubscription2(subscriptionOptions);

    this.subscription.on('keepalive', () => {
      logger.debug('Subscription keepalive');
    });

    this.subscription.on('started', () => {
      logger.info('Subscription started', { 
        subscriptionId: this.subscription?.subscriptionId 
      });
    });

    return this.subscription;
  }

  protected async monitorNode(node: MonitoredNode): Promise<void> {
    if (!this.subscription) {
      throw new Error('No active subscription');
    }

    const nodeId = typeof node.nodeId === 'string' 
      ? coerceNodeId(node.nodeId) 
      : node.nodeId;

    const monitoringParameters = {
      samplingInterval: node.samplingInterval || 1000,
      queueSize: node.queueSize || 10,
      discardOldest: node.discardOldest !== false,
    };

    const itemToMonitor = {
      nodeId: nodeId!,
      attributeId: node.attributeId || AttributeIds.Value,
    };

    const monitoredItem = await this.subscription.monitor(
      itemToMonitor,
      monitoringParameters,
      2 // TimestampsToReturn.Both
    );

    monitoredItem.on('changed', (dataValue: DataValue) => {
      this.handleDataChange(nodeId!, dataValue);
    });

    monitoredItem.on('error', (error: Error) => {
      logger.error('Monitored item error', { nodeId: nodeId?.toString(), error });
      this.emit('error', error);
    });
  }

  protected async readNode(nodeId: string | NodeId): Promise<DataValue> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const nodeToRead = {
      nodeId: typeof nodeId === 'string' ? coerceNodeId(nodeId) : nodeId,
      attributeId: AttributeIds.Value,
    };

    const dataValue = await this.session.read(nodeToRead);
    
    if (dataValue.statusCode !== StatusCodes.Good) {
      throw new Error(`Failed to read node: ${dataValue.statusCode.toString()}`);
    }

    return dataValue;
  }

  protected async writeNode(nodeId: string | NodeId, value: any): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const nodeToWrite = {
      nodeId: typeof nodeId === 'string' ? coerceNodeId(nodeId) : nodeId,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType: 0, // Will be determined by server
          value: value,
        },
      },
    };

    const statusCode = await this.session.write(nodeToWrite);
    
    if (statusCode !== StatusCodes.Good) {
      throw new Error(`Failed to write node: ${statusCode.toString()}`);
    }
  }

  protected getSecurityMode(): MessageSecurityMode {
    switch (this.config.securityMode) {
      case 'Sign':
        return MessageSecurityMode.Sign;
      case 'SignAndEncrypt':
        return MessageSecurityMode.SignAndEncrypt;
      default:
        return MessageSecurityMode.None;
    }
  }

  protected getSecurityPolicy(): SecurityPolicy {
    switch (this.config.securityPolicy) {
      case 'Basic128Rsa15':
        return SecurityPolicy.Basic128Rsa15;
      case 'Basic256':
        return SecurityPolicy.Basic256;
      case 'Basic256Sha256':
        return SecurityPolicy.Basic256Sha256;
      default:
        return SecurityPolicy.None;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  protected abstract initializeMonitoring(): Promise<void>;
  protected abstract handleDataChange(nodeId: NodeId, dataValue: DataValue): void;
}