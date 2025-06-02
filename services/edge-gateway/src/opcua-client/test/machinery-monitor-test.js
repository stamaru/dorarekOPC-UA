/**
 * MachineryMonitorClientのテストスクリプト
 * 
 * このスクリプトは、OPC UA for Machineryに準拠した設備監視の
 * 実装例を示しています。
 */

const MachineryMonitorClient = require("../MachineryMonitorClient");
const winston = require("winston");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

// ロガーの設定
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
            filename: path.join(__dirname, "../../../logs/machinery-monitor-test.log")
        })
    ]
});

// 設定
const config = {
    endpointUrl: process.env.OPCUA_ENDPOINT || "opc.tcp://localhost:4840",
    applicationName: "MachineryMonitorTest",
    applicationUri: "urn:MachineryMonitorTest",
    
    // Machinery固有の設定
    machineryStateNodeId: process.env.OPCUA_MACHINERY_STATE_NODE || "ns=0;i=2259", // テスト用にServerStatusを使用
    errorCodeNodeId: process.env.OPCUA_MACHINERY_ERROR_NODE || "ns=0;i=2260",
    machineIdNodeId: process.env.OPCUA_MACHINE_ID_NODE || "ns=0;i=2261",
    
    // トリガー設定
    triggerStates: [1], // OutOfServiceでトリガー
    includeErrorDetails: true,
    
    // 接続設定
    connectionStrategy: {
        initialDelay: 2000,
        maxRetry: 5,
        maxDelay: 10000
    }
};

/**
 * 映像記録シミュレーター
 */
class VideoRecordingSimulator {
    constructor(logger) {
        this.logger = logger;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.preRecordSeconds = parseInt(process.env.VIDEO_PRE_RECORD_SECONDS) || 30;
        this.postRecordSeconds = parseInt(process.env.VIDEO_POST_RECORD_SECONDS) || 30;
    }

    /**
     * 映像記録トリガーハンドラ
     */
    handleVideoTrigger(triggerEvent) {
        this.logger.info("📹 Video recording triggered!", {
            reason: triggerEvent.eventType,
            machineId: triggerEvent.machineId,
            state: triggerEvent.state.name
        });

        if (this.isRecording) {
            this.logger.warn("Already recording, ignoring trigger");
            return;
        }

        this.startRecording(triggerEvent);
    }

    /**
     * 記録開始（シミュレーション）
     */
    startRecording(triggerEvent) {
        this.isRecording = true;
        this.recordingStartTime = new Date();

        const clipStartTime = new Date(triggerEvent.triggerTime.getTime() - (this.preRecordSeconds * 1000));
        const clipEndTime = new Date(triggerEvent.triggerTime.getTime() + (this.postRecordSeconds * 1000));

        this.logger.info(`🎬 Starting video clip extraction:`, {
            triggerTime: triggerEvent.triggerTime.toISOString(),
            clipStart: clipStartTime.toISOString(),
            clipEnd: clipEndTime.toISOString(),
            duration: `${this.preRecordSeconds + this.postRecordSeconds} seconds`
        });

        // メタデータの準備
        const metadata = {
            clipId: `CLIP_${Date.now()}_${triggerEvent.machineId}`,
            triggerEvent: triggerEvent,
            recording: {
                startTime: clipStartTime,
                endTime: clipEndTime,
                preRecord: this.preRecordSeconds,
                postRecord: this.postRecordSeconds
            }
        };

        this.logger.info("📝 Clip metadata:", metadata);

        // 記録完了のシミュレーション
        setTimeout(() => {
            this.stopRecording(metadata);
        }, 5000);
    }

    /**
     * 記録停止（シミュレーション）
     */
    stopRecording(metadata) {
        this.isRecording = false;
        
        this.logger.info("✅ Video clip extraction completed:", {
            clipId: metadata.clipId,
            duration: `${metadata.recording.preRecord + metadata.recording.postRecord}s`,
            fileSize: "~150MB (simulated)"
        });

        // クラウドアップロードのシミュレーション
        this.simulateCloudUpload(metadata);
    }

    /**
     * クラウドアップロードのシミュレーション
     */
    simulateCloudUpload(metadata) {
        this.logger.info("☁️  Uploading to cloud storage...", {
            clipId: metadata.clipId
        });

        setTimeout(() => {
            this.logger.info("✅ Upload completed:", {
                clipId: metadata.clipId,
                cloudUrl: `https://storage.example.com/clips/${metadata.clipId}.mp4`,
                metadataUrl: `https://storage.example.com/metadata/${metadata.clipId}.json`
            });
        }, 3000);
    }
}

/**
 * テストの実行
 */
async function runTest() {
    const client = new MachineryMonitorClient(config, logger);
    const videoRecorder = new VideoRecordingSimulator(logger);

    try {
        // 映像トリガーハンドラを登録
        client.onVideoTrigger(videoRecorder.handleVideoTrigger.bind(videoRecorder));

        // イベントハンドラを設定
        client.on("connected", (data) => {
            logger.info("✅ Connected to OPC-UA server", data);
        });

        client.on("stateChanged", (data) => {
            logger.info("🔄 Machine state changed:", {
                from: MachineryMonitorClient.StateNames[data.previousState],
                to: data.stateName,
                machineId: data.machineId
            });
        });

        client.on("equipmentStop", (data) => {
            logger.warn("⚠️  EQUIPMENT STOP EVENT:", {
                machineId: data.machineId,
                state: data.state.name,
                errorDetails: data.errorDetails
            });
        });

        client.on("errorDetected", (data) => {
            logger.error("❌ Error detected:", data);
        });

        client.on("connectionLost", () => {
            logger.error("❌ Connection lost!");
        });

        client.on("maxReconnectAttemptsReached", () => {
            logger.error("❌ Max reconnection attempts reached, giving up");
            process.exit(1);
        });

        // 接続
        logger.info("🔗 Connecting to OPC-UA server...");
        await client.connect();

        // 現在の状態を表示
        const status = client.getMachineStatus();
        logger.info("📊 Current machine status:", status);

        // 定期的な状態確認
        const statusInterval = setInterval(() => {
            const currentStatus = client.getMachineStatus();
            const stats = client.getStats();
            
            logger.info("📈 Status update:", {
                state: currentStatus.stateName,
                isOperational: currentStatus.isOperational,
                uptime: `${Math.floor(stats.uptime / 1000)}s`,
                eventsReceived: stats.eventsReceived,
                equipmentStops: stats.machinery.equipmentStops
            });
        }, 30000); // 30秒ごと

        // 手動トリガーのデモ（10秒後）
        setTimeout(() => {
            logger.info("🎯 Demonstrating manual trigger...");
            client.manualTrigger("Test trigger for demonstration");
        }, 10000);

        // プロセス終了ハンドラ
        const cleanup = async () => {
            logger.info("🛑 Shutting down...");
            clearInterval(statusInterval);
            await client.disconnect();
            process.exit(0);
        };

        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);

        // 監視を継続
        logger.info("👀 Monitoring machinery state... Press Ctrl+C to stop");

    } catch (error) {
        logger.error("❌ Test failed:", error);
        await client.disconnect();
        process.exit(1);
    }
}

// テストの実行
if (require.main === module) {
    // ログディレクトリの作成
    const fs = require("fs");
    const logDir = path.join(__dirname, "../../../logs");
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    logger.info("🚀 Starting Machinery Monitor Test");
    logger.info("Configuration:", {
        endpoint: config.endpointUrl,
        machineryStateNode: config.machineryStateNodeId,
        triggerStates: config.triggerStates
    });

    runTest().catch((error) => {
        logger.error("Fatal error:", error);
        process.exit(1);
    });
}

module.exports = { VideoRecordingSimulator };