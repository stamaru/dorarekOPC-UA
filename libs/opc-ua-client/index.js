/**
 * OPC-UA Client for detecting equipment stop signals
 * Based on the design from docs/02-architecture/outline_design.md
 */

const {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  ClientSubscription,
  TimestampsToReturn,
  ClientMonitoredItem
} = require("node-opcua");

const winston = require("winston");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "opc-ua-client.log" })
  ]
});

/**
 * OPC-UA Client class for detecting equipment stop signals
 */
class OpcUaStopDetectorClient {
  constructor(config) {
    this.config = {
      endpointUrl: config.endpointUrl || "opc.tcp://localhost:4840",
      securityMode: config.securityMode || MessageSecurityMode.None,
      securityPolicy: config.securityPolicy || SecurityPolicy.None,
      nodeId: config.nodeId || "ns=1;s=MachineryItemState.CurrentState", 
      monitoringParams: config.monitoringParams || {
        samplingInterval: 1000, 
        queueSize: 10,
        discardOldest: true
      },
      outOfServiceValue: config.outOfServiceValue || "OutOfService",
      subscriptionSettings: config.subscriptionSettings || {
        requestedPublishingInterval: 1000,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10
      }
    };
    
    this.client = null;
    this.session = null;
    this.subscription = null;
    this.isConnected = false;
    this.stopEventHandlers = [];
  }

  /**
   * Connect to the OPC-UA server
   */
  async connect() {
    try {
      logger.info(`Connecting to OPC-UA server at ${this.config.endpointUrl}`);
      
      // Create client
      this.client = OPCUAClient.create({
        applicationName: "dorarekOPC-UA Stop Detector Client",
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 10
        },
        securityMode: this.config.securityMode,
        securityPolicy: this.config.securityPolicy,
        endpointMustExist: false
      });

      // Event handlers for client
      this.client.on("backoff", (retry, delay) => {
        logger.info(`Connection retry attempt ${retry}, delay: ${delay}ms`);
      });

      this.client.on("connection_reestablished", () => {
        logger.info("Connection reestablished");
        this.createSubscription();
      });

      this.client.on("connection_lost", () => {
        logger.warn("Connection lost to OPC-UA Server");
        this.isConnected = false;
      });

      // Connect to server
      await this.client.connect(this.config.endpointUrl);
      logger.info("Connected to OPC-UA server");
      
      // Create session
      this.session = await this.client.createSession();
      logger.info("Session created");
      
      // Create subscription
      await this.createSubscription();
      
      this.isConnected = true;
      return true;
    } catch (err) {
      logger.error(`Failed to connect to OPC-UA server: ${err.message}`);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Create a subscription to monitor OPC-UA node changes
   */
  async createSubscription() {
    try {
      // Create subscription
      this.subscription = ClientSubscription.create(this.session, this.config.subscriptionSettings);
      
      this.subscription.on("started", () => {
        logger.info(`Subscription started - publishing interval: ${this.subscription.publishingInterval}ms`);
      });

      this.subscription.on("terminated", () => {
        logger.info("Subscription terminated");
      });

      // Monitor item for machine state changes
      await this.monitorMachineState();
      
      return true;
    } catch (err) {
      logger.error(`Failed to create subscription: ${err.message}`);
      return false;
    }
  }

  /**
   * Monitor the MachineryItemState node for changes
   */
  async monitorMachineState() {
    try {
      logger.info(`Monitoring node ${this.config.nodeId}`);

      const itemToMonitor = {
        nodeId: this.config.nodeId,
        attributeId: AttributeIds.Value
      };
      
      const monitoredItem = ClientMonitoredItem.create(
        this.subscription,
        itemToMonitor,
        this.config.monitoringParams,
        TimestampsToReturn.Both
      );

      monitoredItem.on("changed", (dataValue) => {
        try {
          logger.info(`MachineryItemState changed: ${dataValue.value.value}, timestamp: ${dataValue.serverTimestamp}`);
          
          // Check if the state is "OutOfService" which indicates equipment stop
          if (dataValue.value.value === this.config.outOfServiceValue) {
            logger.warn(`Equipment STOP detected! Timestamp: ${dataValue.serverTimestamp}`);
            
            // Create stop event data
            const stopEvent = {
              timestamp: dataValue.serverTimestamp,
              nodeId: this.config.nodeId,
              value: dataValue.value.value,
              status: dataValue.statusCode.toString()
            };
            
            // Notify all registered handlers
            this._notifyStopEventHandlers(stopEvent);
          }
        } catch (err) {
          logger.error(`Error processing value change: ${err.message}`);
        }
      });

      monitoredItem.on("err", (err) => {
        logger.error(`Monitored item error: ${err.message}`);
      });
      
      return true;
    } catch (err) {
      logger.error(`Failed to set up monitoring: ${err.message}`);
      return false;
    }
  }

  /**
   * Register a callback function to be called when equipment stop is detected
   * @param {Function} handler - Function to be called with stop event data
   */
  onStopDetected(handler) {
    if (typeof handler === "function") {
      this.stopEventHandlers.push(handler);
      logger.info("Stop event handler registered");
      return true;
    }
    logger.warn("Invalid stop event handler");
    return false;
  }

  /**
   * Notify all registered handlers of a stop event
   * @param {Object} stopEvent - Stop event data
   */
  _notifyStopEventHandlers(stopEvent) {
    this.stopEventHandlers.forEach((handler) => {
      try {
        handler(stopEvent);
      } catch (err) {
        logger.error(`Error in stop event handler: ${err.message}`);
      }
    });
  }

  /**
   * Disconnect from the OPC-UA server
   */
  async disconnect() {
    try {
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
      logger.info("Disconnected from OPC-UA server");
      return true;
    } catch (err) {
      logger.error(`Error disconnecting from OPC-UA server: ${err.message}`);
      return false;
    }
  }
}

module.exports = OpcUaStopDetectorClient;