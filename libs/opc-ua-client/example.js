/**
 * Example usage of the OPC-UA Stop Detector Client
 */

const OpcUaStopDetectorClient = require('./index');

// Configuration for the OPC-UA client
const clientConfig = {
  // Change this to the actual OPC-UA server endpoint URL
  endpointUrl: "opc.tcp://localhost:4840",
  
  // Node ID to monitor for machine state
  // Format is typically: ns=<namespace>;s=<identifier>
  // This should be adjusted based on the actual OPC-UA server's address space
  nodeId: "ns=1;s=MachineryItemState.CurrentState",
  
  // Value that indicates "OutOfService" or stop state
  outOfServiceValue: "OutOfService",
  
  // Monitoring parameters
  monitoringParams: {
    samplingInterval: 1000,  // 1 second
    queueSize: 10,
    discardOldest: true
  },
  
  // Subscription settings
  subscriptionSettings: {
    requestedPublishingInterval: 1000,  // 1 second
    requestedLifetimeCount: 100,
    requestedMaxKeepAliveCount: 10,
    maxNotificationsPerPublish: 100,
    publishingEnabled: true,
    priority: 10
  }
};

/**
 * Handle equipment stop events
 * @param {Object} stopEvent - The stop event data
 */
function handleStopEvent(stopEvent) {
  console.log(`=== EQUIPMENT STOP DETECTED ===`);
  console.log(`Timestamp: ${stopEvent.timestamp}`);
  console.log(`Node ID: ${stopEvent.nodeId}`);
  console.log(`Value: ${stopEvent.value}`);
  console.log(`Status: ${stopEvent.status}`);
  
  // Here you would trigger the video clip extraction
  console.log("Triggering video clip extraction...");
  
  // Example: You could make a call to another service here
  // videoClipExtractor.extractClip({
  //   triggerTime: stopEvent.timestamp,
  //   preRollSeconds: 30,
  //   postRollSeconds: 30
  // });
}

async function main() {
  // Create and initialize the client
  const client = new OpcUaStopDetectorClient(clientConfig);
  
  // Register handler for stop events
  client.onStopDetected(handleStopEvent);
  
  try {
    // Connect to the OPC-UA server
    const connected = await client.connect();
    
    if (connected) {
      console.log("Successfully connected to OPC-UA server");
      console.log("Monitoring for equipment stop signals...");
      console.log("Press Ctrl+C to exit");
      
      // Keep the application running
      process.on('SIGINT', async () => {
        console.log("Shutting down...");
        await client.disconnect();
        process.exit();
      });
    } else {
      console.error("Failed to connect to OPC-UA server");
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Start the application
main();