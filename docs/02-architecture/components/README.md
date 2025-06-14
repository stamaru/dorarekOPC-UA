# コンポーネント設計

このディレクトリには、dorarekOPC-UAプロジェクトの主要コンポーネントごとの詳細設計ドキュメントが含まれています。

## コンテンツ

- [edge_console_app_architecture.md](./edge_console_app_architecture.md) - エッジ側コンソールアプリケーションのアーキテクチャ
- cloud_admin_app_architecture.md - クラウド側管理アプリケーションのアーキテクチャ（作成予定）
- backend_api_architecture.md - バックエンドAPIのアーキテクチャ（作成予定）
- database_design.md - データベース設計（作成予定）

## 主要コンポーネント概要

### エッジコンソールアプリケーション

エッジコンソールアプリケーションは工場現場に設置されるエッジゲートウェイで動作し、以下の機能を提供します：

- IPカメラからの映像ストリームの取得と循環バッファへの保存
- OPC-UAクライアント機能による設備状態の監視
- 設備停止信号検知時の映像クリッピング処理
- クラウドへの安全なアップロード
- ローカルでの設定管理とモニタリング

### クラウド管理アプリケーション

クラウド管理アプリケーションはユーザーインターフェースを提供し、以下の機能を実装します：

- アップロードされた映像クリップの一覧表示と再生
- AI分析結果の可視化
- 設備停止イベントの検索・フィルタリング
- レポート生成
- ユーザー管理

### バックエンドAPI

バックエンドAPIはエッジデバイスとクラウド管理アプリケーション間の通信を仲介し、以下の機能を提供します：

- 認証・認可
- 映像およびメタデータの管理
- AIサービスとの連携
- エッジデバイス管理

### データベース設計

システムで使用するデータベースは以下の主要エンティティを管理します：

- 設備情報
- 映像クリップとメタデータ
- イベントログ
- ユーザーアカウント
- AI分析結果