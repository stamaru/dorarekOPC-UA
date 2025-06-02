dorarekOPC-UA/
├──.github/             # GitHub固有のファイル (ワークフロー、テンプレート)
├── apidocs/            # API仕様書 (例: OpenAPI)
├── apps/               # フロントエンドアプリケーション群
├── docs/               # プロジェクトドキュメント (マニュアル、アーキテクチャ図)
├── iac/                # Infrastructure as Code (SAM または CDK)
├── libs/               # 共有ライブラリ、ユーティリティ、Lambdaレイヤー
├── services/           # 個別のマイクロサービスまたはLambda関数グループ
├── scripts/            # ビルド、デプロイ、ユーティリティスクリプト
├── tests/              # 統合テストおよびエンドツーエンド(E2E)テスト
├──.gitignore
├── LICENSE
├── README.md           # 
├── package.json        # (Node.jsベースのモノレポ管理ツール用、例: Lerna, Nx, pnpm workspaces)
├── CLAUDE.md           # CALUDE CODE
└──...                 # その他のルートレベル設定ファイル