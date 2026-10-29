# 登録作業の効率化 — 実装・運用中

2026-10-26。最新SQLは使用可能12,084/対象20,066/残7,982。公式27,046/対象外6,980保持。現在の共通台帳、採用batch限定writer、準備cache、serial queue、増分検証は実装済み。[Tpin103実績](evidence/t-pin-work-summary.json)、[丸/Cカン53実績](evidence/jump-ring-work-summary.json)。全件完了時刻を保証する根拠はない。

## 処理単位

同本文・寸法意味・own図に基づく有限source表で意味判断を共有する。全sourceのvariant/価格/販売単位/外形意味/own photo associationは省略しない。各distinct原と各加工specは別々に実見し、原review/timeと加工approval/hashを分離固定する。source/rawlabel/図/crop/姿勢/BOX/recipe/keyが同じ準備を再利用し、既登録原画像を再加工しない。掲載軸・概寸と未知表示の承認を維持し、内径/線径/販売長/別部品適合値をBODYへ代入しない。

## 共通基盤

- scripts/plan-registration-work.mjs と lib/registration-work.mjs：liveSQL/policyから排他的な残件台帳とfinite evidence validators。台帳・候補・cacheは採用の証明ではない。
- scripts/prepare-registration-work.mjs：既存category/natural/t-pin/body-table constructorを共通入力から利用。新tableはexact source/hash/意味/原審査を必須にする。未審査写真・空tag範囲外は止める。
- scripts/prepared-reviewed-cache.mjs：新finite adapter共通準備envelope。source/spec/key/payload/各bytes SHA照合、warm renderer0。
- register-nominal-parts.mjs --batch：最大250のexact ID/hashと採用manifestだけ保存。single writer、save直前workspace/source/hold/sale/manifest、直後Part/購入/source snapshot/Asset4APIを照合。
- scripts/run-registration-queue.mjs：worker終了後に初回proof保存してからrerun0、state/log保存、停止時回収。失敗attemptを消さず初回createdを偽装しない。
- scripts/verify-registration-batch.mjs：新Part ID/Assetだけを増分として除き旧全Part/Asset/archive/registry/全Design保全、全新4API/listing/fullreadback/購入/source snapshotsをread並列2で照合。SQL書込/再加工0。

## 作業を止めない運用

採用batchは連続保存し、保存中に次の独立source群を読み取る。難TOHO尾部や同じ不採用cropを毎回先頭に戻さない。次群が単体不採用でも他群は続ける。既存の加工・正確なsource意味で足りる場合は家族ごとの新設計/build/restartをしない。source意味/shape recipeの新しい境界だけ有限設計を行い、データ保全の新経路は一度の有界独立reviewを使う。review修正は根拠付き負例と実readbackで確認する。

Tpin103は原6と103加工、丸/Cカン139は図8/原15/139加工→53採用/86不採用。53の保存本体106.5秒、rerun6.2秒はそのworker部分の実測であり、設計・審査・追加検証や全残件の所要時間ではない。調査数/採用数/保留理由と段階時間を各summaryへ残す。品質hold245以上/旧85/TOHO16、最小販売単位、旧品除外、空tagItaly27、全既存Design/archive、Supabase不使用は不変。

## 千件作業単位（最新）

[千件運用](REGISTRATION_THOUSAND_WORK_UNITS.md)を優先。残7982=1000×7+982へ固定編成、最初1000のsource identity/772原hash/実画素一括照合済み、555意味審査群へ整理。これは採用0/登録0のsource段階。外側1000ごとに進捗を管理し、小さいcohortの終了で作業単位を打ち切らない。内部の最大250保存/25checkpointは保持し、採用済みを連続保存する。

## 次と完了条件

次は丸カン31/5原候補のexact own図binding。現在139scopeの単純拡張や未確認画像の合格化はしない。最新HANDOFFとwork-progressを優先する。全20,066が使用可能かつ公式27,046全対応/除外/hold政策/再実行0を実証するまで全件完了ではない。現monitor保存PAUSEDは今回変更していない。未来のscheduler稼働を現在の登録進行と呼ばない。
