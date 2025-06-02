# Edge Gateway Service

エッジゲートウェイサービスは、工場現場に設置されて、OPC-UAベースの設備監視と映像記録を行うコンポーネントです。

## 概要

このサービスは、edge_console_app_architecture.mdで定義されているエッジコンソールアプリケーションの実装です。主な機能：

- OPC-UAクライアントによる設備状態監視
- MachineryItemState（OPC UA for Machinery）のサポート
- 設備停止（OutOfService）検出時の映像記録トリガー
- 自動再接続とエラーハンドリング
- イベント駆動アーキテクチャ

## ディレクトリ構造

```
edge-gateway/
├── src/
│   ├── opcua-client/           # OPC-UAクライアント実装
│   │   ├── OPCUAClientBase.js  # 基底クラス
│   │   ├── MachineryMonitorClient.js  # Machinery監視クライアント
│   │   └── test/               # テストコード
│   │       ├── simple-client-test.js   # シンプルなテスト
│   │       └── machinery-monitor-test.js # Machinery監視テスト
│   └── index.js                # メインエントリーポイント（TODO）
├── .env.example                # 環境変数の例
├── package.json                # 依存関係
└── README.md                   # このファイル
```

## セットアップ

### 1. 依存関係のインストール

```bash
cd services/edge-gateway
npm install
```

### 2. 環境設定

`.env.example`をコピーして`.env`を作成し、環境に合わせて設定を行います：

```bash
cp .env.example .env
```

主な設定項目：

- `OPCUA_ENDPOINT`: OPC-UAサーバーのエンドポイント
- `OPCUA_MACHINERY_STATE_NODE`: MachineryItemStateのノードID
- `VIDEO_PRE_RECORD_SECONDS`: トリガー前の記録秒数
- `VIDEO_POST_RECORD_SECONDS`: トリガー後の記録秒数

### 3. OPC-UAサーバーの準備

テスト用のOPC-UAサーバーが必要です。以下のオプションがあります：

- [node-opcua-sampleserver](https://github.com/node-opcua/node-opcua-sampleserver)
- [Prosys OPC UA Simulation Server](https://www.prosysopc.com/products/opc-ua-simulation-server/)
- 実際の工場設備のOPC-UAサーバー

## 使用方法

### シンプルなOPC-UAクライアントのテスト

基本的な接続とモニタリングのテスト：

```bash
npm run test:opcua
# または
node src/opcua-client/test/simple-client-test.js
```

### Machinery監視のテスト

OPC UA for Machinery準拠の監視テスト：

```bash
node src/opcua-client/test/machinery-monitor-test.js
```

### プログラムでの使用例

```javascript
const MachineryMonitorClient = require("./src/opcua-client/MachineryMonitorClient");
const winston = require("winston");

// ロガーの設定
const logger = winston.createLogger({
    level: "info",
    transports: [new winston.transports.Console()]
});

// クライアントの作成
const client = new MachineryMonitorClient({
    endpointUrl: "opc.tcp://localhost:4840",
    machineryStateNodeId: "ns=2;s=MachineryItemState.CurrentState"
}, logger);

// 映像トリガーハンドラの登録
client.onVideoTrigger((triggerEvent) => {
    console.log("Video recording triggered!", triggerEvent);
    // ここで映像記録処理を実行
});

// 接続
await client.connect();
```

## クラスAPI

### OPCUAClientBase

基底クラスで、以下の機能を提供：

- **connect()**: サーバーへの接続
- **disconnect()**: 切断
- **monitorNode(nodeId, displayName, options)**: ノードの監視
- **readNodeValue(nodeId)**: ノード値の読み取り
- **readMultipleNodes(nodeIds)**: 複数ノードの一括読み取り
- **on(event, handler)**: イベントハンドラの登録

主なイベント：
- `connected`: 接続成功
- `connectionLost`: 接続喪失
- `dataChange`: データ変更
- `connectionError`: 接続エラー

### MachineryMonitorClient

OPC UA for Machinery対応のクライアント：

- **getMachineStatus()**: 現在の機械状態を取得
- **onVideoTrigger(callback)**: 映像トリガーハンドラの登録
- **manualTrigger(reason)**: 手動トリガー（テスト用）

追加イベント：
- `stateChanged`: 機械状態変更
- `equipmentStop`: 設備停止検出
- `errorDetected`: エラー検出

## トラブルシューティング

### 接続できない場合

1. OPC-UAサーバーが起動しているか確認
2. エンドポイントURLが正しいか確認
3. ファイアウォール設定を確認
4. ログファイルでエラーメッセージを確認

### ノードが見つからない場合

1. ノードIDが正しいか確認（UAExpertなどのツールで確認）
2. 名前空間インデックス（ns=）が正しいか確認
3. OPC-UAサーバーのアドレス空間を確認

### 再接続が頻発する場合

1. ネットワークの安定性を確認
2. OPC-UAサーバーのタイムアウト設定を確認
3. `connectionStrategy`の設定を調整

## 次のステップ

1. **映像処理モジュールの統合**: GStreamerを使用した映像キャプチャと循環バッファの実装
2. **クラウドアップローダーの実装**: 映像クリップとメタデータのクラウド転送
3. **ローカルUIの開発**: Webベースの設定・監視インターフェース
4. **本番環境対応**: セキュリティ設定、証明書認証、エラーハンドリングの強化

## ライセンス

[プロジェクトのライセンスに従う]