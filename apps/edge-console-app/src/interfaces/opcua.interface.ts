import { NodeId, DataValue } from 'node-opcua';

export interface IOpcUaClientEvents {
  'connected': () => void;
  'disconnected': () => void;
  'connection_lost': () => void;
  'reconnecting': (attempt: number) => void;
  'error': (error: Error) => void;
  'machine_state_changed': (state: MachineState) => void;
  'machine_stopped': (reason: StopReason) => void;
}

export enum MachineState {
  Executing = 'Executing',
  Idle = 'Idle',
  Paused = 'Paused',
  Aborted = 'Aborted',
  Stopped = 'Stopped',
  Suspended = 'Suspended',
  OutOfService = 'OutOfService',
  Unknown = 'Unknown'
}

export interface StopReason {
  timestamp: Date;
  state: MachineState;
  reason?: string;
  machineId: string;
  nodeId?: string;
  additionalData?: Record<string, any>;
}

export interface MonitoredNode {
  nodeId: NodeId | string;
  attributeId?: number;
  samplingInterval?: number;
  queueSize?: number;
  discardOldest?: boolean;
}

export interface SubscriptionOptions {
  requestedPublishingInterval?: number;
  requestedLifetimeCount?: number;
  requestedMaxKeepAliveCount?: number;
  maxNotificationsPerPublish?: number;
  publishingEnabled?: boolean;
  priority?: number;
}