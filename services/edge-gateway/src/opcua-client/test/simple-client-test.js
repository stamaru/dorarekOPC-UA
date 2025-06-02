/**
 * シンプルなOPC-UAクライアントのテストコード
 * 
 * このテストコードは、edge_console_app_architecture.mdに記載されている
 * OPC-UAクライアントモジュールの基本機能を実装したものです。
 * 
 * 主な機能:
 * - OPC-UAサーバーへの接続
 * - セッションの作成
 * - MachineryItemStateノードの監視（サブスクリプション）
 * - OutOfService状態の検出
 * - 接続状態の監視と再接続ロジック
 */

const {
    OPCUAClient,
    MessageSecurityMode,
    SecurityPolicy,
    AttributeIds,
    ClientSubscription,
    TimestampsToReturn,
    MonitoringParametersOptions,
    ReadValueIdOptions,
    ClientMonitoredItem,
    DataValue
} = require("node-opcua");

const winston = require("winston");
const path = require("path");

// ロガーの設定
const logger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "opcua-client-test.log" })
    ]
});

// OPC-UAクライアントの設定
const CLIENT_CONFIG = {
    // テスト用のOPC-UAサーバーエンドポイント
    // 実際の使用時は環境変数や設定ファイルから読み込む
    endpointUrl: process.env.OPCUA_ENDPOINT || "opc.tcp://localhost:4840",
    
    // 接続オプション
    connectionStrategy: {
        initialDelay: 1000,
        maxRetry: 10,
        maxDelay: 10000
    },
    
    // セキュリティ設定
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    
    // タイムアウト設定
    requestedSessionTimeout: 60000,
    
    // クライアント情報
    applicationName: "EdgeGatewayOPCUAClient",
    applicationUri: "urn:EdgeGateway:OPCUAClient"
};

// 監視対象のノードID
// 実際の使用時は、OPC UA for MachineryのMachineryItemStateノードを指定
const MONITORED_NODES = {
    // サンプル: 一般的なサーバーステータスノード
    serverStatus: "ns=0;i=2259",
    
    // TODO: 実際のMachineryItemStateノードIDに置き換える
    // machineryItemState: "ns=2;s=MachineryItemState.CurrentState"
};

/**
 * OPC-UAクライアントクラス
 * edge_console_app_architecture.mdのOPC-UAクライアントモジュールの実装
 */
class SimpleOPCUAClient {
    constructor(config = CLIENT_CONFIG) {
        this.config = config;
        this.client = null;
        this.session = null;
        this.subscription = null;
        this.monitoredItems = new Map();
        this.isConnected = false;
        this.reconnectTimer = null;
    }

    /**
     * OPC-UAサーバーへの接続を確立
     */
    async connect() {
        try {
            logger.info(`Connecting to OPC-UA server: ${this.config.endpointUrl}`);
            
            // クライアントの作成
            this.client = OPCUAClient.create({
                applicationName: this.config.applicationName,
                applicationUri: this.config.applicationUri,
                connectionStrategy: this.config.connectionStrategy,
                securityMode: this.config.securityMode,
                securityPolicy: this.config.securityPolicy,
                endpointMustExist: false
            });

            // 接続イベントハンドラの設定
            this.setupEventHandlers();

            // サーバーへの接続
            await this.client.connect(this.config.endpointUrl);
            logger.info("Successfully connected to OPC-UA server");

            // セッションの作成
            this.session = await this.client.createSession();
            logger.info("Session created successfully");

            this.isConnected = true;

            // サブスクリプションの設定
            await this.setupSubscriptions();

            // ノードの監視を開始
            await this.startMonitoring();

        } catch (error) {
            logger.error(`Connection failed: ${error.message}`);
            this.scheduleReconnect();
            throw error;
        }
    }

    /**
     * イベントハンドラの設定
     */
    setupEventHandlers() {
        this.client.on("connection_lost", () => {
            logger.warn("Connection lost to OPC-UA server");
            this.isConnected = false;
            this.scheduleReconnect();
        });

        this.client.on("connection_reestablished", () => {
            logger.info("Connection reestablished to OPC-UA server");
            this.isConnected = true;
        });

        this.client.on("close", () => {
            logger.info("OPC-UA client closed");
            this.isConnected = false;
        });

        this.client.on("backoff", (retry, delay) => {
            logger.debug(`Backoff: retry ${retry} in ${delay}ms`);
        });
    }

    /**
     * サブスクリプションの設定
     */
    async setupSubscriptions() {
        try {
            const subscriptionOptions = {
                requestedPublishingInterval: 1000,
                requestedLifetimeCount: 100,
                requestedMaxKeepAliveCount: 10,
                maxNotificationsPerPublish: 100,
                publishingEnabled: true,
                priority: 10
            };

            this.subscription = ClientSubscription.create(this.session, subscriptionOptions);

            this.subscription.on("started", () => {
                logger.info(`Subscription started - subscriptionId: ${this.subscription.subscriptionId}`);
            });

            this.subscription.on("keepalive", () => {
                logger.debug("Subscription keepalive");
            });

            this.subscription.on("terminated", () => {
                logger.warn("Subscription terminated");
            });

        } catch (error) {
            logger.error(`Failed to setup subscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * ノードの監視を開始
     */
    async startMonitoring() {
        try {
            // サーバーステータスの監視（テスト用）
            await this.monitorNode(
                MONITORED_NODES.serverStatus,
                "ServerStatus",
                this.handleServerStatusChange.bind(this)
            );

            // TODO: MachineryItemStateの監視を追加
            // await this.monitorNode(
            //     MONITORED_NODES.machineryItemState,
            //     "MachineryItemState",
            //     this.handleMachineryStateChange.bind(this)
            // );

            logger.info("Node monitoring started");

        } catch (error) {
            logger.error(`Failed to start monitoring: ${error.message}`);
            throw error;
        }
    }

    /**
     * 個別ノードの監視設定
     */
    async monitorNode(nodeId, displayName, changeHandler) {
        try {
            const itemToMonitor = {
                nodeId: nodeId,
                attributeId: AttributeIds.Value
            };

            const monitoringParameters = {
                samplingInterval: 1000,
                discardOldest: true,
                queueSize: 10
            };

            const monitoredItem = ClientMonitoredItem.create(
                this.subscription,
                itemToMonitor,
                monitoringParameters,
                TimestampsToReturn.Both
            );

            monitoredItem.on("changed", changeHandler);

            this.monitoredItems.set(displayName, monitoredItem);
            logger.info(`Monitoring started for node: ${displayName} (${nodeId})`);

        } catch (error) {
            logger.error(`Failed to monitor node ${displayName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * サーバーステータス変更ハンドラ（テスト用）
     */
    handleServerStatusChange(dataValue) {
        logger.debug(`Server status changed: ${JSON.stringify(dataValue.value.value)}`);
    }

    /**
     * MachineryItemState変更ハンドラ
     * OutOfService状態を検出して通知
     */
    handleMachineryStateChange(dataValue) {
        const currentState = dataValue.value.value;
        logger.info(`MachineryItemState changed: ${currentState}`);

        // OutOfService状態の検出
        if (currentState === "OutOfService") {
            logger.warn("⚠️  Equipment stopped - OutOfService state detected!");
            
            // イベントを発行（実際の実装では映像処理モジュールに通知）
            this.emitStopEvent({
                timestamp: new Date(),
                state: currentState,
                nodeId: MONITORED_NODES.machineryItemState,
                sourceTimestamp: dataValue.sourceTimestamp,
                serverTimestamp: dataValue.serverTimestamp
            });
        }
    }

    /**
     * 設備停止イベントの発行
     */
    emitStopEvent(eventData) {
        logger.info(`Equipment stop event emitted: ${JSON.stringify(eventData)}`);
        // TODO: 実際の実装では、EventEmitterやメッセージキューを使用して
        // 映像処理モジュールに通知する
    }

    /**
     * ノードの値を読み取る
     */
    async readNodeValue(nodeId) {
        try {
            if (!this.session) {
                throw new Error("Session not established");
            }

            const dataValue = await this.session.read({
                nodeId: nodeId,
                attributeId: AttributeIds.Value
            });

            logger.debug(`Read node ${nodeId}: ${JSON.stringify(dataValue.value)}`);
            return dataValue;

        } catch (error) {
            logger.error(`Failed to read node ${nodeId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * 再接続のスケジューリング
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        const reconnectDelay = 5000; // 5秒後に再接続
        logger.info(`Scheduling reconnection in ${reconnectDelay}ms`);

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                logger.error(`Reconnection failed: ${error.message}`);
            }
        }, reconnectDelay);
    }

    /**
     * クリーンアップと接続終了
     */
    async disconnect() {
        try {
            logger.info("Disconnecting from OPC-UA server");

            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

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
            logger.info("Successfully disconnected from OPC-UA server");

        } catch (error) {
            logger.error(`Error during disconnect: ${error.message}`);
            throw error;
        }
    }
}

/**
 * テスト実行
 */
async function runTest() {
    const client = new SimpleOPCUAClient();

    try {
        // 接続
        await client.connect();

        // しばらく監視を続ける
        logger.info("Monitoring OPC-UA server... Press Ctrl+C to stop");
        
        // 定期的にサーバーステータスを読み取る（テスト用）
        const readInterval = setInterval(async () => {
            try {
                await client.readNodeValue(MONITORED_NODES.serverStatus);
            } catch (error) {
                logger.error(`Failed to read server status: ${error.message}`);
            }
        }, 5000);

        // プロセス終了時のクリーンアップ
        process.on("SIGINT", async () => {
            logger.info("Received SIGINT, shutting down...");
            clearInterval(readInterval);
            await client.disconnect();
            process.exit(0);
        });

    } catch (error) {
        logger.error(`Test failed: ${error.message}`);
        await client.disconnect();
        process.exit(1);
    }
}

// テストの実行
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = { SimpleOPCUAClient };