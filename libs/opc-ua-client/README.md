# OPC-UA Stop Detector Client

A Node.js module to detect equipment stop signals via OPC-UA protocol, specifically designed for the dorarekOPC-UA project.

## Overview

This client connects to OPC-UA servers running on industrial equipment and subscribes to machine state changes. When a machine enters the `OutOfService` state, indicating a stop condition, the client triggers registered callback functions.

Based on the project's architecture specification from `docs/02-architecture/outline_design.md`, this client serves as the OPC-UA interface component of the edge gateway system.

## Features

- Connect to OPC-UA servers with configurable security settings
- Monitor machine states using standard `MachineryItemState` model (from OPC UA for Machinery)
- Detect equipment stop signals through subscription-based notifications
- Trigger callbacks when equipment stops are detected
- Automatic reconnection and subscription handling
- Comprehensive logging

## Installation

```bash
cd libs/opc-ua-client
npm install
```

## Usage

Basic example:

```javascript
const OpcUaStopDetectorClient = require('./index');

// Configuration for OPC-UA client
const clientConfig = {
  endpointUrl: "opc.tcp://your-opcua-server:4840",
  nodeId: "ns=1;s=MachineryItemState.CurrentState",
  outOfServiceValue: "OutOfService"
};

// Create client instance
const client = new OpcUaStopDetectorClient(clientConfig);

// Register stop event handler
client.onStopDetected((stopEvent) => {
  console.log(`Equipment stop detected at ${stopEvent.timestamp}`);
  // Trigger video clipping here
});

// Connect to server
async function start() {
  await client.connect();
  console.log("Monitoring for equipment stops...");
}

start();
```

See `example.js` for a more detailed implementation.

## Configuration

The client accepts the following configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| endpointUrl | OPC-UA server endpoint URL | opc.tcp://localhost:4840 |
| securityMode | OPC-UA security mode | MessageSecurityMode.None |
| securityPolicy | OPC-UA security policy | SecurityPolicy.None |
| nodeId | Node ID to monitor for state changes | ns=1;s=MachineryItemState.CurrentState |
| outOfServiceValue | Value indicating stop state | OutOfService |
| monitoringParams | Parameters for node monitoring | { samplingInterval: 1000, queueSize: 10, discardOldest: true } |
| subscriptionSettings | Subscription configuration | See code for defaults |

## Integration with Video Processing

When a stop event is detected, handlers should trigger the video clip extraction process as outlined in the system architecture. This would typically involve:

1. Determine the exact timestamp of the stop event
2. Extract video from the buffer for a configured duration before and after the event
3. Prepare the clip for secure storage or cloud upload

## References

- OPC UA for Machinery (VDMA 40001)
- OPC UA specification
- node-opcua library documentation