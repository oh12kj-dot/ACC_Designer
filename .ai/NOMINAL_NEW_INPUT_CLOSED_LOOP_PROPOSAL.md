# 未加工 own 別原写真の閉ループ cutout: 有限設計提案

2026-10-29 JST。設計判断のみ。実装、画像加工、採用、manifest・negative ledger・SQL の変更は行わない。既存 `.ai/NOMINAL_NEW_INPUT_CUTOUT_CONTRACT.md` の寸法・意味・保存境界と `.ai/HANDOFF.md` の hold を引き継ぐ。

## 判断

**別の exact-dispatch route を設ければ、原写真で背景が透けて見える不透明な閉ループを条件付きで扱える。** これは画像 alpha の開口だけであり、Part の穴径、接続位置、経路、fit 等の実物幾何の根拠にはならない。既存 v2/v3 の `enclosedHoles=false`、worker の `len(contours)==1`、戻り値 `holes=0`、既存 key・cache・加工 bytes を変更しない。v3旧exact7は採用/検証4、別cohort001の無穴パール5は加工後全不採用で凍結済み。closed-loopは加工/採用0。既知失敗入力、特に opal のアルゴリズム由来の内部抜けをこの route に流さない。

## 有限の入力条件

1. 固定 `.local/setup/bulk-cutout-unit-001.json` の exact 1,000 source ID とその `unprocessedAlternateCandidates` の原 SHA に限る。unit の bytes SHA256 `395443093e7f71ed2db99044dc54bfc70dc324f3bf4d40b45395d21ee7708c47` を照合する。primary と同一 bytes、primary 自体、gallery 外、準備済み、既登録の source または写真、既知失敗の原 hash・crop・BODY frame/BOX は入口で拒否する。新 renderer 名や時刻で negative を回避しない。`scripts/new-input-cutout-gates.mjs` の unit/registry/plan/gallery/live SQL/prepared/negative/hold/販売ゲートを維持し、加工直前と採用直前に再照合する。
2. own の product・variant・SKU・色・finish と完成 BODY の対応、元の主写真との異なる binding、寸法が完成品全体を表すことを source ごとに審査する。opaque で境界が原寸で読める一個体のみ。半透明、反射・白境界が曖昧なもの、重なり、支持台、切れた輪郭、未知の開口、接した個体、未審査の細線は拒否する。既存 hold、archived、販売除外を解除しない。BODY 値は現行の正・有限・40 mm 以下・1/40 mm grid・比 4 以下、rotation 0 のまま。実物軸・画像尺度・variant 外観・接続は未確認、接続配列は空とする。
3. 原写真全体と未回転の原寸整数 crop を別々に表示し、四辺の余白、完成品の全外周、全開口、細い bridge、先端を確認する。crop は一個体全体を含む。開口数を `expectedOpenings` として 1～4 の有限整数に固定し、各開口に原寸 crop 内の独立した審査記録を付ける。開口の背景が本当に見えるか判別できなければ保留する。主写真 bow `kiwa:9595609579812:49677743128868` の primary SHA `25f143f2ee2de5049144fdbc35b6d78ed31157a2324bca5b4bca48cde73612e2` には 2 開口が見えるが、これは**入力不可の参考観察**である。同 source の unit に別原候補 6 SHA がある事実だけでは、どの別原にも可視の 2 開口があるとは判定しない。

## 新 route の最小仕様

- 専用 `algorithmVersion`、worker、runtime binding、recipe、cache root、asset namespace を使う。GrabCut の RGB→BGR、5 反復、RNG seed 0、thread 1、入力原寸・二値 alpha・原 RGB 不変・独立二回実行同一 SHA は v2/v3 と同じ。新 route も原写真 RGB を生成・補完・色補正しない。
- 固定する seed は、個体を囲む緩い object ROI、不透明な foreground core、外周と分離して審査した背景、**各開口内の確実な背景 seed**、および開口を隔てる細い bridge の確実な foreground witness である。各開口の背景 seed は原寸で背景と判読でき、互いに独立し、foreground/core/bridge witness/ROI 外と交差しない。bridge witness は原寸で連続する実物上に置き、見えない bridge を seed で描き足さない。polygon/矩形は疎な seed と審査領域であり、精密な外形 contour を強制しない。seed 数・座標上限、crop/原 SHA、審査者・時刻、原寸の各開口レビューを spec に固定する。
- 各開口には境界の許容領域 `reviewedOpeningEnvelope` を原寸で固定する。これは原写真を見て開口全体とその境界の曖昧さだけを包む領域で、別の暗部・模様・外部背景を含めない。生成後、4 連結の背景を crop 四辺から flood し、外部背景に接しない背景成分だけを内部開口と定義する。8 連結 foreground は core を含む **ちょうど 1 成分**で、全 bridge witness は同成分に残る。内部背景成分の数は `expectedOpenings` と完全一致し、各成分は対応する唯一の sure-background seed を含み、対応 envelope 内に全画素が収まり、他の seed/envelope と交わらない。seed のない内部背景成分、複数 seed を合体させた成分、外部へ漏れた開口、別位置の punchout は拒否する。背景 seed は alpha=0、foreground/core/bridge witness は alpha=255、ROI 外と crop 四辺は alpha=0。既存の面積・ROI 境界・core-only 拒否も維持する。
- topology の数だけでは細い bridge の欠損や、既存開口へ連結した誤消去を検出しきれない。原寸の native RGBA と原写真を重ね、外周と**開口ごとの全境界**、bridge の最細部を目視し、開口内部に残る背景、失われた金具・先端、灰色縁・影、不要な透過を拒否する。`high`/`medium`/`thumbnail` も表示して橋と開口が縮小後に識別できるか確認する。縮小で橋が消える場合は採用不可。曖昧ならその入力を negative に記録し、同じ原 hash/crop/BOX を別 route で再試行しない。

## 境界、検証、採用

- sidecar は source/主写真/別原の binding、原寸 crop、各開口 review・seed・envelope、bridge witness、素材、寸法根拠、expectedOpenings、algorithm/runtime/script hash、原/加工別審査時刻、`specSha256` を固定する。pixel key は別原 SHA + crop + seed/envelope/witness + 固定パラメータ + runtime/script hash + BODY frame + 新 version。source 固有 Asset key は source binding + alternate binding + rule/review envelope + pixel key に束縛する。既存 v2/v3 の key、cache、bytes、reviewer/time、失敗 ledger を再解釈しない。
- target tests: 2 開口の opaque bow 相当 fixture は 1 foreground/2 seeded interior background、原寸 RGB 一致、確定 seed、bridge、外周余白、二回同一 hash、`medium=high` を確認する。negative は seed のない新 punchout、穴の埋まり・外周への漏れ、二穴の合体、bridge 切断または細り、曖昧な白/反射・半透明、誤 seed、crop 外周接触、隣個体、主写真、登録済み、既知失敗原/crop/BOX、unit 外 ID、変わった runtime、cache/hash/時刻不一致を拒否する。テスト fixture の成功は実 own 写真の採用証拠にならない。
- 実候補は original → processed の別審査を行い、元画像、原寸 cutout、`high`、`medium`、`thumbnail` の実 bytes/四画像 hash を固定した合格行のみ `adopted` にする。初回実入力が失敗しても同一署名を緩い閾値で繰り返さない。保存が必要になった場合だけ既存 single writer の新 recipe exact dispatch を追加し、250 以下 chunk/25 checkpoint、commit 直前の live plan・registry・workspace・負例・hold・重複検査を行う。保存後の Part/snapshot/Asset/四画像 API bytes、全旧 Part/Asset/Design/registry 保全、再実行 `created=0`、再起動 read-back まで確認して初めて使用可能件数へ算入する。local SQL の証明を cloud/Production の証明と呼ばない。

**現時点の結論:** これは実装可能性を示す有限契約であり、実候補の原寸開口審査も採用も行っていない。bow の primary を再処理する許可ではなく、固定 unit の未加工別原が各条件を満たした場合に限る。

## root 統合上の限定（実装前）

これは Sol/medium を明示要求した一回の設計提案で、runtime の実モデルは未確認。具体的な untouched own alternate の opaque 全外周・全開口・bridge 審査を先に確保するまで採用経路を実装しない。bow 別原 ed09ae29... の白個体はnative800で透明感と淡い外周があるため opaque 条件を満たすと先取りしない。キヘイ2 marbles の own 別原は450px/密集/切込みがあり、穴背景と外部がつながる可能性を原寸で判定するまで閉ループ合格としない。これらは品質永久hold変更ではない。

入口で既存 gate をそのまま使用する。採用直前の再照合では、新経路自身の exact source/hash/crop/spec/key/4出力SHAで凍結した準備だけを許容し、別準備/別crop/登録済画像/known negative を除外する。既存 gate の PREVIOUSLY_PREPARED を一般に緩めたり、既存renderer/承認を変更したりしない。familyごとのサーバー再起動は禁止を優先し、追加API/full readback/一覧/保全で検証する。再起動が必要なUI統合変更が発生した時だけ別に判断する。

## 具体入力の原寸審査 checkpoint（2026-10-29）

`kiwa:8945018241316:47625689366820` リング ラウンド5 ホワイトパール約37mmは、own primary3a48.../own別原a545273d10ab4a25ea63f2190d7a8cc436c0c016763591dfe814a6ceb6cb4d94 native450とcrop225,182,200,205をroot実目視。全周と厚い不透明white annulus、中央1開口に同じbrown cloth背景、bridgeの全幅を確認。[有限qualification](../.local/setup/closed-loop-white37-original-qualification.json)。現行mechanical gate eligible、原審査のみ・加工/採用/SQL0。原crop左上の別個体fragmentを疎ROI外へ置く案を保存。全共有sourceのintended/対象外一覧はまだfreezeしていない。

本文の「通し穴なし」は穿珠用drilled holeを指し、写真の中央開口1を否定しない。image alphaの開口を穴径/接続geometryへ変換せず配列は空。37mmは掲載body scalarの仮square、画像pose/物理軸/尺度/size別外観未確認。これは上記の具体入力先行審査条件を満たす1sourceの実装候補であり、他写真/他sourceの合格やV2/V3への穴処理流用を認めない。Pearl finite guard/新route/新runtime/new namespace/negative/既存保全を維持し、traditional合格基準は変更しない。
