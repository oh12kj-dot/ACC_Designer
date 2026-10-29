# 千件単位の登録作業

2026-10-26のユーザー指示「千件単位で処理を行ってください」を優先する。最新7,982残件を1,000×7組＋982へ排他的に編成した。数十件のcohort完了を作業単位の完了として終了しない。cohortは意味判断と原写真の再利用単位、campaignは1,000sourceの進捗管理単位である。

最初のregistration-001は全1,000sourceのregistry fullobject/本文/variant/gallery対応/販売許可/既存source非重複/hold外、772 distinct保存原bytes hash・実画素を一括照合済み。これは意味審査・目視・写真採用・登録の証明ではない。555 exact本文/category/tag/サイズ文法群をsemantic-review-groups.jsonへまとめた。1,000行はevidence_readyであり、登録0。

## 順序

1. campaign-current.jsonが示す固定planとjobを使い続ける。途中でSQL件数が変わっても処理済みを落とした新しい千件へすり替えない。原source/図/意味/原写真/加工の記録はIDとhashへ束縛する。
2. 千件の本文と寸法意味を同一根拠群で審査し、既存のexact審査を再利用する。原/加工各distinctの個別目視は省略しない。候補の単体不採用でjob全体を止めず、次source/群へ進む。旧holdや同一失敗cropは勝手に解除/反復しない。
3. adopted状態の行だけqueue-registration-campaign.mjsから連続登録queueへ渡す。0採用の時はwriterを起動しない。内部の最大250件保存・25件checkpointは保全用に維持し、1,000採用なら250×4を手動停止なく連続実行する。各区間の初回worker終了→初回proof保存→rerun追加0→増分検証を守る。
4. 1,000source全行の採否・登録・検証状態が記録されるまでjobを完了にしない。保留を使用可能数へ加えず、採否確定と全件使用可能を区別する。公開進捗は各jobの実調査/採用/保存/検証の別カウンタで示す。

## 実行入口

- scripts/plan-registration-campaign.mjs: live残件から一回だけ固定planを作成。
- scripts/preflight-registration-campaign.mjs registration-001: 既存保存原hashをread並列8で照合しevidence_ready。画像加工/再取得/OCR/SQL書込0。
- scripts/queue-registration-campaign.mjs registration-001: 完全審査済みadoptedだけexact selectorとqueueを生成。
- scripts/run-registration-queue.mjs: 共通のsingle SQL writerへ連続投入。既存prepared cache/approval/4API/PartAssetDesign保全を継承。

当該jobの原review/time/crop/key/cacheは凍結したものを再利用する。新recipeや新BODY意味の技術境界が必要な場合だけ同一cohortの有限設計を使い、familyごとにbuild/restart/同型reviewを量産しない。源資料だけ確認できた1,000件を「1,000件登録済み」と報告しない。
