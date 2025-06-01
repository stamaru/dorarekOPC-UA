# **工場設備停止時におけるOPC-UAトリガー型ビデオ記録・分析システム概要設計報告書**

## **I. エグゼクティブサマリー**

本報告書は、工場設備が停止した際の状況を把握し、原因究明を迅速化するためのシステム概要設計を提示するものである。提案システムの中核機能は、OPC-UA（Open Platform Communications Unified Architecture）プロトコルを介して設備停止信号を受信し、エッジゲートウェイで常時記録されている映像から停止前後の指定秒数を切り出し、クラウドストレージへ安全に保管、さらにAIを活用した映像分析により自動的に分類することである。

このアーキテクチャは、インシデント発生時の詳細な状況証拠を提供し、迅速な原因特定と再発防止策の策定を支援する。また、運用監視の高度化にも寄与する。本報告書では、エッジ処理、OPC-UA連携、クラウドストレージ、映像AIといった主要技術要素の選定方針と、それらを組み合わせたシステム全体の構成について詳述する。これにより、工場における生産性向上と安全性確保に貢献するシステムの実現を目指す。

## **II. システムアーキテクチャ概要**

### **A. 高レベルシステム図**

提案するシステムの全体像は、以下のコンポーネントとその連携によって構成される。

* **工場設備（OPC-UAサーバー搭載）**: 監視対象となる生産設備。OPC-UAサーバーを介して稼働状況データを発信する。  
* **エッジゲートウェイ**:  
  * **カメラ**: 設備周辺を撮影するIPカメラ。  
  * **OPC-UAクライアント**: 工場設備のOPC-UAサーバーに接続し、設備停止信号を受信する。  
  * **映像処理・バッファリング**: カメラからの映像を常時記録し、循環バッファに保持する。停止信号受信時に指定範囲の映像を切り出す。  
  * **セキュアアップロードモジュール**: 切り出された映像を暗号化し、クラウドへ安全に送信する。  
* **ネットワークインフラ**: 工場内LANおよびインターネット接続。  
* **クラウドプラットフォーム**:  
  * **オブジェクトストレージ**: 切り出された映像クリップを保管する。  
  * **映像AIサービス**: 保管された映像を分析し、自動分類する。  
  * **IoTハブ（オプション）**: エッジゲートウェイの管理や監視に使用可能。

これらのコンポーネント間の主要なデータフローは以下の通りである。

1. カメラからエッジゲートウェイへ常時映像ストリームが送られる。  
2. エッジゲートウェイは映像を循環バッファに記録する。  
3. 工場設備はOPC-UAサーバー経由で稼働状態（例：MachineryItemState）を送信する。  
4. エッジゲートウェイのOPC-UAクライアントは、関連する状態ノードを購読またはポーリングする。  
5. 「設備停止」信号（例：OutOfService状態）を検知すると、エッジゲートウェイはトリガー時刻を特定する。  
6. トリガー時刻の前後指定秒数の映像クリップが循環バッファから抽出される。  
7. 抽出されたクリップは、クラウドストレージへセキュアにアップロードされる。  
8. クラウドストレージへの新規オブジェクトイベントなどをトリガーとして、クラウド映像AIサービスがアップロードされた映像クリップを分析する。  
9. 分類結果（メタデータ）は、映像と共に、あるいは別のデータベースに保存され、後のレビューや分析に利用される。

### **B. エンドツーエンドのデータおよび制御フロー記述**

**データフロー:**

前述の通り、カメラからの映像はエッジゲートウェイの循環バッファに継続的に記録される。工場設備はOPC-UAを通じて稼働状態を通知し、エッジゲートウェイはこの信号を監視する。設備停止信号（例：OutOfService状態）を検知すると、その時刻を基準に前後指定時間の映像が切り出され、クラウドストレージへアップロードされる。その後、クラウド上のAIサービスがこの映像を分析し、分類結果を生成・保存する。

**制御フロー:**

1. エッジゲートウェイ上で、監視対象となるOPC-UAサーバーのエンドポイントとノードを設定する。  
2. エッジゲートウェイ上で、イベント発生時の映像切り出しにおける事前・事後記録時間を設定する。  
3. クラウドストレージのポリシー（ライフサイクル管理、アクセス制御など）を設定する。  
4. （該当する場合）カスタムAIモデルのトレーニングとデプロイを行う。

### **C. 主要アーキテクチャ原則**

* **モジュール性**: エッジ、クラウドなどのコンポーネントを明確なインターフェースで設計し、独立したアップグレードや置き換えを可能にする。  
* **スケーラビリティ**: カメラ台数、設備数、データ量の増加に対応できるシステムを構築する。  
* **信頼性**: フォールトトレランス、データ整合性、リカバリメカニズムを実装する。  
* **セキュリティ**: 全てのレイヤーで多層防御のアプローチを採用する。

システム全体の堅牢性と将来的な拡張性を考慮すると、OPC-UAサーバーとクライアント間、エッジゲートウェイとクラウドストレージ間、そしてクラウドストレージとAIサービス間のインターフェース定義の明確性が極めて重要となる。これらのインターフェースが曖昧であると、統合時の問題やスケーラビリティの阻害要因となり得る。システムは複数の異なるコンポーネントで構成され、それぞれが異なるベンダーや技術に基づいている可能性があるため、各連携ポイントでの契約（データフォーマット、API仕様など）が厳密に定義されていなければ、デバッグは複雑化し、一部コンポーネントの置き換え（例：異なるAIサービスの採用）が大規模な改修を伴うことになる。

また、設備停止に関連するメタデータ（タイムスタンプ、設備ID、OPC-UAの状態やエラーコードなど）は、映像クリップのライフサイクル全体を通じて密接に紐付けられる必要がある。このコンテキスト情報は、AIによる正確な分類と、その後の有意義な分析にとって不可欠である。どの機械が、いつ停止し、機械自身がどのような状態を報告したかという情報なしに、機械停止の映像クリップだけでは有用性が低い。このメタデータがエッジからクラウドへの転送中やAI処理中に失われたり分離されたりすると、分類は「機械停止」といった一般的なものになり、「機械Xが障害Yにより停止」といった具体的なものではなくなってしまう。これは、イベントを効果的に自動分類する能力に影響を与える。

## **III. エッジ層設計：リアルタイム監視とビデオキャプチャ**

### **A. 映像取得と連続記録**

**カメラ選定に関する考慮事項:**

* **解像度とフレームレート**: AI分析に必要な詳細度と、ストレージおよび帯域幅の制約とのバランスを取る。高解像度（例：1080p、4K）は詳細な情報を提供するが、データ負荷が増加する。  
* **低照度性能**: 照明条件が変動しやすい、または24時間稼働の工場環境では不可欠。  
* **産業環境への適合性**: 堅牢な筐体（IP67、IK10など）、温度耐性、耐振動性。  
* **ネットワークインターフェース**: イーサネット接続のIPカメラ（PoE対応が配線簡素化のため望ましい）。  
* **圧縮サポート**: H.265エンコーディング対応カメラ。

**エッジゲートウェイ：ハードウェアとソフトウェアスタック:**

* **ハードウェアオプション**:  
  * NVIDIA Jetsonシリーズ（例：Jetson Xavier NX, Orin Nano/AGX）：DeepStream SDKを活用したオンデバイスAI機能向け 1。エッジ側である程度の予備的AI処理（例：クラウドアップロード前の誤検知削減のための物体検知）が望ましい場合に適している。  
  * Google Coral Dev BoardまたはUSB Accelerator：TensorFlow Liteモデル向けで、計算負荷の低いエッジAIに適している 3。  
  * 産業用PC（IPC）：十分な処理能力とストレージを備え、コンポーネント選択の柔軟性が高い。  
* **ソフトウェアスタック**:  
  * オペレーティングシステム：Linuxベース（例：必要に応じてリアルタイムパッチを適用したUbuntu）。  
  * 映像処理ライブラリ：**GStreamer**は、映像ストリームのキャプチャ、エンコード、バッファリング、クリッピング処理に適した、柔軟性の高いパイプラインベースのマルチメディアフレームワークである 5。H.264記録やRTPストリーミングのためのGStreamerパイプラインの例があり 8、これを応用できる。  
  * コンテナ化（例：Docker）：アプリケーションコンポーネント（OPC-UAクライアント、映像処理、アップローダー）のデプロイと管理のため。

**事前・事後イベント記録のための循環バッファ実装:**

* 原理：エッジゲートウェイのメモリまたは高速ローカルストレージ（例：SSD）内の固定サイズのバッファで、新しい映像フレームが最も古いフレームを継続的に上書きする（FIFOアプローチ）9。これにより、イベントトリガー発生 *前* の映像データが確実に利用可能となる。  
* 実装：通常、ヘッドポインタとテールポインタを持つ配列で実装される 9。特許US7088387B1 10 には、トリガー発生時にテールポインタが停止し、所定数の追加（事後トリガー）フレームが保存されるシステムが詳述されている。  
* 事前・事後トリガー期間管理：循環バッファのサイズとフレームレートが、最大の事前トリガー記録期間を決定する。事後トリガー期間は、イベント後に記録を継続する時間を指定する設定可能なパラメータである。  
* 上書き戦略：バッファが満杯になると、最も古いデータが上書きされる。これは連続記録の標準的な動作である 9。イベントクリップが迅速にオフロードされない場合に、メインの循環バッファによって上書きされるのを防ぐ戦略については、セクションIII.Cで議論する。

**映像エンコーディング標準:**

* **H.265 (HEVC) vs. H.264 (AVC)**: H.265はH.264と比較して大幅に優れた圧縮効率を提供し、同等の画質でファイルサイズを約50%削減する 12。これにより、エッジおよびクラウドでのストレージ要件が低減され、アップロード時の帯域幅も削減される。  
* 推奨：カメラと処理ハードウェアが対応している場合はH.265を利用し、ストレージと帯域幅を最適化する。

エッジゲートウェイのハードウェア選択（例：Jetson対基本的なIPC）は、ローカルで予備的なAI分析を実行できるかどうかに直接影響する。より強力なエッジデバイスは、例えば設備停止時にフレーム内に人物や特定の物体が存在するかどうかを確認する軽量モデルを実行でき、無関係な映像のクラウドアップロードを削減できる可能性がある。ユーザーの要求はクラウドでの自動分類であるが、エッジリソース 1 はある程度のオンデバイス処理を可能にする。設備停止信号にノイズが多い、あるいは重要でないイベントでトリガーされる可能性がある場合、簡単なエッジAIチェック（例：「保守作業員は存在するか？」「影響を受ける機械部品は見えるか？」）により、不要なクラウドアップロードをフィルタリングし、帯域幅とAI処理コストを節約できる。これは、エッジハードウェアのコスト/複雑さとクラウド運用コストとのトレードオフになる。

循環バッファのサイズは、映像の解像度、フレームレート、エンコーディングと合わせて、最大の事前イベント記録期間を直接決定する、極めて重要な設計パラメータである。これは、インシデント分析における工場のニーズ（イベント発生前にどれだけ遡って確認する必要があるか）に基づいて慎重に計算されなければならない。例えば、インシデントの根本原因が通常、実際の設備停止信号の60秒前に現れるにもかかわらず、循環バッファがサイズ不足や高ビットレートのために事前イベント映像を30秒しか保持していない場合、重要な証拠が失われることになる。設計には、希望するプレロール時間に基づいたストレージ要件の計算（例：buffer\_size\_bytes=desired\_pre\_roll\_seconds×average\_bitrate\_bytes\_per\_second）が含まれる必要がある。このパラメータはシステムの有用性の根幹をなす 10。

GStreamerのパイプラインアーキテクチャ 5 は、基本的な記録だけでなく、連続バッファリングからトリガーによるクリップ保存への動的な切り替えや、イベント発生時のエンコーディングパラメータや出力シンクの再設定を処理する上で非常に重要である。OPC-UAトリガーが発生すると、システムは1) 循環バッファ内の現在位置をマークし、2) ポストトリガー期間の記録を継続し、3) 結合されたプレトリガーとポストトリガーのセグメントを抽出し、4) このセグメントを保存/アップロードする必要がある。GStreamerのsplitmuxsinkのようなエレメントや、appsrc/appsinkを中心としたカスタムロジックがこれを容易にする。H.264バックログ記録のC言語サンプル 7 は、バッファを管理し、要求に応じてクリップを保存するこのような機能を示唆している。この動的な制御は、「クリッピング」要件の主要な実現手段である。

### **B. OPC-UAによる設備停止信号検知**

**エッジゲートウェイ上のOPC-UAクライアント実装:**

* エッジゲートウェイはOPC-UAクライアントアプリケーションをホストする。  
* このクライアントは、工場設備上または設備と連携して動作するOPC-UAサーバーに接続する。  
* エッジゲートウェイ向けのOPC-UAアダプタ/クライアントの例として、SAP IoT 15 やAzure IoT Operations 16 が挙げられる。これらの資料は、エッジゲートウェイがOPC-UAクライアントとして機能し、サーバーノードを閲覧し、データ変更を購読できることを裏付けている。  
* クライアントは、定期的なポーリング、またはより効率的には特定のOPC-UAノードへのサブスクリプションを作成して値の変更通知を受けることでデータを取得できる 15。

**OPC-UA「マシンステータス」の監視:**

* 設備停止や障害を検知する主要な方法は、可能な限り標準化されたOPC UA情報モデルを活用することである。  
* コンパニオン仕様\*\*「OPC UA for Machinery」**（VDMA 40001シリーズ）が非常に関連性が高い。これは**「マシンステータス」\*\*ビルディングブロックを定義している 17。  
* 具体的には、MachineryItemState\_StateMachineType（OPC 40001-1 / Machinery Basic Building Blocks、例：18に基づくバージョン1.04.0で詳述）は、NotAvailable、OutOfService、NotExecuting、Executingといったいくつかのトップレベル状態を定義している。  
* **OutOfService** 状態は、MachineryItemが機能しておらず、いかなる活動も行っていないことを表すと明示的に定義されており、例として機械がエラー状態にあるかブロックされている場合が挙げられる 18。この状態は、映像記録をトリガーする強力な候補となる。  
* MachineryItemStateインスタンスのCurrentState変数が現在の状態を保持する 18。  
* 基本仕様 18 では、OutOfServiceの特定のサブ状態やErrorCode、FaultIDのような標準ノードは定義されていないが、コンパニオン仕様やベンダーがこれらを拡張する可能性があると記されている。これは、システムが、そのような拡張を通じて利用可能であれば、より詳細なエラー情報を照会できる可能性があるように設計されるべきであることを意味する。  
* 一般的なOPC-UAの概念であるアラーム＆コンディション（AC）19 も、機械がそれらを実装していれば使用可能だが、「マシンステータス」モデルの方が運用状態に対してより直接的である。

**映像クリッピングのトリガーロジック:**

* エッジゲートウェイのOPC-UAクライアントは、MachineryItemState（または他の指定された障害/停止ノード）を監視する。  
* 監視対象ノードが「停止」または「障害」状態（例：CurrentStateがOutOfServiceになる）に遷移すると、クライアントソフトウェアはこのイベントのタイムスタンプを記録する。  
* このタイムスタンプが「トリガー時刻」となり、映像記録モジュールが循環バッファから切り出すべきセグメント（このタイムスタンプの事前定義秒数前と事後定義秒数後）を特定するために使用される。

このシステムを多様な設備と堅牢に統合するためには、「OPC UA for Machinery」17 のMachineryItemStateのような標準化された情報モデルに依存することが、純粋にベンダー固有のOPC-UAタグに依存するよりも望ましい。工場にはしばしば複数のベンダーの設備が存在する。各機械がその状態を示すために独自のOPC-UAタグを使用する場合、エッジゲートウェイのロジックは機械タイプごとにカスタムマッピングが必要となる。「OPC UA for Machinery」仕様はこれを調和させることを目的としている 17。MachineryItemState.CurrentStateのような標準ノードを対象とすることで、システムは準拠した機械とのプラグアンドプレイ性が高まり、設定作業が削減され、保守性が向上する。

OutOfService状態 18 は停止を示すが、本質的に*なぜ*停止したのかを説明するものではない。システム設計では、より詳細な障害情報が利用可能であれば（例：ベンダー固有のOPC-UAノードや、より具体的なコンパニオン仕様で定義されたOutOfServiceのサブ状態から 18）、それをどのように取得するかを考慮すべきである。このより豊富なデータが取得できれば、診断のための記録映像の価値が大幅に向上する。機械がOutOfServiceであることを知ることで映像がトリガーされる。しかし、OPC-UAサーバーが「E-123: 潤滑システム障害」のようなErrorCodeも提供する場合、このコードが映像と共にクラウドに送信されると、より迅速かつ正確な自動分類とその後の人間による分析が可能になる。映像は*結果*（機械停止）を示すかもしれないが、OPC-UAエラーコードは*報告された原因*を提供する。設計では、基本的な状態だけでなく、設定可能なOPC-UAノード監視を許容すべきである。

OPC-UAはポーリングまたはサブスクリプションによるデータ取得を許可している 15。サブスクリプションは、ネットワークトラフィックを削減し、より即時の通知を提供するため、イベント駆動型システムには一般的に効率的であり、これは正確なプレ/ポストロールでの映像クリッピングにとって重要である。ポーリングでは、エッジゲートウェイが機械の状態をOPC-UAサーバーに繰り返し問い合わせる必要がある。これは一定のネットワークトラフィックを生成し、状態変化の検出に遅延を生じさせる可能性がある。一方、サブスクリプションでは、状態が変化したときにサーバーがゲートウェイに即座に通知できる。正確な事前/事後記録を伴う映像クリッピングをトリガーする必要がある「設備停止」信号の場合、検出遅延を最小限に抑えることが重要である。したがって、OPC-UAサブスクリプションの使用が推奨される方法である。Azure IoT Operationsコネクタ 16 はサブスクリプションの作成に言及している。

### **C. 映像クリッピングとローカル管理**

**映像パイプライン管理のためのGStreamer活用:**

* GStreamerパイプラインは、記録およびクリッピングプロセスを処理するために動的に構築および変更できる。  
* OPC-UAトリガーが発生すると、GStreamerアプリケーションは以下を実行できる。  
  1. 循環バッファへの書き込みを担当するエレメントに信号を送り、プレロールデータをマークする。  
  2. ポストロールデータをキャプチャするために記録を継続する。  
  3. splitmuxsink（個別のファイルに保存する場合）のようなエレメント、またはappsink（バッファを取得するため）とfilesink（クリップを保存するため）を用いたカスタムロジックを使用して、関連するセグメントを抽出する。  
  * H.264バックログ記録のC言語サンプル（7、14。直接リンク86はアクセス不能だったが、それに関する議論は価値がある）は、要求に応じて記録を開始/停止でき、バックログが維持されるような機能を示唆している。

**イベントクリップと連続バッファの管理戦略:**

* **潜在的な問題**: 主要な循環バッファは上書きされるように設計されている。イベントクリップが生成され、保護なしにこの同じバッファスペースに保存されると、特にネットワークの問題やイベントのバーストが発生した場合、クラウドに正常にアップロードされる前に進行中の記録によって上書きされる可能性がある。  
* **戦略1：イベントクリップ用の個別ストレージ**:  
  * トリガー発生時、切り出された映像セグメントは、エッジゲートウェイのストレージの別の専用部分（例：異なるディレクトリやパーティション）に保存される。この領域は、メインバッファの循環上書きポリシーの対象とはならない。  
  * その後、キュー管理システムがこれらの保存されたクリップのクラウドへのアップロードを処理する。クリップは、アップロード成功の確認後にのみ、この専用ストレージから削除される。  
  * 87（エッジバッファリング）では、重要なアプリケーションの場合、エッジバッファにはフラッシュストレージバックアップや複数のストレージ層が含まれることが多く、これは重要なイベントデータを分離して保護するというこの概念と一致する。  
* **戦略2：優先度付き循環バッファと「保護された」セグメント（より複雑）**:  
  * 循環バッファロジックを強化して、イベントに対応するセグメントを「保護された」または「上書き禁止」としてマークすることができる。  
  * これには、上書き時にこれらの保護されたセグメントをスキップするための、より高度なバッファ管理が必要となり、多くのイベントが発生しアップロードが遅い場合には、バッファの断片化や有効な連続記録時間の短縮につながる可能性がある。  
* **戦略3：Scrypted NVRアプローチ** 20: 「すべてが連続記録として一度保存される。イベントとクリップは、単に連続記録内の時間期間である。」これはストレージ効率が非常に高いが、堅牢なインデックス作成と検索が必要となる。このプロジェクトでは、セグメントの*コピー*を抽出してクラウドに送信することが要件であるため、アップロード前にクリップの一時的なローカルコピーを作成することが依然として賢明である。  
* **推奨**: 戦略1（イベントクリップ用の個別ストレージ）は、クラウドアップロード前のイベントクリップの整合性を確保する上で、一般的に堅牢で実装が容易である。

揮発性の循環バッファから単にクリップを切り出すだけで、アップロード前に永続的で上書き不可能なローカルキューに保存しない場合、特にネットワークの不安定時やイベント頻度が高い場合にはデータ損失のリスクがある。主要な循環バッファの目的は、上書きを伴う連続記録である。クリップがこのバッファ内のポインタによって単に識別されるだけで、ネットワーク障害により即時アップロードが妨げられる場合、進行中の記録がその「イベント」データを上書きする可能性がある。87（エッジバッファリング）は、ネットワーク中断の処理を主要な機能として強調している。したがって、イベントクリップの物理的なコピーを、アップロードが試行される安全なローカルの場所に作成する必要がある。この「安全な場所」がステージングエリアとして機能する。

イベントクリップを個別に保存する場合、この専用ストレージも有限の容量を持つ。このイベントクリップストレージが満杯になった場合のポリシーが必要となる（例：新しいイベントの記録を停止する、最も古い*イベントクリップ*を上書きする、アラートを送信する）。これは、メインの循環バッファの上書きとは異なる。頻繁な設備停止や長時間のクラウド接続問題が発生するシナリオを想像してみてほしい。イベントクリップ用の専用ストレージが満杯になる可能性がある。システムは定義された動作を持つ必要がある。新しいイベントのキャプチャを停止する（重要なデータを失う可能性がある）か？最も古い*未送信のイベントクリップ*を上書きし始める（新しいイベントを優先する）か？それとも操作を停止してクリティカルアラートを送信するか？このポリシーは、ビジネスの優先順位に基づいて定義する必要がある。88では、ローカルストレージが有効な場合にゲートウェイのローカル保持時間を設定して映像を期限切れにすることに言及している。

### **D. エッジデバイスの信頼性と回復力**

**電源障害管理:**

* **無停電電源装置（UPS）**: エッジゲートウェイと接続カメラには不可欠 21。UPSは、ゲートウェイが以下の動作を行うのに十分なランタイムを提供する必要がある。  
  1. メモリ内のデータ（現在のビデオバッファセグメント、OPC-UA状態など）を保存する。  
  2. 現在のビデオファイル/セグメントの永続ストレージへの書き込みを完了する。  
  3. データ破損を防ぐために、オペレーティングシステムとアプリケーションの正常なシャットダウンを実行する。  
  * 21には、最大2時間の電力を供給するミニUPSが記載されており、これは良い参考となる。  
* **ソフトウェアの回復力**: アプリケーションは、予期せぬシャットダウンに対応し、再起動時に正常に回復するように設計する必要がある（例：不完全なファイルのチェック、保留中のアップロードの再開）。

**ストレージ満杯管理:**

* **循環バッファの上書き**: 前述の通り、メインのビデオバッファは最も古いデータに対して上書きポリシーを使用する 9。  
* **イベントクリップストレージ**: イベントクリップに個別のストレージを使用する場合（推奨）、これが満杯になったときのポリシーが必要となる（前述のローカルクリップストレージ管理を参照）。  
* **アラート**: 利用可能なストレージ（OS用、循環バッファ用、またはイベントクリップ用）がクリティカルな閾値（例：80%、90%満杯）に達した場合、システムはアラートを生成する必要がある（例：ローカルログ、中央監視システムへのネットワークメッセージ、またはインフラがサポートしていればOPC-UA信号経由）24。  
* **監視**: エッジゲートウェイのディスク容量、CPU、メモリ、ネットワークの継続的な監視が不可欠である 25。

**ネットワーク障害処理:**

* エッジゲートウェイは、クラウド接続が失われた場合でも、ビデオ記録とOPC-UA信号の検出を継続する必要がある。  
* イベントクリップはローカルにキューイングされ、接続が回復すると自動的にアップロードされるべきである 26。

UPSの容量は、デバイスを稼働させ続けるだけでなく、すべての重要なデータがディスクにフラッシュされ、システムがクリーンにシャットダウンするのに十分な時間を提供する必要がある。ゲートウェイ上のシャットダウンスクリプト/ロジックは、UPSのステータスを認識する必要がある。UPSはエッジデバイスを10分間稼働させることができるかもしれない。もし正常なシャットダウン手順（バッファの保存、ファイルのクローズ、ファイルシステムのマウント解除）に2分かかるなら、これは問題ない。しかし、10分後に突然電源が切れたときに重要な操作がまだ進行中であれば、データ破損が発生する可能性がある。UPSのランタイム 21 は、ソフトウェアが操作を完了する能力と一致している必要がある。

ストレージ容量の監視だけでなく、ストレージメディアの健全性（例：循環バッファ用のSSDの耐久性、イベントクリップストレージ用のHDDのSMARTステータス）も、障害を未然に防ぐために監視する必要がある。循環バッファへの継続的な書き込み、特にSSDでは、時間とともに摩耗を引き起こす可能性がある。ストレージメディアが故障すると、エッジ記録機能全体が失われる。監視ツール 25 は、理想的には容量だけでなく、ストレージの健全性メトリックも含むべきである。これにより、故障しつつあるストレージの予防的な交換が可能になる。

## **IV. クラウド層設計：ストレージとインテリジェント分析**

### **A. セキュアな映像アップロードとストレージ**

**エッジからクラウドへの通信プロトコルとセキュリティ:**

* プロトコル：HTTPS（REST APIアップロード用）またはセキュアMQTT（IoTプラットフォームを仲介として使用する場合）が標準的である。  
* 認証：エッジゲートウェイは、クラウドストレージサービスで認証するために、セキュアな認証情報（APIキー、トークン、証明書など）を必要とする。  
* 転送中の暗号化：アップロード中の映像データを暗号化するためにTLS/SSLを使用する必要がある 28。  
* データ整合性：アップロード後のデータ整合性を検証するために、チェックサム（MD5、SHA256など）のようなメカニズムを使用できる。  
* 28（FileCloud）は、転送中および保存時のデータ保護のためにAES-256暗号化によるセキュアなファイル転送を強調している。89は、VSaaSの場合、メタデータと関連クリップのみがアップロードされることを指摘しており、これは本システムのモデルと一致する。

**クラウドストレージプラットフォームの選定:**

* 主要基準：スケーラビリティ、耐久性、可用性、セキュリティ、コスト、AIサービスとの統合、ライフサイクル管理機能。  
* **表1：クラウドオブジェクトストレージサービスの比較**

| 特徴カテゴリ | 特定機能 | AWS S3 | Azure Blob Storage | Google Cloud Storage |
| :---- | :---- | :---- | :---- | :---- |
| **スケーラビリティ** | 最大単一オブジェクト/ファイルサイズ | 5 TB 29 | 約190.7 TiB (ブロックBLOB) 31 | 5 TB 33 |
|  | 総ストレージ容量 | 実質無制限 29 | ストレージアカウント容量に依存 (実質無制限) 31 | 実質無制限 33 |
| **耐久性** | 設計上のナイン数 (例: 99.999999999%) | 11ナイン (S3標準) 35 | 最大16ナイン (地理冗長) 34 | 高い耐久性 (詳細はストレージクラスによる) 37 |
|  | レプリケーションオプション | クロスリージョン、ゾーン 30 | LRS, ZRS, GRS, RA-GRS 34 | マルチリージョン、デュアルリージョン、リージョン 37 |
| **可用性 (SLA)** | 標準/ホットティアの標準SLA | 99.99% (S3標準) 30 | 99.9% (ホット LRS) から 34 | 99.95% (マルチリージョン/デュアルリージョン標準) から 37 |
| **セキュリティ** | 保存データの暗号化 (デフォルト、顧客管理キー) | デフォルトSSE-S3、SSE-KMS、SSE-C 30 | デフォルトで有効、顧客管理キー 34 | デフォルトで暗号化、顧客管理キー、顧客提供キー 37 |
|  | 転送中データの暗号化 (TLS/SSL) | デフォルトでHTTPS | デフォルトでHTTPS | デフォルトでHTTPS |
|  | アクセス制御 (IAM、ポリシー、ACL、署名付きURL) | IAM、バケットポリシー、ACL、署名付きURL 35 | Azure AD RBAC、SASトークン、アクセスキー 34 | IAM、バケット/オブジェクトACL、署名付きURL 42 |
| **ライフサイクル管理** | 自動階層化 | S3 Intelligent-Tiering、ライフサイクルルール 35 | ホット/クール/アーカイブティア、ライフサイクル管理 34 | Autoclass、ライフサイクルルール 37 |
|  | 有効期限ポリシー | 対応 45 | 対応 34 | 対応 37 |
| **映像AIサービスとの統合** | 各AIプラットフォームとのネイティブ統合 | Amazon Rekognition 35 | Azure Video Indexer, Azure AI Vision 44 | Google Cloud Video Intelligence API 48 |
| **価格モデル (概要)** | GBあたりのストレージコスト (各ティア) | 53参照 | 60参照 | 55参照 |
|  | データ転送コスト (イングレス/エグレス) | 53参照 | 60参照 | 55参照 |
|  | リクエストコスト (PUT, GET) | 53参照 | 60参照 | 55参照 |
| **無料ティア (映像関連)** | ストレージ量、転送制限、期間 | 5GB標準ストレージ (12ヶ月)、20,000 GET、2,000 PUT (12ヶ月)、100GBデータ転送アウト/月 35 | 5GB LRSホットブロック (12ヶ月)、20,000リード、10,000ライト (12ヶ月) 34 | 5GBリージョナルストレージ/月 (常時無料)、新規顧客$300クレジット 37 |

この比較表は、技術エンジニアが特定の要件（既存のクラウドインフラ、コスト感度、セキュリティコンプライアンス、AIツールとの統合容易性など）に基づいて情報に基づいた意思決定を行うことを可能にするため、非常に重要である。\[60\]、\[58\]、\[59\]のような資料は一般的な比較を提供するが、プラットフォーム固有の価格情報 \[53, 54, 55\] や機能ページ \[29, 30, 31, 32, 33, 35, 37, 42, 56\] から詳細なデータを一箇所にまとめることは非常に価値がある。

* **コスト最適化のためのストレージ階層化とライフサイクル管理:**  
  * ライフサイクルポリシーを実装して、定義された期間後に古いビデオクリップを低コストのストレージ階層（例：低頻度アクセス、アーカイブ）に自動的に移行する 35。  
  * コンプライアンスとビジネスニーズに基づいて、保持期間が終了したクリップを最終的に削除するためのポリシーを定義する。  
  * AWS S3ライフサイクル 43、Azure Blob Storageアクセス階層（ライフサイクル管理付きのホット、クール、アーカイブ）34、およびGoogle Cloud Storageオブジェクトライフサイクル管理 37 はすべてこれらの機能をサポートしている。

クラウドストレージプロバイダーの選択は、単にGBあたりのコストだけでなく、AIサービスとの統合、既存の企業契約、セキュリティ機能、地域的な可用性など、エコシステム全体に関わる戦略的な決定である 57。例えば、工場が既にERPシステムにAzureを使用している場合、Azure Blob Storageを選択すると、ID管理（Azure AD）、請求、ネットワーク統合が簡素化される可能性がある。逆に、データサイエンスチームがGoogleのAIツールに精通している場合は、GCSが優先されるかもしれない。「最良」の選択は状況に依存する。

ストレージコストがしばしば強調される一方で、データ転送コスト（特に映像の表示や他所への移動のためのエグレス）は、総所有コストに大きな影響を与える可能性がある 60。これは、予想される映像アクセスパターンに基づいて慎重に見積もる必要がある。多くのユーザーがこれらのイベントクリップをクラウドから頻繁にダウンロードまたはストリーミングする場合、アウトバウンドデータ転送料金が蓄積される可能性がある。57（S3用CloudFront）や44（Azure CDN）で提案されているようにCDN（コンテンツ配信ネットワーク）を使用すると、頻繁にアクセスされるコンテンツをユーザーの近くにキャッシュすることでこれを軽減できるが、CDNには独自のコストがかかる。ライフサイクル管理では、よりコールドなティアからの検索コストも考慮に入れる必要がある 53。

デフォルトのセキュリティは良好だが、機密性の高い工場映像を保護するためには、きめ細かいアクセス制御（IAM、ポリシー、一時的なアクセス用の署名付きURL）と暗号化キー管理オプションの理解が不可欠である 34。単に映像をアップロードするだけでは不十分である。誰がこれらの映像を閲覧できるのか？アクセスはどのように記録されるのか？コンプライアンスのために顧客管理の暗号化キーが必要か？これらの問いに対処する必要がある。例えば、署名付きURL（S3では35で言及、一般的な概念）は、広範なバケット権限を公開することなく、特定の映像クリップへの一時的で限定的なアクセスを許可するのに優れている。

### **B. 映像分析と自動分類**

**クラウドベース映像AIサービス:**

* **表2：クラウド映像AIサービスの比較**

| 特徴カテゴリ | 特定機能 | Amazon Rekognition | Azure Video Indexer / AI Vision | Google Cloud Video Intelligence |
| :---- | :---- | :---- | :---- | :---- |
| **コア分析** | 物体検出 (一般) | 対応 (車両、ペット、パッケージ等) 62 | 対応 (Video Indexer, Vision) 63 | 対応 (20,000以上のオブジェクト) 48 |
|  | シーン検出 | 対応 (都市、ビーチ、工場等) 62 | 対応 (Video Indexer) 63 | 対応 (場所) 48 |
|  | アクティビティ検出 | 対応 (荷物配達、ダンス等) 62 | 対応 (Video Indexer) 63 | 対応 (アクション) 48 |
|  | テキスト検出 (映像内OCR) | 対応 62 | 対応 (Video Indexer) 63 | 対応 48 |
|  | 人物検出/追跡 | 対応 (顔検出、人物追跡) 62 | 対応 (顔検出、観測された人物の追跡) 63 | 対応 (人物検出、顔検出) 48 |
| **カスタムモデルトレーニング (AutoML)** | 使いやすさ (UI, API) | Rekognition Custom Labels (コンソール、API) 66 | Video Indexer BYOモデル (外部連携)、Azure ML 63 | AutoML Video Intelligence (Vertex AI GUI, API) 48 |
|  | データ要件 (量、ラベリング) | 数百画像/クリップから 66 | 外部モデル依存、キーフレームベース 68 | 1ラベルあたり約1000ビデオ推奨 (最小10-50) 72 |
|  | 対応カスタムタスク (分類、物体検出) | 画像分類、物体検出 67 | 外部モデルに依存 68 | ビデオ分類、オブジェクトトラッキング 48 |
| **産業ユースケース適合性** | 事例/ケーススタディ | 太陽光パネル損傷検出、回路基板欠陥検出 67 | 一般的なAIサービスとしての活用事例あり 63 | 製造業における欠陥検出 (GFT連携) 77 |
|  | カスタムモデルによる特定異常/障害検出能力 | 高い (Custom Labels) 66 | 可能 (BYOモデル) 68 | 高い (AutoML Video) 48 |
| **出力と統合** | メタデータ形式、信頼度スコア、タイムスタンプ | JSON、信頼度スコア、タイムスタンプ 62 | JSON、カスタマイズ可能スキーマ 68 | JSON、ラベル、セグメント情報 69 |
|  | APIアクセス、SDK | 対応 66 | REST API 68 | REST, RPC API, クライアントライブラリ 48 |
| **価格モデル (概要)** | 映像処理時間、APIコール毎等 | 処理時間、カスタムラベルのトレーニングと推論 | 分析ユニット、インデックス作成時間 | 分単位、特徴量単位 |

この表は、エンジニアが最も適切なAIサービスを選択するのに役立つ。3大クラウドプロバイダーはすべて強力なビデオAIを提供しているが、それぞれの強み、カスタムモデルトレーニングの容易さ、価格モデルは異なる場合がある。例えば、あるプロバイダーは産業用オブジェクトに関連する事前トレーニング済みラベルをより多く持っているかもしれないし、別のプロバイダーはMLの専門知識が限られているユーザー向けにカスタムモデルトレーニングのためのよりシンプルなUIを提供しているかもしれない。\[62\]、\[78\]、\[69\]はこの比較の良い出発点となる。

**工場特有のニーズに対応するカスタム分類モデルのトレーニング:**

* **目標**: 工場特有のイベント（異なる種類の設備故障、標準的なOPC-UAではカバーされない特定の運用状態、安全違反など）に基づいてビデオを分類する。  
* **プロセス概要**:  
  1. **データ収集**: 分類対象のイベント/状態の代表的なビデオクリップ（またはクリップからのフレーム）を収集する。これらのクリップは、理想的にはエッジシステムによってキャプチャされたものであるべきである。  
  2. **データラベリング**: これらのクリップ/フレームに正しい分類（例：「コンベアベルト詰まり」、「ロボットアーム衝突」、「通常停止サイクル終了」）を手動でラベル付けする。  
     * Amazon Rekognition Custom Labelsでは、コンソール内で直接ラベリングするか、SageMaker Ground Truthを使用できる 66。  
     * Azure Video IndexerのBYOモデルアプローチは外部モデルトレーニングを意味するため、ラベリングは選択したトレーニング環境で行われる 68。  
     * Google Cloud AutoML Video Intelligence (Vertex AI) はトレーニング用のグラフィカルインターフェースを提供しており、ラベリングも可能か、ラベル付きの特定の形式のデータを要求する 48。  
  3. **モデルトレーニング**: クラウドプロバイダーのAutoMLツール（Rekognition Custom Labels、Vertex AI AutoML Video、またはAzure MLのカスタムトレーニングパイプライン）を使用して、ラベル付けされたデータで分類モデルをトレーニングする。  
     * これらのツールは、アルゴリズム選択やハイパーパラメータ調整など、MLプロセスの多くを自動化する 66。  
  4. **モデル評価**: テストデータセットで、精度、再現率、F1スコアなどのメトリックを使用してモデルのパフォーマンスを評価する 66。  
  5. **デプロイと統合**: トレーニングされたカスタムモデルをデプロイし、API経由で呼び出してエッジからアップロードされた新しいビデオを分類できるようにする。  
* **データ要件**:  
  * 量：AutoMLツールは従来のMLよりも少ない画像/クリップで動作することを目指しているが、クラスごとに数百の例が良い出発点となることが多い 66。ビデオ分類の場合、Vertex AIはラベルごとに約1,000本のビデオを推奨し、最小は10～50本である 73。  
  * 品質と多様性：トレーニングデータは、実際の工場の状態（照明、角度、障害の外観のバリエーション）を代表するものであるべきである 73。  
  * データ拡張：トレーニングデータセットの有効サイズを増やし、モデルの堅牢性を向上させるために、技術を使用できる 75。  
* **精度に関する考慮事項**:  
  * 精度は、トレーニングデータの品質と量、および各クラスの視覚的特徴の明確さに大きく依存する。  
  * 新しいデータ（特に誤分類されたインスタンス）による継続的な監視と再トレーニングは、時間の経過とともに精度を維持および向上させるために不可欠である 66。  
  * 産業事例：Rekognition Custom Labelsによる太陽光パネルの損傷検出 71、回路基板の欠陥検出 75。GFTとGoogle Cloudによる製造業の欠陥検出 77。

汎用的な物体/活動検出は有用だが、このシステムの真の価値は、事前学習済みモデルでは理解できない工場固有のイベント、障害タイプ、またはプロセス異常を認識するためにカスタムモデルをトレーニングすることから生まれる 48。標準的なAIモデルは「機械」と「人物」を検出するかもしれない。しかし、工場のデータでトレーニングされたカスタムモデルは、「供給ミスによる機械Xの詰まり」や「作業員の安全ゾーン違反」を分類できる可能性がある。このレベルの特異性が、「優秀なエンジニア」であるユーザーが実用的な洞察のために求めるものであろう。この成功は、カスタムトレーニングプロセスにかかっている。

カスタムAIモデルのデプロイは一度きりのタスクではない。新しい障害タイプが出現したり、生産環境が変化したりすると、モデルは精度と関連性を維持するために新しいデータで再トレーニングする必要がある 66。工場環境は動的である。新しい設備が導入されたり、プロセスが変更されたり、これまで見られなかった故障モードが発生したりする可能性がある。過去のデータでトレーニングされたAIモデルは、これらの新しいシナリオでは性能が低下する可能性がある。したがって、新しい（特に誤分類された）ビデオにラベルを付け、モデルの再トレーニングとバージョン管理に使用するフィードバックループが、長期的なシステムの有効性にとって不可欠である。これはMLOpsプラクティスの必要性を示唆している。

AutoMLツール 66 は参入障壁を大幅に下げるが、データ準備、ラベリングのベストプラクティス、モデル評価メトリックの解釈方法を理解することは、特に専門的な産業分野での成功には依然として不可欠である。AutoMLはアルゴリズムの選択と調整を自動化する。しかし、「ゴミを入力すればゴミが出力される」という原則は依然として当てはまる。トレーニングデータのラベル付けが不十分であったり、量が不足していたり、実際のシナリオを代表していなかったりすると、AutoMLモデルの性能は低下する。工場のエンジニアは、質の高いデータがシステムに供給されるようにする必要がある。79と73は、Vertex AIのデータ準備に関する詳細なガイドラインを提供し、データの品質と代表性を強調している。

## **V. エンドツーエンドのセキュリティに関する考慮事項**

### **A. OPC-UAセキュリティ**

* OPC-UAのセキュリティ機能（クライアント・サーバー接続のための認証情報、暗号化されたメッセージセキュリティモード）を設備とエッジゲートウェイ間で活用する 15。  
* OPC-UAサーバーおよびクライアントコンポーネントがセキュリティパッチで最新の状態に保たれていることを確認する 81。

### **B. エッジゲートウェイの堅牢化**

* エッジゲートウェイのオペレーティングシステムを保護する（例：最小限のインストール、定期的なパッチ適用、ファイアウォール）。  
* エッジゲートウェイのファイルシステムを暗号化する。特に機密データや認証情報を保存している場合は重要である 81。  
* エッジコンソールアプリケーションおよび管理インターフェースへのアクセスを、強力なパスワードとロールベースのアクセス制御で保護する 81。  
* AWS IoT Greengrassを使用している場合、ゲートウェイにHSM（ハードウェアセキュリティモジュール）があれば、そのハードウェアセキュリティ統合機能を活用する 81。

### **C. 安全なデータ転送（エッジからクラウドへ）**

* ビデオクリップのアップロードには、HTTPSやMQTTSなどの安全なプロトコルを使用する 28。  
* 転送中のすべてのデータに対してTLS/SSL暗号化が強制されるようにする。  
* 安全な方法（デバイス証明書、エッジデバイス用IAMロール、権限を制限したAPIキーなど）を使用して、エッジゲートウェイをクラウドサービスに認証する。

### **D. クラウドストレージセキュリティ**

* 保存データの暗号化：クラウドストレージ内のビデオデータが暗号化されていることを確認する（ほとんどのサービスでデフォルトだが確認が必要）。顧客管理の暗号化キー（CMEK）またはプロバイダー管理のキーのオプションがある 34。  
* アクセス制御：IAMロール、バケット/コンテナポリシー、ACLを使用して、保存されたビデオおよび分類結果に誰/何がアクセスできるかを制御し、最小権限の原則を実装する 34。  
* 特定のユーザーまたはアプリケーションにビデオクリップへの一時的で限定的なアクセスを許可するために、署名付きURLまたはSASトークンの使用を検討する。

### **E. 映像AIサービスセキュリティ**

* 映像分析サービスへのAPI呼び出しを保護する。  
* カスタムトレーニングされたモデルとその結果へのアクセスを管理する。

### **F. 全体的な監視と監査**

* エッジ、転送中、およびクラウドでのセキュリティイベントのロギングと監視を実装する 25。  
* アクセスログと監査証跡を定期的にレビューする。

セキュリティは、工場フロアのOPC-UA通信からクラウドAIモデルに至るまで、アーキテクチャのあらゆる層に設計段階から組み込まれなければならない、全体的な懸念事項である。ある領域の脆弱性がシステム全体を危険にさらす可能性がある 81。クラウドセキュリティのみに焦点を当て、エッジゲートウェイの堅牢化を怠ったり、暗号化されていないOPC-UA通信を使用したりすると、重大な攻撃対象領域が残る。例えば、エッジゲートウェイを侵害した攻撃者は、アップロード前にビデオデータを改ざんしたり、悪意のあるデータを注入したりする可能性がある。SiteWise Edgeに関する81のベストプラクティスで概説されているような、全体的な視点が不可欠である。

分散システムにおける認証情報の管理は、主要な課題の一つである。潜在的に多数のエッジデバイスにわたる認証情報（OPC-UA用、エッジゲートウェイアクセス用、クラウドサービス認証用）を安全に管理し、ローテーションすることは、重要かつ複雑である。各エッジゲートウェイは、OPC-UAサーバーとクラウドに認証する必要がある。これらの認証情報をエッジデバイス上に安全に保存し（81はファイルシステム上のシークレットに言及し、ディスク暗号化を推奨している）、それらをローテーションする戦略（デバイスが侵害された場合やセキュリティポリシーに従う場合など）を持つことが不可欠である。AWS IoT GreengrassやAzure IoT Edgeのようなソリューションは、しばしば安全なシークレット管理のメカニズムを提供する。

## **VI. スケーラビリティ、保守性、および将来の拡張**

### **A. スケーラビリティ**

* エッジ：カメラの追加やビデオ解像度の向上に伴うエッジゲートウェイの処理能力を考慮する。モジュラー型のエッジハードウェアによりアップグレードが可能。  
* ネットワーク：カメラからゲートウェイへの工場内ネットワーク帯域幅、およびゲートウェイからクラウドへのアップリンク帯域幅。  
* クラウド：クラウドストレージサービスは本質的にスケーラブルである 34。AIサービスもスケーラブルだが、使用量に応じてコストが増加する。

### **B. 保守性**

* エッジソフトウェアアップデート：エッジゲートウェイ上のOS、GStreamer、OPC-UAクライアント、その他のアプリケーションを安全に更新するためのメカニズム（潜在的にはIoTデバイス管理プラットフォームを使用）。  
* OPC-UA設定：新しい設備の追加や監視対象OPC-UAノードの変更の容易さ。  
* AIモデル再トレーニング：新しいデータでカスタムAIモデルを再トレーニングし、デプロイするためのプロセス（MLOps）。  
* 監視とアラート：システムヘルス（エッジおよびクラウド）の包括的な監視と問題発生時のアラート 25。

### **C. 将来の拡張**

* 高度なエッジAI：クラウドアップロード前のリアルタイム異常検出やフィルタリングのために、より高度なAIをエッジに実装する。  
* 他の工場システムとの統合：AIから得られた洞察（障害分類など）をMES、ERP、または予知保全システムに送信する。  
* リアルタイムアラート：重要なイベントのAI分類に基づいてオペレーターにリアルタイムアラートを送信するメカニズムを開発する。  
* クローズドループ制御（高度）：AIの洞察に基づいてOPC-UA書き込み機能を使用して設備にコマンドを送信する（細心の注意と安全性の考慮が必要）。

カスタムAIモデルは継続的なメンテナンスが必要であり、MLOps（Machine Learning Operations）プラクティスを採用してこれらのモデルのライフサイクル（データバージョニング、モデルバージョニング、自動再トレーニングパイプライン、モデルドリフト監視）を管理することが、スケーラブルで保守可能なソリューションにとって不可欠である。新しいデータが入ってくるたびに手動でモデルを再トレーニングするのはスケーラブルではない。クラウドプラットフォーム自体が提供するMLOpsツールとプラクティス（例：SageMaker MLOps、Vertex AI Pipelines、Azure Machine Learning MLOps）は、このプロセスを自動化および合理化し、過度な手動介入なしにモデルが正確かつ関連性を保つことを保証するのに役立つ。

エッジゲートウェイの数が増えるにつれて、それらのソフトウェア、設定、および健全性を管理するための中央集権的なシステムが重要になる。1つまたは2つのエッジゲートウェイのソフトウェア更新、新しいOPC-UA設定のプッシュ、または健全性の監視は手動で行えるかもしれない。しかし、数十または数百のそのようなデバイスがある大規模な工場では、これは管理不能になる。IoTデバイス管理プラットフォーム（AWS IoT Device Management、Azure IoT Hubなど）は、安全なリモート管理、ソフトウェアデプロイ、および大規模な監視機能を提供する 25。

## **VII. 高レベルのコストに関する考慮事項**

### **A. エッジ層コスト**

* ハードウェア：エッジゲートウェイ、カメラ、UPSユニット。  
* ソフトウェア：商用ソフトウェアコンポーネントのライセンスコスト（ただし、GStreamerのようなオープンソースも選択肢）。

### **B. クラウド層コスト**

* ストレージ：保存されるビデオの量と使用されるストレージ階層に基づく 53。  
* データ転送：  
  * イングレス（エッジからクラウドへ）：多くの場合無料または低コスト 61。  
  * エグレス（クラウドからユーザーへの表示/ダウンロード用）：使用状況に応じて大幅に変動する可能性あり 60。  
* 映像AIサービス：通常、処理されるビデオの分/時間あたり、またはAPIコールごとに価格設定される（特定のサービス価格を参照）。カスタムモデルのトレーニングにもコストがかかる場合がある。  
* その他のクラウドサービス：データ処理用のコンピューティング、メタデータ用のデータベース、デバイス管理用のIoTハブなど。

### **C. 運用コスト**

* ネットワーク帯域幅（工場インターネットアップリンク）。  
* メンテナンスとサポート。  
* データのラベリングとAIモデルの再トレーニングのための人員（大規模な場合）。

ストレージライフサイクルポリシーを積極的に使用してデータをより安価な階層に移動し、AI分析を最適化する（関連するビデオセグメントのみを分析する、効率的なモデルを選択するなど）ことが、継続的なクラウドコストを管理する鍵となる。すべてのビデオを最も高価な「ホット」ティアに無期限に保存すると、非常にコストがかかる。ライフサイクルポリシー 43 は不可欠である。同様に、アップロードされたすべてのビデオの毎秒に対して複雑なAI分析を実行することは、過剰であり高価になる可能性がある。OPC-UA信号や予備的なエッジAIがクリップの「興味深い」部分を絞り込むことができれば、AI処理コストを削減できる。

クラウドプロバイダーはストレージやAIサービスに対して無料ティアを提供しているが 34、これらは通常限定的であり、このシステムの本格的な本番展開には不十分である。初期開発やテストには有用である。例えば、S3の5GBストレージ 49 はビデオですぐに消費されるだろう。数百分の無料ビデオAI処理では、継続的な工場監視をカバーできない。エンジニアは、プロバイダーの標準価格設定 53 に基づいて本番レベルの使用量を予算化する必要がある。

## **VIII. 推奨事項と結論**

本報告書で提示したシステム概要設計は、工場における設備停止時の状況把握と原因究明を高度化するための強固な基盤を提供する。OPC-UAによるトリガー、エッジでのインテリジェントなビデオクリッピング、クラウドでのセキュアな保管とAI分析という一連の流れは、現代の製造業におけるデータ駆動型の意思決定を支援する上で有効である。

具体的な推奨事項として、以下の段階的アプローチを提案する。

1. **パイロット導入**: まず、少数のカメラと特定の設備タイプを対象にパイロットプロジェクトを開始する。これにより、実際の工場環境における課題を早期に特定し、設計の妥当性を検証する。  
2. **OPC-UA連携とビデオ処理の確立**: OPC-UAサーバーとの確実な連携、およびエッジゲートウェイにおける正確なビデオクリッピングと信頼性の高いクラウドアップロード機能の確立に注力する。特に、「OPC UA for Machinery」の「Machine Status」モデル 17 の活用を検討し、標準化された方法で設備状態を取得することを目指す。  
3. **クラウドAIサービスの試用**: 選定したクラウドAIサービス（Amazon Rekognition 62、Azure Video Indexer 78、Google Cloud Video Intelligence 65 など）の事前学習済みモデルを使用し、基本的な分類機能を評価する。  
4. **カスタムAIモデルの段階的開発**: 収集されたデータに基づき、工場固有の事象（特定の故障モード、安全違反など）を認識するためのカスタムAIモデルを段階的に開発・改良する。これには、適切なデータラベリングとAutoMLツールの活用 48、そして継続的なモデル評価と再トレーニングのプロセス（MLOps）の確立が含まれる。

AIモデルの開発と維持は長期的な取り組みとなることを認識する必要がある。初期のモデルは完璧ではないかもしれないが、収集されるデータが増え、運用経験が蓄積されるにつれて、その精度と有用性は向上していく。

結論として、本提案システムは、工場の運用効率と安全性の向上に大きく貢献する可能性を秘めている。各技術要素の慎重な選定と段階的な導入、そして継続的な改善を通じて、その価値を最大限に引き出すことができるであろう。セキュリティは設計の初期段階から組み込み、エッジデバイスの信頼性確保（UPS、ストレージ管理など）も怠ってはならない。これらの要素を総合的に考慮することで、ユーザーである「優秀なエンジニア」の期待に応えるシステムが実現できると確信する。

#### **引用文献**

1. Taking Your First Picture with CSI or USB Camera \- NVIDIA Developer, 5月 16, 2025にアクセス、 [https://developer.nvidia.com/embedded/learn/tutorials/first-picture-csi-usb-camera](https://developer.nvidia.com/embedded/learn/tutorials/first-picture-csi-usb-camera)  
2. JCB005 External Triggering \- Connect Tech, 5月 16, 2025にアクセス、 [https://support.connecttech.com/hc/en-us/articles/24938216526875-JCB005-External-Triggering](https://support.connecttech.com/hc/en-us/articles/24938216526875-JCB005-External-Triggering)  
3. Examples | Coral, 5月 16, 2025にアクセス、 [https://coral.ai/examples/](https://coral.ai/examples/)  
4. Introducing Google Coral Edge TPU \- a New Machine Learning ASIC from Google, 5月 16, 2025にアクセス、 [https://nordcloud.com/blog/introducing-google-coral-edge-tpu-a-new-machine-learning-asic-from-google/](https://nordcloud.com/blog/introducing-google-coral-edge-tpu-a-new-machine-learning-asic-from-google/)  
5. Edge Video Analytics Microservice \- Edge Software Catalog \- Intel, 5月 16, 2025にアクセス、 [https://edgesoftwarecatalog.intel.com/details/?microserviceType=recipeµserviceNameForUrl=edge-video-analytics-microservice](https://edgesoftwarecatalog.intel.com/details/?microserviceType=recipe&microserviceNameForUrl=edge-video-analytics-microservice)  
6. Qualcomm IM SDK GStreamer \- Edge Impulse Documentation, 5月 16, 2025にアクセス、 [https://docs.edgeimpulse.com/docs/run-inference/qualcomm-im-sdk-gstreamer-pipeline](https://docs.edgeimpulse.com/docs/run-inference/qualcomm-im-sdk-gstreamer-pipeline)  
7. Prerecording Data using Gstreamer / Circular Buffer in Gstreamer \- General Discussion, 5月 16, 2025にアクセス、 [https://discourse.gstreamer.org/t/prerecording-data-using-gstreamer-circular-buffer-in-gstreamer/949](https://discourse.gstreamer.org/t/prerecording-data-using-gstreamer-circular-buffer-in-gstreamer/949)  
8. GStreamer Pipeline Samples \- GitHub Gist, 5月 16, 2025にアクセス、 [https://gist.github.com/hum4n0id/cda96fb07a34300cdb2c0e314c14df0a](https://gist.github.com/hum4n0id/cda96fb07a34300cdb2c0e314c14df0a)  
9. Circular Buffer: Circular Buffer Explained: The FIFO Approach in ..., 5月 16, 2025にアクセス、 [https://www.fastercapital.com/content/Circular-Buffer--Circular-Buffer-Explained--The-FIFO-Approach-in-Data-Storage.html](https://www.fastercapital.com/content/Circular-Buffer--Circular-Buffer-Explained--The-FIFO-Approach-in-Data-Storage.html)  
10. US7088387B1 \- Video recording device responsive to triggering ..., 5月 16, 2025にアクセス、 [https://patents.google.com/patent/US7088387B1/en](https://patents.google.com/patent/US7088387B1/en)  
11. Why use the circular buffer in "overriding" mode at all? \- Stack Overflow, 5月 16, 2025にアクセス、 [https://stackoverflow.com/questions/74841307/why-use-the-circular-buffer-in-overriding-mode-at-all](https://stackoverflow.com/questions/74841307/why-use-the-circular-buffer-in-overriding-mode-at-all)  
12. H.264 vs. H.265: What's the Difference? \- Reolink, 5月 16, 2025にアクセス、 [https://reolink.com/blog/h264-vs-h265/](https://reolink.com/blog/h264-vs-h265/)  
13. What is the difference between H.264 and H.265? \- Support : Hikvision Portal, 5月 16, 2025にアクセス、 [https://supportusa.hikvision.com/support/solutions/articles/17000129027-what-is-the-difference-between-h-264-and-h-265-](https://supportusa.hikvision.com/support/solutions/articles/17000129027-what-is-the-difference-between-h-264-and-h-265-)  
14. How to reliably start/stop saving an H.264 stream to a file \- GStreamer Discourse, 5月 16, 2025にアクセス、 [https://discourse.gstreamer.org/t/how-to-reliably-start-stop-saving-an-h-264-stream-to-a-file/951](https://discourse.gstreamer.org/t/how-to-reliably-start-stop-saving-an-h-264-stream-to-a-file/951)  
15. Edge Gateway Service OPC UA Adapter | SAP Help Portal, 5月 16, 2025にアクセス、 [https://help.sap.com/docs/SAP\_IoT/70108a557bb24b5da8e0ac9cfb344067/a1e410c3f8e04743b52c12e2ddd91624.html](https://help.sap.com/docs/SAP_IoT/70108a557bb24b5da8e0ac9cfb344067/a1e410c3f8e04743b52c12e2ddd91624.html)  
16. Connect industrial assets using the connector for OPC UA \- Azure ..., 5月 16, 2025にアクセス、 [https://learn.microsoft.com/en-us/azure/iot-operations/discover-manage-assets/overview-opcua-broker](https://learn.microsoft.com/en-us/azure/iot-operations/discover-manage-assets/overview-opcua-broker)  
17. OPC UA for Machinery, 5月 16, 2025にアクセス、 [https://opcfoundation.org/markets-collaboration/opc-ua-for-machinery/](https://opcfoundation.org/markets-collaboration/opc-ua-for-machinery/)  
18. Machinery Basic Building Blocks \- 12 MachineryItemState, 5月 16, 2025にアクセス、 [https://reference.opcfoundation.org/Machinery/v104/docs/12](https://reference.opcfoundation.org/Machinery/v104/docs/12)  
19. UA Companion Specifications \- OPC Foundation, 5月 16, 2025にアクセス、 [https://opcfoundation.org/about/opc-technologies/opc-ua/ua-companion-specifications/](https://opcfoundation.org/about/opc-technologies/opc-ua/ua-companion-specifications/)  
20. Two questions about Scrypted NVR and storage locations / speed \- Reddit, 5月 16, 2025にアクセス、 [https://www.reddit.com/r/Scrypted/comments/18a3764/two\_questions\_about\_scrypted\_nvr\_and\_storage/](https://www.reddit.com/r/Scrypted/comments/18a3764/two_questions_about_scrypted_nvr_and_storage/)  
21. PoE backup UPS for RAK Edge Gateway with PoE output \- RAKwireless Store, 5月 16, 2025にアクセス、 [https://store.rakwireless.com/products/poe-backup-ups-for-rak-edge-gateway-with-poe-output](https://store.rakwireless.com/products/poe-backup-ups-for-rak-edge-gateway-with-poe-output)  
22. How do you determine empty or full condition in circular buffer : r/C\_Programming \- Reddit, 5月 16, 2025にアクセス、 [https://www.reddit.com/r/C\_Programming/comments/1blno94/how\_do\_you\_determine\_empty\_or\_full\_condition\_in/](https://www.reddit.com/r/C_Programming/comments/1blno94/how_do_you_determine_empty_or_full_condition_in/)  
23. circular buffer \- How to safely overwrite data in a full circular\_buffer in C++ \- Stack Overflow, 5月 16, 2025にアクセス、 [https://stackoverflow.com/questions/76852627/how-to-safely-overwrite-data-in-a-full-circular-buffer-in-c](https://stackoverflow.com/questions/76852627/how-to-safely-overwrite-data-in-a-full-circular-buffer-in-c)  
24. How to Configure Policy Manager and alert delivery settings in Secure Connect Gateway Virtual Edition \- Dell, 5月 16, 2025にアクセス、 [https://www.dell.com/support/contents/en-pa/videos/videoplayer/how-to-configure-policy-manager-and-alert-delivery-settings-in-secure-connect-gateway-virtual-edition/6281590388001](https://www.dell.com/support/contents/en-pa/videos/videoplayer/how-to-configure-policy-manager-and-alert-delivery-settings-in-secure-connect-gateway-virtual-edition/6281590388001)  
25. Best Practices for IoT Gateway Monitoring: Tools, Tips, and Top Solutions, 5月 16, 2025にアクセス、 [https://network-king.net/best-practices-for-iot-gateway-monitoring-tools-tips-and-top-solutions/](https://network-king.net/best-practices-for-iot-gateway-monitoring-tools-tips-and-top-solutions/)  
26. Benefits of using Edge Storage \- Whitepapers | Milestone Documentation 2024 R2, 5月 16, 2025にアクセス、 [https://doc.milestonesys.com/latest/en-US/wp\_edge\_storage/benefits\_of\_using\_edge\_storage.htm](https://doc.milestonesys.com/latest/en-US/wp_edge_storage/benefits_of_using_edge_storage.htm)  
27. Edge Storage used as failover recording \- Whitepapers | Milestone Documentation 2024 R2, 5月 16, 2025にアクセス、 [https://doc.milestonesys.com/latest/en-US/wp\_edge\_storage/edge\_storage\_used\_as\_failover.htm](https://doc.milestonesys.com/latest/en-US/wp_edge_storage/edge_storage_used_as_failover.htm)  
28. Edge to Cloud File Sharing – Secure, No Latency File Transfer \- FileCloud, 5月 16, 2025にアクセス、 [https://www.filecloud.com/edge-to-cloud-file-sharing/](https://www.filecloud.com/edge-to-cloud-file-sharing/)  
29. Amazon S3 FAQs \- Cloud Object Storage \- AWS, 5月 16, 2025にアクセス、 [https://aws.amazon.com/s3/faqs/](https://aws.amazon.com/s3/faqs/)  
30. S3 Storage: How It Works, Use Cases and Tutorial \- Cloudian, 5月 16, 2025にアクセス、 [https://cloudian.com/blog/s3-storage-behind-the-scenes/](https://cloudian.com/blog/s3-storage-behind-the-scenes/)  
31. Scalability and performance targets for Blob storage \- Learn Microsoft, 5月 16, 2025にアクセス、 [https://learn.microsoft.com/en-us/azure/storage/blobs/scalability-targets](https://learn.microsoft.com/en-us/azure/storage/blobs/scalability-targets)  
32. Azure Blob Storage cluster size \- Microsoft Q\&A, 5月 16, 2025にアクセス、 [https://learn.microsoft.com/en-us/answers/questions/350928/azure-blob-storage-cluster-size](https://learn.microsoft.com/en-us/answers/questions/350928/azure-blob-storage-cluster-size)  
33. Any total limit on how much data I can have in a single Google cloud storage, 5月 16, 2025にアクセス、 [https://www.googlecloudcommunity.com/gc/Community-Hub/Any-total-limit-on-how-much-data-I-can-have-in-a-single-Google/m-p/871619/highlight/true](https://www.googlecloudcommunity.com/gc/Community-Hub/Any-total-limit-on-how-much-data-I-can-have-in-a-single-Google/m-p/871619/highlight/true)  
34. Azure Blob Storage | Microsoft Azure, 5月 16, 2025にアクセス、 [https://azure.microsoft.com/en-ca/products/storage/blobs](https://azure.microsoft.com/en-ca/products/storage/blobs)  
35. Amazon S3 \- Cloud Object Storage \- AWS, 5月 16, 2025にアクセス、 [https://aws.amazon.com/s3/](https://aws.amazon.com/s3/)  
36. Amazon S3: Data Durability and Global Resiliency \- YouTube, 5月 16, 2025にアクセス、 [https://www.youtube.com/watch?v=9vhEqjR2zsc](https://www.youtube.com/watch?v=9vhEqjR2zsc)  
37. Cloud Storage | Google Cloud, 5月 16, 2025にアクセス、 [https://cloud.google.com/storage](https://cloud.google.com/storage)  
38. AZ-900 Episode 38 | SLA and Composite SLA in Azure \- YouTube, 5月 16, 2025にアクセス、 [https://m.youtube.com/watch?v=WuzpcMZ1UxI\&pp=ygUII3NsYXF1YWw%3D](https://m.youtube.com/watch?v=WuzpcMZ1UxI&pp=ygUII3NsYXF1YWw%3D)  
39. Amazon S3: Data Encryption Options \- YouTube, 5月 16, 2025にアクセス、 [https://www.youtube.com/watch?v=U1USUvvhuCY](https://www.youtube.com/watch?v=U1USUvvhuCY)  
40. Microsoft Azure Security Technologies: Azure Storage Security \- Azure 2025 \- INTERMEDIATE \- Skillsoft, 5月 16, 2025にアクセス、 [https://www.skillsoft.com/course/microsoft-azure-security-technologies-azure-storage-security-7d1293b0-5359-4c69-b612-0f1895aadfa8](https://www.skillsoft.com/course/microsoft-azure-security-technologies-azure-storage-security-7d1293b0-5359-4c69-b612-0f1895aadfa8)  
41. Google Cloud Encryption at Rest \- YouTube, 5月 16, 2025にアクセス、 [https://www.youtube.com/watch?v=Svz2KHE1mdM](https://www.youtube.com/watch?v=Svz2KHE1mdM)  
42. Cloud Storage | Google Cloud, 5月 16, 2025にアクセス、 [https://cloud.google.com/storage/](https://cloud.google.com/storage/)  
43. AWS Pi Day 2023: AWS On Air ft. Amazon S3 Data Lifecycle Management \- YouTube, 5月 16, 2025にアクセス、 [https://www.youtube.com/watch?v=xoLgae5Uwjo](https://www.youtube.com/watch?v=xoLgae5Uwjo)  
44. Seamlessly Stream Videos from Azure Blob Storage \- VIDIZMO, 5月 16, 2025にアクセス、 [https://vidizmo.ai/blog/stream-video-from-azure-blob-storage](https://vidizmo.ai/blog/stream-video-from-azure-blob-storage)  
45. S3 Lifecycle Policies: Optimizing Cloud Storage in AWS \- CloudOptimo, 5月 16, 2025にアクセス、 [https://www.cloudoptimo.com/blog/s3-lifecycle-policies-optimizing-cloud-storage-in-aws/](https://www.cloudoptimo.com/blog/s3-lifecycle-policies-optimizing-cloud-storage-in-aws/)  
46. Amazon S3 \- Cloud Object Storage \- AWS, 5月 16, 2025にアクセス、 [https://aws.amazon.com/S3/](https://aws.amazon.com/S3/)  
47. VIDIZMO & Microsoft Azure: Stream Video Seamlessly, 5月 16, 2025にアクセス、 [https://vidizmo.ai/blog/vidizmo-microsoft-azure-video-streaming](https://vidizmo.ai/blog/vidizmo-microsoft-azure-video-streaming)  
48. Video AI and intelligence | Google Cloud, 5月 16, 2025にアクセス、 [https://cloud.google.com/video-intelligence](https://cloud.google.com/video-intelligence)  
49. Free Cloud Computing Services \- AWS Free Tier, 5月 16, 2025にアクセス、 [https://aws.amazon.com/free/](https://aws.amazon.com/free/)  
50. Create Your Azure Free Account Or Pay As You Go, 5月 16, 2025にアクセス、 [https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account)  
51. Explore Free Azure Services, 5月 16, 2025にアクセス、 [https://azure.microsoft.com/en-us/pricing/free-services](https://azure.microsoft.com/en-us/pricing/free-services)  
52. How your Google storage works \- Google One Help, 5月 16, 2025にアクセス、 [https://support.google.com/googleone/answer/9312312?hl=en](https://support.google.com/googleone/answer/9312312?hl=en)  
53. Amazon S3 Pricing \- Cloud Object Storage \- AWS, 5月 16, 2025にアクセス、 [https://aws.amazon.com/s3/pricing/](https://aws.amazon.com/s3/pricing/)  
54. Plans and pricing to upgrade your Cloud Storage \- Google One, 5月 16, 2025にアクセス、 [https://one.google.com/about/plans?hl=en\_AU](https://one.google.com/about/plans?hl=en_AU)  
55. Pricing examples | Cloud Storage | Google Cloud, 5月 16, 2025にアクセス、 [https://cloud.google.com/storage/pricing-examples](https://cloud.google.com/storage/pricing-examples)  
56. AWS On Air ft. Amazon S3 Fundamentals: Durability and availability \- YouTube, 5月 16, 2025にアクセス、 [https://www.youtube.com/watch?v=soZJGPtdmJQ](https://www.youtube.com/watch?v=soZJGPtdmJQ)  
57. AWS S3 vs. Google Cloud Storage Pricing \- Reddit, 5月 16, 2025にアクセス、 [https://www.reddit.com/r/aws/comments/1bi3xb8/aws\_s3\_vs\_google\_cloud\_storage\_pricing/](https://www.reddit.com/r/aws/comments/1bi3xb8/aws_s3_vs_google_cloud_storage_pricing/)  
58. Cloud Providers Comparison 2025: AWS vs. Azure vs. Google Cloud – What's Best for Your Business? \- TheCodeV, 5月 16, 2025にアクセス、 [https://thecodev.co.uk/cloud-providers-comparison-2025/](https://thecodev.co.uk/cloud-providers-comparison-2025/)  
59. Amazon AWS S3 vs. Microsoft Azure Blob Storage: Which is Better?, 5月 16, 2025にアクセス、 [https://www.ccslearningacademy.com/amazon-aws-s3-vs-microsoft-azure-blob-storage/](https://www.ccslearningacademy.com/amazon-aws-s3-vs-microsoft-azure-blob-storage/)  
60. Amazon S3 vs Google Cloud Storage vs Azure Storage Cost, 5月 16, 2025にアクセス、 [https://www.economize.cloud/blog/amazon-s3-vs-google-storage-vs-azure-storage/](https://www.economize.cloud/blog/amazon-s3-vs-google-storage-vs-azure-storage/)  
61. AWS S3 Pricing \- GeeksforGeeks, 5月 16, 2025にアクセス、 [https://www.geeksforgeeks.org/aws-s3-pricing/](https://www.geeksforgeeks.org/aws-s3-pricing/)  
62. video-features \- AWS, 5月 16, 2025にアクセス、 [https://aws.amazon.com/rekognition/video-features/](https://aws.amazon.com/rekognition/video-features/)  
63. Choose Azure AI Image and Video Processing Technology \- Learn Microsoft, 5月 16, 2025にアクセス、 [https://learn.microsoft.com/en-us/azure/architecture/data-guide/ai-services/image-video-processing](https://learn.microsoft.com/en-us/azure/architecture/data-guide/ai-services/image-video-processing)  
64. AI for Video Analytics with Azure \- Bravent, 5月 16, 2025にアクセス、 [https://www.bravent.net/en/news/video-analytics-with-azure/](https://www.bravent.net/en/news/video-analytics-with-azure/)  
65. Marketplace – Google Cloud console, 5月 16, 2025にアクセス、 [https://console.cloud.google.com/marketplace/product/google/videointelligence.googleapis.com](https://console.cloud.google.com/marketplace/product/google/videointelligence.googleapis.com)  
66. custom-labels-features \- AWS, 5月 16, 2025にアクセス、 [https://aws.amazon.com/rekognition/custom-labels-features/](https://aws.amazon.com/rekognition/custom-labels-features/)  
67. What is Amazon Rekognition Custom Labels?, 5月 16, 2025にアクセス、 [https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/what-is.html](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/what-is.html)  
68. Azure AI Video Indexer Bring Your Own (BYO) AI model overview \- Learn Microsoft, 5月 16, 2025にアクセス、 [https://learn.microsoft.com/en-us/azure/azure-video-indexer/bring-your-own-model-overview](https://learn.microsoft.com/en-us/azure/azure-video-indexer/bring-your-own-model-overview)  
69. Video classification | Cloud Video Intelligence API Documentation ..., 5月 16, 2025にアクセス、 [https://cloud.google.com/video-intelligence/docs/streaming/video-classification](https://cloud.google.com/video-intelligence/docs/streaming/video-classification)  
70. Google AutoML: Quick Solution Overview \- Run:ai, 5月 16, 2025にアクセス、 [https://www.run.ai/guides/automl/google-automl](https://www.run.ai/guides/automl/google-automl)  
71. Detecting solar panel damage with Amazon Rekognition Custom Labels \- AWS, 5月 16, 2025にアクセス、 [https://aws.amazon.com/blogs/architecture/detecting-solar-panel-damage-with-amazon-rekognition-custom-labels/](https://aws.amazon.com/blogs/architecture/detecting-solar-panel-damage-with-amazon-rekognition-custom-labels/)  
72. What is Cloud AutoML? \- Whizlabs Blog, 5月 16, 2025にアクセス、 [https://www.whizlabs.com/blog/what-is-cloud-automl/](https://www.whizlabs.com/blog/what-is-cloud-automl/)  
73. Prepare video training data for classification | Vertex AI | Google Cloud, 5月 16, 2025にアクセス、 [https://cloud.google.com/vertex-ai/docs/video-data/classification/prepare-data](https://cloud.google.com/vertex-ai/docs/video-data/classification/prepare-data)  
74. Cloud AutoML Documentation | Google Cloud, 5月 16, 2025にアクセス、 [https://cloud.google.com/automl/docs](https://cloud.google.com/automl/docs)  
75. Defect detection and classification in manufacturing using Amazon Lookout for Vision and Amazon Rekognition Custom Labels | AWS Machine Learning Blog, 5月 16, 2025にアクセス、 [https://aws.amazon.com/blogs/machine-learning/defect-detection-and-classification-in-manufacturing-using-amazon-lookout-for-vision-and-amazon-rekognition-custom-labels/](https://aws.amazon.com/blogs/machine-learning/defect-detection-and-classification-in-manufacturing-using-amazon-lookout-for-vision-and-amazon-rekognition-custom-labels/)  
76. AI Anomaly Detector \- Anomaly Detection System | Microsoft Azure, 5月 16, 2025にアクセス、 [https://azure.microsoft.com/en-us/products/ai-services/ai-anomaly-detector](https://azure.microsoft.com/en-us/products/ai-services/ai-anomaly-detector)  
77. From Defect Detection to Predictive Insights: GFT and Google Cloud To Transform Manufacturing with AI – Metrology and Quality News \- Online Magazine, 5月 16, 2025にアクセス、 [https://metrology.news/from-defect-detection-to-predictive-insights-gft-and-google-cloud-to-transform-manufacturing-with-ai/](https://metrology.news/from-defect-detection-to-predictive-insights-gft-and-google-cloud-to-transform-manufacturing-with-ai/)  
78. Azure AI Video Indexer – Video Analyzer for Media | Microsoft Azure, 5月 16, 2025にアクセス、 [https://azure.microsoft.com/en-us/products/ai-video-indexer](https://azure.microsoft.com/en-us/products/ai-video-indexer)  
79. How to Manage Machine Learning Datasets With Vertex AI \- Kommunicate, 5月 16, 2025にアクセス、 [https://www.kommunicate.io/blog/manage-ml-datasets-with-vertex-ai/](https://www.kommunicate.io/blog/manage-ml-datasets-with-vertex-ai/)  
80. Train a video classification model | Vertex AI | Google Cloud, 5月 16, 2025にアクセス、 [https://cloud.google.com/vertex-ai/docs/video-data/classification/train-model](https://cloud.google.com/vertex-ai/docs/video-data/classification/train-model)  
81. Security best practices for AWS IoT SiteWise \- AWS Documentation, 5月 16, 2025にアクセス、 [https://docs.aws.amazon.com/iot-sitewise/latest/userguide/security-best-practices.html](https://docs.aws.amazon.com/iot-sitewise/latest/userguide/security-best-practices.html)  
82. Industry experts offer OPC UA solutions update, 5月 16, 2025にアクセス、 [https://iebmedia.com/technology/opc-ua/industry-experts-offer-opc-ua-solutions-update/](https://iebmedia.com/technology/opc-ua/industry-experts-offer-opc-ua-solutions-update/)  
83. AWS re:Inforce 2023 \- Amazon S3 encryption and access control best practices (DAP306), 5月 16, 2025にアクセス、 [https://www.youtube.com/watch?v=ukk3R5DrdSs](https://www.youtube.com/watch?v=ukk3R5DrdSs)  
84. Azure Blob Storage pricing | Microsoft Azure, 5月 16, 2025にアクセス、 [https://azure.microsoft.com/en-us/pricing/details/storage/blobs/](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/)  
85. 2025's Complete Guide to Microsoft Azure Storage Pricing \- Anodot, 5月 16, 2025にアクセス、 [https://www.anodot.com/blog/azure-storage-pricing-guide/](https://www.anodot.com/blog/azure-storage-pricing-guide/)  
86. 1月 1, 1970にアクセス、 [https://gitlab.freedesktop.org/gstreamer/gst-snippets/-/raw/master/h264\_backlog\_recording.c](https://gitlab.freedesktop.org/gstreamer/gst-snippets/-/raw/master/h264_backlog_recording.c)  
87. Edge Buffering \- QuestDB, 5月 16, 2025にアクセス、 [https://questdb.com/glossary/edge-buffering/](https://questdb.com/glossary/edge-buffering/)  
88. Video Storage \- Technical Documentation and FAQs, 5月 16, 2025にアクセス、 [https://doc.milestonesys.com/arcules/en-us/arcules/video\_storage\_en.html](https://doc.milestonesys.com/arcules/en-us/arcules/video_storage_en.html)  
89. Advances in Visual AI From Edge to Cloud \- Security Industry Association (SIA), 5月 16, 2025にアクセス、 [https://www.securityindustry.org/2025/04/25/advances-in-visual-ai-from-edge-to-cloud/](https://www.securityindustry.org/2025/04/25/advances-in-visual-ai-from-edge-to-cloud/)