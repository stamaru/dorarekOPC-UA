/**
 * Machinery監視OPC-UAクライアント
 * 
 * OPC UA for Machineryの仕様に基づいて、設備の状態を監視し、
 * OutOfService状態を検出して映像記録をトリガーするクライアント
 */

const OPCUAClientBase = require("./OPCUAClientBase");
const EventEmitter = require("events");

// MachineryItemState状態定義
// OPC UA for Machinery (VDMA 40001)仕様に基づく
const MachineryStates = {
    NOT_AVAILABLE: 0,      // 利用不可
    OUT_OF_SERVICE: 1,     // サービス停止（設備停止）
    NOT_EXECUTING: 2,      // 実行していない（アイドル）
    EXECUTING: 3           // 実行中
};

// 状態名のマッピング
const StateNames = {
    0: "NotAvailable",
    1: "OutOfService",
    2: "NotExecuting", 
    3: "Executing"
};

class MachineryMonitorClient extends OPCUAClientBase {
    constructor(config, logger) {
        super(config, logger);
        
        // 機械固有の設定
        this.machineryConfig = {
            machineryStateNodeId: config.machineryStateNodeId || "ns=2;s=MachineryItemState.CurrentState",
            errorCodeNodeId: config.errorCodeNodeId || "ns=2;s=MachineryItemState.ErrorCode",
            machineIdNodeId: config.machineIdNodeId || "ns=2;s=MachineIdentification.ProductInstanceUri",
            // トリガー設定
            triggerStates: config.triggerStates || [MachineryStates.OUT_OF_SERVICE],
            includeErrorDetails: config.includeErrorDetails !== false
        };

        // 状態管理
        this.currentState = null;
        this.previousState = null;
        this.lastStateChange = null;
        this.machineInfo = {};

        // イベントエミッター（映像記録トリガー用）
        this.triggerEmitter = new EventEmitter();
    }

    /**
     * 接続とMachinery固有の初期化
     */
    async connect() {
        await super.connect();

        try {
            // 機械情報の読み取り
            await this.readMachineInfo();

            // MachineryItemStateの監視を開始
            await this.startMachineryMonitoring();

        } catch (error) {
            this.logger.error(`Failed to initialize machinery monitoring: ${error.message}`);
            throw error;
        }
    }

    /**
     * 機械情報の読み取り
     */
    async readMachineInfo() {
        try {
            // 機械IDの読み取り
            const machineId = await this.readNodeValue(this.machineryConfig.machineIdNodeId);
            this.machineInfo.machineId = machineId.value;

            // 初期状態の読み取り
            const currentState = await this.readNodeValue(this.machineryConfig.machineryStateNodeId);
            this.currentState = currentState.value;
            this.previousState = this.currentState;

            this.logger.info(`Machine info: ID=${this.machineInfo.machineId}, Initial State=${StateNames[this.currentState]}`);

        } catch (error) {
            this.logger.warn(`Could not read machine info: ${error.message}`);
        }
    }

    /**
     * Machinery監視の開始
     */
    async startMachineryMonitoring() {
        // MachineryItemState.CurrentStateの監視
        await this.monitorNode(
            this.machineryConfig.machineryStateNodeId,
            "MachineryItemState",
            {
                samplingInterval: 500,  // 状態変化を早期検出するため高頻度
                queueSize: 1            // 最新の状態のみ必要
            }
        );

        // エラーコードの監視（設定されている場合）
        if (this.machineryConfig.includeErrorDetails) {
            try {
                await this.monitorNode(
                    this.machineryConfig.errorCodeNodeId,
                    "MachineryErrorCode",
                    {
                        samplingInterval: 1000,
                        queueSize: 1
                    }
                );
            } catch (error) {
                this.logger.warn(`Could not monitor error code: ${error.message}`);
            }
        }

        // データ変更イベントのカスタムハンドラを設定
        this.on("dataChange", this.handleMachineryDataChange.bind(this));
    }

    /**
     * Machinery固有のデータ変更ハンドラ
     */
    async handleMachineryDataChange(changeData) {
        if (changeData.displayName === "MachineryItemState") {
            await this.handleStateChange(changeData);
        } else if (changeData.displayName === "MachineryErrorCode") {
            await this.handleErrorCodeChange(changeData);
        }
    }

    /**
     * 状態変更の処理
     */
    async handleStateChange(changeData) {
        const newState = changeData.value;
        const stateName = StateNames[newState] || `Unknown(${newState})`;

        // 状態が変化した場合のみ処理
        if (newState !== this.currentState) {
            this.previousState = this.currentState;
            this.currentState = newState;
            this.lastStateChange = new Date();

            this.logger.info(
                `Machinery state changed: ${StateNames[this.previousState]} -> ${stateName}`
            );

            // 状態変更イベントを発行
            this.emit("stateChanged", {
                previousState: this.previousState,
                currentState: this.currentState,
                stateName: stateName,
                timestamp: this.lastStateChange,
                machineId: this.machineInfo.machineId,
                sourceTimestamp: changeData.sourceTimestamp,
                serverTimestamp: changeData.serverTimestamp
            });

            // トリガー状態かチェック
            if (this.machineryConfig.triggerStates.includes(newState)) {
                await this.handleTriggerState(changeData);
            }
        }
    }

    /**
     * トリガー状態の処理（設備停止検出）
     */
    async handleTriggerState(changeData) {
        const stateName = StateNames[this.currentState];
        
        this.logger.warn(`⚠️  EQUIPMENT STOP DETECTED - State: ${stateName}`);

        // エラー詳細を取得（可能な場合）
        let errorDetails = null;
        if (this.machineryConfig.includeErrorDetails) {
            try {
                const errorCode = await this.readNodeValue(this.machineryConfig.errorCodeNodeId);
                errorDetails = {
                    code: errorCode.value,
                    timestamp: errorCode.timestamp
                };
            } catch (error) {
                this.logger.debug(`Could not read error code: ${error.message}`);
            }
        }

        // 映像記録トリガーイベントを生成
        const triggerEvent = {
            eventType: "EquipmentStop",
            triggerTime: new Date(),
            machineId: this.machineInfo.machineId,
            state: {
                current: this.currentState,
                previous: this.previousState,
                name: stateName
            },
            errorDetails: errorDetails,
            opcuaData: {
                nodeId: this.machineryConfig.machineryStateNodeId,
                sourceTimestamp: changeData.sourceTimestamp,
                serverTimestamp: changeData.serverTimestamp
            },
            metadata: {
                triggerSource: "OPC-UA MachineryItemState",
                clientId: this.config.applicationName,
                sessionId: this.session?.sessionId?.toString()
            }
        };

        // トリガーイベントを発行
        this.triggerEmitter.emit("videoTrigger", triggerEvent);
        this.emit("equipmentStop", triggerEvent);

        // 統計を更新
        this.stats.equipmentStops = (this.stats.equipmentStops || 0) + 1;

        this.logger.info(`Video recording trigger event emitted: ${JSON.stringify(triggerEvent)}`);
    }

    /**
     * エラーコード変更の処理
     */
    async handleErrorCodeChange(changeData) {
        const errorCode = changeData.value;
        
        if (errorCode) {
            this.logger.warn(`Machinery error code: ${errorCode}`);
            
            this.emit("errorDetected", {
                errorCode: errorCode,
                timestamp: new Date(),
                machineId: this.machineInfo.machineId,
                currentState: this.currentState,
                sourceTimestamp: changeData.sourceTimestamp
            });
        }
    }

    /**
     * 映像トリガーイベントリスナーの登録
     */
    onVideoTrigger(callback) {
        this.triggerEmitter.on("videoTrigger", callback);
    }

    /**
     * 映像トリガーイベントリスナーの解除
     */
    offVideoTrigger(callback) {
        this.triggerEmitter.off("videoTrigger", callback);
    }

    /**
     * 現在の機械状態を取得
     */
    getMachineStatus() {
        return {
            machineId: this.machineInfo.machineId,
            currentState: this.currentState,
            stateName: StateNames[this.currentState],
            previousState: this.previousState,
            lastStateChange: this.lastStateChange,
            isOperational: this.currentState === MachineryStates.EXECUTING,
            isStopped: this.currentState === MachineryStates.OUT_OF_SERVICE,
            connectionStatus: {
                isConnected: this.isConnected,
                endpointUrl: this.config.endpointUrl
            }
        };
    }

    /**
     * 手動でトリガーイベントを発生（テスト用）
     */
    async manualTrigger(reason = "Manual trigger") {
        this.logger.info(`Manual trigger initiated: ${reason}`);

        const triggerEvent = {
            eventType: "ManualTrigger",
            triggerTime: new Date(),
            machineId: this.machineInfo.machineId,
            state: {
                current: this.currentState,
                previous: this.previousState,
                name: StateNames[this.currentState]
            },
            reason: reason,
            metadata: {
                triggerSource: "Manual",
                clientId: this.config.applicationName
            }
        };

        this.triggerEmitter.emit("videoTrigger", triggerEvent);
        this.emit("manualTrigger", triggerEvent);
    }

    /**
     * 統計情報の取得（拡張版）
     */
    getStats() {
        const baseStats = super.getStats();
        
        return {
            ...baseStats,
            machinery: {
                machineId: this.machineInfo.machineId,
                currentState: StateNames[this.currentState],
                lastStateChange: this.lastStateChange,
                equipmentStops: this.stats.equipmentStops || 0
            }
        };
    }
}

// 状態定数をエクスポート
MachineryMonitorClient.MachineryStates = MachineryStates;
MachineryMonitorClient.StateNames = StateNames;

module.exports = MachineryMonitorClient;