# Windows デスクトップ起動・終了契約

2026-10-31更新: [早期表示契約](DESKTOP_FAST_START_CONTRACT.md)を起動順序の現行契約とする。Next listenerで `listening`→専用窓の待機画面、従来の全件検証/global共有確認が成功した時だけ `ready`→ホーム。起動/停止競合と失敗時の窓所有を含めて検証し、以下の「DB確認後にChromeを開く」旧順序は置き換える。全画像audit・single writer・正常closeを省略しない。

状態: **Chrome 専用経路を実装・隔離 workspace で実機検証済み**。`ACC_Designer.bat` → `scripts/desktop-launcher.mjs` → private IPC の `desktop-server.mjs`。Chrome 保存POST本文送信途中で実窓を閉じ、保存完了→DB close→lock解放→server exit→再open/保存Design読戻し成功。[proof](evidence/desktop-launcher-chrome.json)。登録・画像加工・自動再開 **PAUSED**、実データ変更0。下記は元設計、現在の差分・未検証境界は次段落を優先。

実機根拠でブラウザー選択を **Chrome のみ**へ限定。Edge はbootstrap PID再起動をskipするflagで追跡できたが、初回案内によりmain windowが無効になりCloseMainWindowが失敗するため本番discovery対象外。全ブラウザー列挙/killなし。起動排他はworkspace絶対path由来のWindows named pipeでOSが回収し、stale PIDファイルは作らない。自分のlistenerでworkspace APIをprobeしてDB busy/同一process global共有を毎回確認。既存 `dev/start` 不変。通常起動でbuild/install/登録なし。二重起動・port競合・browser spawn失敗・Chrome実窓close・in-flight保存と永続化を検証済み。異常OS終了/電源断/DB.close失敗注入/大容量stream期限/全window派生は未受入、正常closeを保証へ一般化しない。3000の既存devは停止せず、実起動時には元起動元で終了が必要。

## 根拠と選択

- 現行 `package.json` の `dev` / `start` は `scripts/local-next.mjs` 経由の Next CLI。これは `127.0.0.1` に固定し、`local-next-options.mjs` が未指定時に Node の 8192 MiB heap を設定する。CLI 子プロセスへの Windows signal だけでは PGlite の正常な閉鎖を確認できない。
- `src/server/localWorkspace.ts` はプロセス内 `globalThis.localWorkspace` に `Promise<LocalWorkspace>` を保持し、`LocalWorkspace.close()` が DB を閉じてから `.local/workspace/writer.lock` を解放する。API route の `workspace()` がこれを開く。未解決 Promise、処理中の要求、閉鎖の二重実行に注意が必要。
- インストール済み Next 16.3.8 の `node_modules/next/dist/docs/01-app/02-guides/custom-server.md` は `next({dev:false})`、`app.prepare()`、HTTP handler の構成を示す。現行 `next.config.mjs` は standalone 出力を指定していない。**デスクトップ専用の production custom server** を追加し、HTTP サーバーと Next インスタンスを同じ制御プロセスが所有する方式を推奨する。既存 `npm run dev` / `start` の意味は維持する。

## 起動契約

1. リポジトリ直下にダブルクリック用 `.bat` を置く。`%~dp0` を基準に移動し、Node 24、依存、`.next` の本番 build、Edge または Chrome 実行ファイルを事前確認する。欠けていれば日本語で理由を表示し、サーバーもブラウザーも起動しない。通常起動時に `npm ci`、build、DB prepare、登録系 script、worker を走らせない。
2. ランチャーは子 Node プロセスで専用 custom server を起動する。`NODE_ENV=production`、現行と同等の heap 設定、`ACC_LOCAL_BIND=127.0.0.1` を適用し、HTTP は `127.0.0.1:3000` のみ。起動完了は **自分の子プロセスが応答する** readiness / nonce で確認する。ポート使用中、`WORKSPACE_BUSY`、初期化失敗は明示エラーで終了し、既存サーバーへ接続したり、そのプロセスを停止したりしない。
3. 起動単位の排他ロックを原子的に取得する。記録する PID と作成時刻または session token で前所有者が確実に死んだ場合だけ回復する。二重クリックは先行セッションの窓を増やさず「既に起動中」と表示する。DB の `writer.lock` は既存実装を権威とし、ランチャーロックで代用しない。
4. Edge 優先、なければ Chrome を **実行ファイルの絶対パスから直接**起動する。`--app=http://127.0.0.1:3000/` とこのアプリ専用の `--user-data-dir` を指定し、通常プロファイル・既存タブと分離する。プロファイルはセッションをまたいで保持し、同時使用を拒否する。起動で得たブラウザー main PID とその子の exit を追跡する。起動直後の PID 消失、既存ブラウザーへの委譲、窓が閉じても main PID が残る挙動は成功扱いにしない。`--disable-background-mode` 等の設定と実機観測で専用窓の close と main PID exit の一対一対応を確認する。全 Edge/Chrome プロセスの列挙・polling・強制終了はしない。
5. ランチャーはブラウザーが有効な間だけ待機する。ユーザーが**この専用窓**を閉じたと検知したら、所有しているサーバーへセッション内だけの shutdown 指示を送る。通常のブラウザー、他の起動で開いた窓、他プロセスは停止対象にしない。起動したブラウザーが失敗した場合も自分のサーバーだけを正常終了させる。

## 正常終了契約

shutdown 指示は HTTP 公開 API には置かず、親子間の認証済み IPC / private pipe とする。指示の重複は一つの終了 Promise にまとめる。サーバーは新規要求を拒否して listen を閉じ、進行中の HTTP 応答・書込み transaction・stream を完了または明示的に中断し、その終了を確認する。keep-alive 接続は必要に応じて idle のみ閉じる。未完了の保存を黙って成功扱いにしない。

その後、当該サーバー内の `globalThis.localWorkspace` が存在すれば Promise を待ち、解決したインスタンスの `close()` を一回だけ await する。DB close 成功後に既存 `writer.lock` が解放されたことを確認し、Next の `app.close()` を await して正常終了する。workspace が未生成なら新規に開かない。close 失敗や期限超過時は失敗を表示し、成功と報告しない。DB 所有中に `taskkill` / `Stop-Process` / 無条件 `process.exit()` で強制終了しない。プロセスが既にクラッシュした場合だけ既存の死活確認に従う。

**実装前の必須確認:** production custom server と `/api/local/workspace` route の実行 PID・`globalThis` が一致し、この close 経路が実際の PGlite インスタンスに届くこと。Next が route を別プロセスに置くなら上記方式をそのまま実装せず、route 所有プロセスから close 完了 ACK を返す内部制御経路を設計し直す。`app.close()` の順序と in-flight drain は実際の Next 16.3.8 で検証する。

## 受入ゲート

- テスト専用 UUID の `ACC_LOCAL_WORKSPACE_TEST_ID` を設定し、実 workspace に触れない。開始前後で実 workspace の identity、DB/画像、`writer.lock`、catalog、parts、Design の不変を確認する。登録・画像 worker の起動は 0。
- Windows 実 Edge の専用 app 窓をダブルクリックから開き、URL と loopback bind を確認する。専用窓を閉じると、対象サーバーが自動的に exit し、テスト DB の lock が消え、同じテスト workspace を再起動・読戻しできる。通常ブラウザーは存続する。Chrome fallback も利用可能なら確認する。
- 保存要求中の窓 close は成功応答済みの保存だけが再起動後に存在し、未完了は明示失敗または rollback とする。大きな画像応答や keep-alive があっても有界な終了となることを確認する。
- 二重クリック、3000 番の他プロセス占有、DB writer lock 占有、ブラウザー起動失敗、早期 exit、server crash、shutdown 重複・close 失敗を個別に確認する。どれも他プロセスを終了させず、誤って別セッションに接続せず、実 workspace を変更しない。

未検証の境界: 専用 Edge/Chrome プロファイルが Windows 上で window close と main PID exit を確実に対応させるか、Next route と custom server が同じ process/global を共有するか、Next の close が全書込み要求を drain するか。これらが通るまで「窓を閉じれば安全に自動停止」は受入不可。
