# アクセサリーデザイナー

実画像のパーツを並べ、実寸・長さ・接続関係を確認しながらアクセサリーを設計する Next.js アプリです。Supabaseの設定なしで、パーツ・画像・デザインを端末内に保存できます。

## 別の Windows PC で起動する

1. **Node.js 24 以降**と **Google Chrome** をインストールします。
2. このリポジトリを **Code → Download ZIP** で取得して展開するか、次のコマンドで取得します。

   ```powershell
   git clone https://github.com/oh12kj-dot/ACC_Designer.git
   cd ACC_Designer
   ```

3. **初回セットアップ.bat** をダブルクリックします。依存ファイルの取得と本番ビルドを行います。初回はインターネット接続が必要です。
4. 完了後、**ACC_Designer.bat** をダブルクリックします。
   Chromeの待機画面が先に開き、保存データの確認が終わるとアプリへ自動的に切り替わります。
5. **Chromeの専用画面を閉じると、処理中の保存を待ってサーバーも自動停止**します。起動時の黒いウィンドウは終了まで開いたままにしてください。

通常のChromeのタブには影響しません。多重起動や他のサーバーとの3000番ポートの共用はできません。詳しくは [起動方法](起動方法.md) を参照してください。

更新時はアプリを停止して `git pull --ff-only` の後に **初回セットアップ.bat** を再実行します。ZIPの場合は新しいフォルダーに展開し、必要なデータを以下の手順で移してください。`.local` を消すと端末内データを失うため、更新前にバックアップしてください。

## データの保存先

GitHubにはアプリのコードと固定参照情報を保存します。**保存済みのパーツ・画像・デザイン、収集カタログ、認証情報は含みません。** `.local/`、`.env.local`、バックアップ、作業証拠、ブラウザープロファイルはGit対象外です。端末間の自動同期はありません。

新規取得後は空のライブラリーから始まり、手動でパーツを作成・編集してデザインを保存できます。カタログ原資料がない場合、商品由来のパーツ・紐商品は利用できません。原資料が片方だけある・壊れている場合はエラーとなり、確認を省略して保存することはありません。収集・一括登録を初回セットアップから自動実行しません。

## 既存データを別端末へ移す

1. 移行元の `/designs` で「バックアップを書き出す」を実行し、`.accbackup.ndjson` ファイルを保存します。
2. 商品由来パーツを含む場合は、次の**対応する2ファイルもUSB等の非公開経路**で移してください。GitHubにはアップロードしません。

   ```text
   .local/parts/parts.json
   .local/catalog/catalog.json
   ```

3. 移行先を**同じ版のコード**でセットアップし、アプリを起動する前に2ファイルを同じ場所へ配置します。
4. 移行先の `.local/workspace` が存在しない状態で、次を実行します。

   ```powershell
   npm.cmd run workspace:restore -- "C:\backup\accessory-workspace.accbackup.ndjson"
   ```

5. 復元成功後、`ACC_Designer.bat` から起動します。

既存の保存先は上書きしません。移行先で既に起動した場合は、そのデータをバックアップし、アプリ停止後に `.local/workspace` を別の場所に保全してから復元してください。画像・参照・内容ハッシュと所有者を検証します。カタログ原資料は固定の販売条件情報と一致する必要があります。登録保留の解除や画像の再加工は行いません。

[バックアップ・復元の詳細](.ai/WORKSPACE_BACKUP_SET_USAGE.md)。ブラウザー内だけに残る未保存の復旧内容は、先に移行元で明示保存してください。

## 開発・検証

```powershell
npm.cmd ci
npm.cmd run dev
# 別のコマンド画面で検証
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:desktop
npx.cmd vitest run src/server/portableStartup.test.ts
```

`npm.cmd test` はローカル収集資料を照合する開発・登録用テストも含み、一部はGitHubに含めない原資料・審査fixtureが必要です。新規取得での受入対象は、初回セットアップ、本番起動、手動パーツ/デザイン保存、終了・再読込と上記portableテストです。E2E開発には別途 `npx.cmd playwright install chromium webkit` が必要です。

実クラウド移行、iPhone実機、全商品の校正完了・実寸精度の受入は完了していません。現在は端末内利用を基本とし、実Supabaseへ接続する場合だけ `.env.example` と [Supabase設定](supabase/README.md) を参照してください。
