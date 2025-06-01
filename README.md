dorarekOPC-UA/
├──.github/            # GitHub固有のファイル (ワークフロー、テンプレート)
├──.junie/             # オプション: AIコーディングアシスタント用ガイドライン (例: Junie AI)
├── apidocs/            # API仕様書 (例: OpenAPI)
├── apps/            # API仕様書 (例: OpenAPI)
├── docs/               # プロジェクトドキュメント (マニュアル、アーキテクチャ図)
├── iac/                # Infrastructure as Code (SAM または CDK)
├── libs/               # 共有ライブラリ、ユーティリティ、Lambdaレイヤー
├── services/           # 個別のマイクロサービスまたはLambda関数グループ
├── scripts/            # ビルド、デプロイ、ユーティリティスクリプト
├── tests/              # 統合テストおよびエンドツーエンド(E2E)テスト
├──.gitignore
├── LICENSE
├── README.md
├── package.json        # (Node.jsベースのモノレポ管理ツール用、例: Lerna, Nx, pnpm workspaces)
├── pnpm-workspace.yaml # (pnpm workspaces を使用する場合)
├── turbo.json          # (Turborepo を使用する場合)
└──...                 # その他のルートレベル設定ファイル