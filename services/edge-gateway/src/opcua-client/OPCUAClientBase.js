/**
 * OPC-UAクライアント基底クラス
 * 
 * edge_console_app_architecture.mdで定義されているOPC-UAクライアントモジュールの
 * 実装基盤となるクラス。
 * 
 * このクラスは以下の機能を提供:
 * - OPC-UAサーバーへの接続管理
 * - セッション管理
 * - サブスクリプションとモニタリング
 * - 自動再接続
 * - イベント駆動アーキテクチャ
 */

const EventEmitter = require("events");
const {
    OPCUAClient,
    MessageSecurityMode,
    SecurityPolicy,
    AttributeIds,
    ClientSubscription,
    TimestampsToReturn,
    MonitoringParametersOptions,
    ClientMonitoredItem,
    DataType,
    StatusCodes
} = require("node-opcua");

class OPCUAClientBase extends EventEmitter {
    constructor(config, logger) {
        super();
        this.config = this.validateConfig(config);
        this.logger = logger;
        
        // クライアント状態
        this.client = null;
        this.session = null;
        this.subscription = null;
        this.monitoredItems = new Map();
        this.isConnected = false;
        this.isReconnecting = false;
        this.reconnectTimer = null;
        
        // 統計情報
        this.stats = {
            connectTime: null,
            disconnectTime: null,
            reconnectAttempts: 0,
            totalReconnects: 0,
            eventsReceived: 0
        };
    }

    /**
     * 設定の検証とデフォルト値の設定
     */
    validateConfig(config) {
        const defaults = {
            endpointUrl: "opc.tcp://localhost:4840",
            applicationName: "OPCUAClient",
            applicationUri: "urn:OPCUAClient",
            securityMode: MessageSecurityMode.None,
            securityPolicy: SecurityPolicy.None,
            requestedSessionTimeout: 60000,
            connectionStrategy: {
                initialDelay: 1000,
                maxRetry: 10,
                maxDelay: 30000
            },
            subscriptionOptions: {
                requestedPublishingInterval: 1000,
                requestedLifetimeCount: 100,
                requestedMaxKeepAliveCount: 10,
                maxNotificationsPerPublish: 100,
                publishingEnabled: true,
                priority: 10
            },
            monitoringDefaults: {
                samplingInterval: 1000,
                discardOldest: true,
                queueSize: 10
            }
        };

        return { ...defaults, ...config };
    }

    /**
     * OPC-UAサーバーへの接続
     */
    async connect() {
        if (this.isConnected) {
            this.logger.warn("Already connected to OPC-UA server");
            return;
        }

        try {
            this.logger.info(`Connecting to OPC-UA server: ${this.config.endpointUrl}`);
            
            // クライアントの作成
            this.client = OPCUAClient.create({
                applicationName: this.config.applicationName,
                applicationUri: this.config.applicationUri,
                connectionStrategy: this.config.connectionStrategy,
                securityMode: this.config.securityMode,
                securityPolicy: this.config.securityPolicy,
                endpointMustExist: false,
                keepSessionAlive: true
            });

            // イベントハンドラの設定
            this.setupClientEventHandlers();

            // 接続
            await this.client.connect(this.config.endpointUrl);
            this.logger.info("Connected to OPC-UA server");

            // セッションの作成
            await this.createSession();

            // サブスクリプションの作成
            await this.createSubscription();

            this.isConnected = true;
            this.stats.connectTime = new Date();
            this.stats.reconnectAttempts = 0;

            // 接続成功イベントを発行
            this.emit("connected", {
                endpointUrl: this.config.endpointUrl,
                sessionId: this.session.sessionId.toString()
            });

        } catch (error) {
            this.logger.error(`Connection failed: ${error.message}`);
            this.emit("connectionError", error);
            
            if (!this.isReconnecting) {
                this.scheduleReconnect();
            }
            
            throw error;
        }
    }

    /**
     * セッションの作成
     */
    async createSession() {
        try {
            this.session = await this.client.createSession({
                requestedSessionTimeout: this.config.requestedSessionTimeout
            });

            this.logger.info(`Session created: ${this.session.sessionId.toString()}`);

            // セッションイベントハンドラの設定
            this.setupSessionEventHandlers();

        } catch (error) {
            this.logger.error(`Failed to create session: ${error.message}`);
            throw error;
        }
    }

    /**
     * サブスクリプションの作成
     */
    async createSubscription() {
        try {
            this.subscription = ClientSubscription.create(
                this.session,
                this.config.subscriptionOptions
            );

            // サブスクリプションイベントハンドラの設定
            this.setupSubscriptionEventHandlers();

            await new Promise((resolve) => {
                this.subscription.on("started", resolve);
            });

            this.logger.info(
                `Subscription created: ${this.subscription.subscriptionId}`
            );

        } catch (error) {
            this.logger.error(`Failed to create subscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * ノードの監視開始
     */
    async monitorNode(nodeId, displayName, options = {}) {
        if (!this.subscription) {
            throw new Error("Subscription not created");
        }

        try {
            const monitoringParameters = {
                ...this.config.monitoringDefaults,
                ...options
            };

            const itemToMonitor = {
                nodeId: nodeId,
                attributeId: AttributeIds.Value
            };

            const monitoredItem = ClientMonitoredItem.create(
                this.subscription,
                itemToMonitor,
                monitoringParameters,
                TimestampsToReturn.Both
            );

            // 変更イベントハンドラ
            monitoredItem.on("changed", (dataValue) => {
                this.handleDataChange(nodeId, displayName, dataValue);
            });

            // エラーハンドラ
            monitoredItem.on("err", (message) => {
                this.logger.error(
                    `Monitoring error for ${displayName}: ${message}`
                );
                this.emit("monitoringError", { nodeId, displayName, error: message });
            });

            this.monitoredItems.set(displayName, {
                monitoredItem,
                nodeId,
                options
            });

            this.logger.info(`Monitoring started for ${displayName} (${nodeId})`);

            return monitoredItem;

        } catch (error) {
            this.logger.error(
                `Failed to monitor node ${displayName}: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * データ変更ハンドラ
     */
    handleDataChange(nodeId, displayName, dataValue) {
        this.stats.eventsReceived++;

        const changeData = {
            nodeId,
            displayName,
            value: dataValue.value?.value,
            dataType: dataValue.value?.dataType,
            statusCode: dataValue.statusCode,
            sourceTimestamp: dataValue.sourceTimestamp,
            serverTimestamp: dataValue.serverTimestamp,
            receivedTime: new Date()
        };

        this.logger.debug(
            `Data change for ${displayName}: ${JSON.stringify(changeData.value)}`
        );

        // データ変更イベントを発行
        this.emit("dataChange", changeData);
    }

    /**
     * ノードの値を読み取る
     */
    async readNodeValue(nodeId) {
        if (!this.session) {
            throw new Error("Session not established");
        }

        try {
            const dataValue = await this.session.read({
                nodeId: nodeId,
                attributeId: AttributeIds.Value
            });

            if (dataValue.statusCode.isGood()) {
                return {
                    value: dataValue.value.value,
                    dataType: dataValue.value.dataType,
                    timestamp: dataValue.serverTimestamp
                };
            } else {
                throw new Error(
                    `Bad status code: ${dataValue.statusCode.toString()}`
                );
            }

        } catch (error) {
            this.logger.error(`Failed to read node ${nodeId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * 複数ノードの値を一括読み取り
     */
    async readMultipleNodes(nodeIds) {
        if (!this.session) {
            throw new Error("Session not established");
        }

        try {
            const nodesToRead = nodeIds.map(nodeId => ({
                nodeId: nodeId,
                attributeId: AttributeIds.Value
            }));

            const dataValues = await this.session.read(nodesToRead);

            return dataValues.map((dataValue, index) => ({
                nodeId: nodeIds[index],
                value: dataValue.value?.value,
                dataType: dataValue.value?.dataType,
                statusCode: dataValue.statusCode,
                timestamp: dataValue.serverTimestamp
            }));

        } catch (error) {
            this.logger.error("Failed to read multiple nodes:", error);
            throw error;
        }
    }

    /**
     * クライアントイベントハンドラの設定
     */
    setupClientEventHandlers() {
        this.client.on("connection_lost", () => {
            this.logger.warn("Connection lost to OPC-UA server");
            this.isConnected = false;
            this.stats.disconnectTime = new Date();
            this.emit("connectionLost");
            this.scheduleReconnect();
        });

        this.client.on("connection_reestablished", () => {
            this.logger.info("Connection reestablished");
            this.isConnected = true;
            this.emit("connectionReestablished");
        });

        this.client.on("close", () => {
            this.logger.info("Client closed");
            this.isConnected = false;
        });

        this.client.on("backoff", (retry, delay) => {
            this.logger.debug(`Backoff: retry ${retry} in ${delay}ms`);
        });

        this.client.on("abort", () => {
            this.logger.error("Client connection aborted");
        });
    }

    /**
     * セッションイベントハンドラの設定
     */
    setupSessionEventHandlers() {
        this.session.on("session_closed", () => {
            this.logger.warn("Session closed");
            this.emit("sessionClosed");
        });

        this.session.on("session_restored", () => {
            this.logger.info("Session restored");
            this.emit("sessionRestored");
        });

        this.session.on("keepalive", () => {
            this.logger.debug("Session keepalive");
        });

        this.session.on("keepalive_failure", () => {
            this.logger.error("Session keepalive failure");
        });
    }

    /**
     * サブスクリプションイベントハンドラの設定
     */
    setupSubscriptionEventHandlers() {
        this.subscription.on("started", () => {
            this.logger.info(
                `Subscription started: ${this.subscription.subscriptionId}`
            );
            this.emit("subscriptionStarted", this.subscription.subscriptionId);
        });

        this.subscription.on("terminated", () => {
            this.logger.warn("Subscription terminated");
            this.emit("subscriptionTerminated");
        });

        this.subscription.on("received_notifications", () => {
            this.logger.debug("Received notifications");
        });

        this.subscription.on("keepalive", () => {
            this.logger.debug("Subscription keepalive");
        });

        this.subscription.on("status_changed", (statusCode) => {
            this.logger.info(
                `Subscription status changed: ${statusCode.toString()}`
            );
        });
    }

    /**
     * 再接続のスケジューリング
     */
    scheduleReconnect() {
        if (this.isReconnecting || this.reconnectTimer) {
            return;
        }

        this.isReconnecting = true;
        this.stats.reconnectAttempts++;

        const delay = Math.min(
            this.config.connectionStrategy.initialDelay * 
            Math.pow(2, this.stats.reconnectAttempts - 1),
            this.config.connectionStrategy.maxDelay
        );

        this.logger.info(`Scheduling reconnection in ${delay}ms`);

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            
            try {
                await this.reconnect();
                this.stats.totalReconnects++;
                this.isReconnecting = false;
            } catch (error) {
                this.logger.error(`Reconnection failed: ${error.message}`);
                
                if (this.stats.reconnectAttempts < this.config.connectionStrategy.maxRetry) {
                    this.scheduleReconnect();
                } else {
                    this.logger.error("Max reconnection attempts reached");
                    this.emit("maxReconnectAttemptsReached");
                    this.isReconnecting = false;
                }
            }
        }, delay);
    }

    /**
     * 再接続処理
     */
    async reconnect() {
        this.logger.info("Attempting to reconnect...");

        // 既存のリソースをクリーンアップ
        await this.cleanup();

        // 再接続
        await this.connect();

        // モニタリングを再開
        await this.restoreMonitoredItems();
    }

    /**
     * モニタードアイテムの復元
     */
    async restoreMonitoredItems() {
        this.logger.info("Restoring monitored items...");

        for (const [displayName, itemInfo] of this.monitoredItems) {
            try {
                await this.monitorNode(
                    itemInfo.nodeId,
                    displayName,
                    itemInfo.options
                );
            } catch (error) {
                this.logger.error(
                    `Failed to restore monitoring for ${displayName}: ${error.message}`
                );
            }
        }
    }

    /**
     * クリーンアップ処理
     */
    async cleanup() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.subscription) {
            try {
                await this.subscription.terminate();
            } catch (error) {
                this.logger.error(`Error terminating subscription: ${error.message}`);
            }
            this.subscription = null;
        }

        if (this.session) {
            try {
                await this.session.close();
            } catch (error) {
                this.logger.error(`Error closing session: ${error.message}`);
            }
            this.session = null;
        }

        if (this.client) {
            try {
                await this.client.disconnect();
            } catch (error) {
                this.logger.error(`Error disconnecting client: ${error.message}`);
            }
            this.client = null;
        }

        this.monitoredItems.clear();
        this.isConnected = false;
    }

    /**
     * 切断処理
     */
    async disconnect() {
        this.logger.info("Disconnecting from OPC-UA server...");
        
        this.stats.disconnectTime = new Date();
        await this.cleanup();
        
        this.emit("disconnected");
        this.logger.info("Disconnected from OPC-UA server");
    }

    /**
     * 統計情報の取得
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            isReconnecting: this.isReconnecting,
            monitoredItemsCount: this.monitoredItems.size,
            uptime: this.isConnected && this.stats.connectTime
                ? Date.now() - this.stats.connectTime.getTime()
                : 0
        };
    }
}

module.exports = OPCUAClientBase;