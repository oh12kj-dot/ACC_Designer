# 一括登録再開 — 2026-10-25

ユーザーの「一括登録を最後まで進めて」により、一般登録と既存acc-designer継続処理を再開。全件完了ではない。

## 実SQLと今回の変更

| 項目 | 開始 | 現在 |
|---|---:|---:|
| 使用可能Part | 11,299 | 11,457 |
| 配置対象 | 20,066 | 20,066 |
| 配置残件 | 8,767 | 8,609 |
| 全Part（archive含む） | 11,335 | 11,493 |
| 全Asset | 14,333 | 14,491 |
| 保存済みDesign | 3 | 3 |

追加158＝ティアドロップ92＋シークイン66。実穴・実接続は追加0。キット工具310、旧品/非最小販売単位との除外和集合6,980を維持。公式source27,046とmapping27,046のID集合/registry SHA256一致。raw source未登録15,589と配置残8,609を区別する。

- ティアドロップ有限120: 登録94（今回92＋旧2）/保留16（既存assort12＋新黒背景4）/旧品除外10。新規採用はown全文・原/加工画像を審査し、概寸H/W範囲の中点BOX、未確認表示を維持。[partition](evidence/nominal-20261025-teardrop-partition.json)
- シークイン87: 登録66/画像品質保留12/意味・分類保留9。最初の48のうち43、別有限30のうち23を採用。40mm制限の一般緩和はせず、77mmまでの30 sourceを別の完全object hash束縛で採用。厚み0.3mm・品番・販売個数を本体寸法に使わず、無軸pairの原順とcanonical画像姿勢を記録。既存48の仕様/画像keyを保持。[partition](evidence/nominal-20261025-sequin-partition.json)、[有限ラベル契約](NOMINAL_SEQUIN_FINITE_LABEL_CONTRACT.md)、[大型契約](NOMINAL_SEQUIN_LARGE_FINITE_CONTRACT.md)
- 品質guardは緩和しない。元85を含む既存245品質保留は解除0、新規画像保留16（黒背景4＋シークイン12）。大型30の旧engineering size holdだけは別有限契約と拒否試験で解決し、意味holdは39→9。分類pearl6/壊れたアソートラベル4は重なり1で計9を保持。
- `prepared-category-cache.mjs` を追加し、同一source/BOX/crop/姿勢/reviewの高/中/thumbnailを再利用。旧category枝の加工・キーは不変。原crop審査identityを変えず、新しい加工審査記録を別にする。

## 検証

各バッチの初回verificationを別保存してから再実行追加0。SQL read-back、全新Asset original/final highのAPI bytes SHA256、実一覧、category/原ラベル/unknown flags、空穴接続を照合。登録前の全旧Part/Asset metadata/archive/registry・全3Design aggregateを保全。

[92件の検証](evidence/nominal-20261025-resume-delta-verification.json)、[シークイン43](evidence/nominal-20261025-sequin-verification.json)、[大型23](evidence/nominal-20261025-sequin-large-verification.json)。[最終cold再読込](evidence/nominal-20261025-final-cold-readback.json)で全11,493Part・14,491Asset・穴接続・3Designの再起動前後が完全一致。PC/mobile実画面で新規3商品（77mmを含む）を見本表示→取消、変更要求0/画面例外0/横overflow0。[実画面](evidence/nominal-20261025-sequin-live.json)。実Designへのテスト配置/保存は行わない。

有限selector/旧selector回帰24tests/3files、画像key/cache node8tests、typecheck、最終build成功。全unitは495pass/5fail（106files、500tests）。失敗は復元CLIの固定runtime依存不足3件（RESTORE_RUNTIME_DEPENDENCY）と、partCorrespondenceの最小販売単位fixture不足2件（mock readFileのmissing）。単独2件でも再現。今回の登録分検証の成功と区別し、全suite成功やアプリ完成とは呼ばない。ログ: `.local/setup/registration-resume-unit.log`、`registration-resume-build.log`。既存filesystem tracing警告2件継続。

途中の第三バッチpreflightではcrop reviewer/dateを書き替えたためkey不一致を検知、SQL保存前に拒否。元identityへ戻し新加工審査を別fieldに記録して再実行、初回8/再実行0を保存済み。古いverificationの誤コピー2ファイルは削除し、失敗を成功へ数えていない。[記録](evidence/nominal-20261025-resume-third-preflight-failure.json)

## 次の実作業

登録/検証CLIは今回158件を正常終了し、worker.lockなし。Next19756/writer.lock19756（wrapper7312）はアプリserverのみ。acc-designerはACTIVE/30分間隔で、次turnに実審査・登録を続ける。server/heartbeatの稼働を登録進行とみなさない。

次は `.local/setup/next-bead-body-source.json` のMIYUKIドロップ8 exact source（先頭 `kiwa:8711216103716:46970130432292`、own BODY「外径約3.4mmで穴の位置が中心からずれた…」）を審査する。現在のcategory BOXはother/charm限定、body-size recipeはcrystal限定なので、既存枝へ偽装せず有限bead設計・拒否試験を先に確定する。既存galleryから完全な単独個体を確認し、穴位置は生成しない。

`.local/setup/next-category-source-queue.json` の1608 scalar/pairは候補にすぎない。玉径/皿径/石座適合径/線径を全体サイズへ使わない。元の品質・意味・最小販売単位holdを保持し、採用可能な別sourceの実作業を継続する。未確認品の任意画像枠方式は未承認。全配置対象と公式全sourceの実証まで完了扱いにせず、監視を止めない。
