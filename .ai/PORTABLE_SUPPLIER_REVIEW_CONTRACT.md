# 掲載照合証拠のportable backup（2026-11-07）

## 範囲と保全

凍結済みsupplier-listing-reviewを標準バックアップへ自動同梱する。証拠がある場合だけbackup-set v3、ない場合は従来v2。旧JSON v1/v2の読込・原資料必須判定・販売方針・DB/画像/ID/Designは維持する。照合証拠単体は、manifestに結び付く参照source objectだけをportable-sources.jsonへ固定し、元registryなしで同じ判定を読める。registry/catalog全体、秘密情報、session、lockは同梱しない。

既存のassertPortableSourcesは維持するため、公式登録データを含むworkspace全体の復元・通常操作には、従来通り正しい非公開registry/catalog/販売方針の配置が必要。sidecarの出典束縛だけでこの要件を迂回しない。元registryが不要という検証は照合証拠の読取に限り、全公式DBを新規端末へ復元済みとは報告しない。

## 形式と検証

v3は画像blobの後に、path順でreview-file chunkを追加する。gzip圧縮20MiB以下、復号128MiB以下、最大4096ファイル/復号合計512MiB。圧縮bytes・復号bytes双方のSHA256/長さ、canonical base64、固定ファイル名/既存evidence許可表、件数・総bytes・chunk chain・footerを検証する。28MiBの現manifestを扱うため、画像や既存32MiB行制限を緩めず圧縮する。HTTP404等の空レスポンス証拠も、正しいhash/receiptと結合すれば保持する。

読取は元manifest/receipt/source object/report/本文意味判定・各Part業務hashを既存の同一validatorで確認。欠落/改変/別owner/別Part業務内容ではunknown/staleとし、購入保留を解除しない。原資料がある旧sidecarは全registry hashも確認。portable bindingが存在するのに不正な場合は旧registryへフォールバックしない。

全ancestor・最終ファイルのsymlink/junction/canonical pathを検査。present-invalidな証拠はexport失敗、absenceだけv2。原ファイル数/bytesは読込前・読込中に制限する。復元はprivate stageで全backup/sidecar/DBを検証してから既存atomic publication。直接importでの書込/commit失敗も、作成したsidecarだけcleanupし、既存対象を保持・再試行可能にする。

## 証拠と限界

Sol Mediumを設計と別の実装レビューへ明示依頼。runtimeのactual model/effort確認情報はない。レビューP2の直接import rollback/読込前容量制限を修正。HTTP404空証拠、junction、容量制限、書込失敗、commit失敗/再試行、改変・別owner・source差替え・stale、v3 offline CLIと再exportを回帰する。

実sidecar220ファイル/183,802,569 decoded bytesを隔離先へ保存し、元registryを参照せずPart19,611/source27,046の束縛を読取検証。domain writes0。これは実workspace DBの復元・cloud・実端末・写真尺度の検証ではない。
証拠: `.local/setup/portable-review-20261107/verification.json`、同dirのfull-tests-serial.log/build.log。
