# 最小販売単位によるPart重複整理契約

2026-10-19。設計契約。実装・実データ整理の完了証明ではない。

## 承認範囲と保全

同一物理部品の入り数だけが異なる販売variantを編集用Partとして重複表示しない。最小販売単位の掲載価格を価格参考に使い、登録済み重複を整理し、将来の再登録を防ぐ。一般登録・監視はPAUSEDのまま。本件整理と必要な実装だけを承認範囲とし、新しい校正・画像加工・他商品の登録・Supabase書込は含めない。

固定registry 27,046 source IDと公式全件対応を保持する。registry、catalogの原文、校正・nominal証拠、既存Part/Assetのsource identityを改変して販売単位を付け替えない。saved Design、配置snapshot、参照definition、画像bytesは不変。参照済みPartはarchiveで残し、新規選択から除外する。過去のDesign0証拠を現行Design1の保全証明に流用しない。

2026-10-19追加ユーザー判断: 商品名・variant選択肢に「終息」「旧品」「切替待ち」（切り替え待ち等を含む）が明示された販売単位は登録対象外。未参照の登録Partは削除、参照済みはarchiveし、今後取り込まない。説明本文で別商品の旧品に言及しただけでは除外しない。最小販売単位は対象外offerを除いて選ぶ。全offerが対象外ならsurvivorを残さない。公式原情報と価格記録は保持する。この判断は下記の状態語hold規定に優先する。

## 物理同一性と販売単位の順序

1. 対象draftとcatalog variantをproductId/variantIdで一意照合し、draft.purchase.sourceTextがoptionsのちょうど1要素と完全一致することを確認する。一致なし・複数一致・option数不一致はhold。名前・SKU・画像・寸法の類似だけで群を作らない。
2. 通常identityは`productId + purchase-option index + 全てのその他optionの位置と原文値`。JSON配列等の衝突しないencodingで固定する。色・加工・サイズ・assort・形状等の他optionは正規化せず完全一致とする。商品をまたぐ統合は後述のfinite大袋対応例外だけを許可する。
3. purchase optionが入り数以外の物理構成差を含む場合は自動統合しない。異なるassort内容、セット内容、付属品、形状、素材、仕上げ、サイズ等を表す残余文字はidentityに追加して都合よく消すのでなく、元群をholdする。中袋/大袋など明示包装ラベルだけを数量に影響しない既知語として許可する。
4. 数量parseは有限の文法と原文証拠を持つ。正の整数/十進数と明示単位のみ受理する。数値は正確な十進・有理数で比較し、丸めで同値にしない。ヶ/個/ケを同じpiece、g/kgをweight、mm/cm/mをlength、ペア/組をpairとして扱う場合は、その語が当該包装文脈で実際に同義であることを元データで検証したaliasだけを採用する。`組`がセット構成を表す場合はpair扱いしない。`本`は専用count単位として同じ本どうしだけ比較可とし、pieceやlengthに換算しない。
5. 明示単位内の換算（kg→g、m/cm→mm）だけを許す。piece/pair/本/weight/length/setを相互換算しない。販売長が異なるvariantは物理的な長さ自体が変わり得るため、同一length単位でも本件の自動整理対象にせずholdする。単価や価格の安さから数量順序を決めない。全memberが同じ比較可能単位であり、全option文字列が許可文法で説明できる群だけresolvedとする。
6. `5ヶ切り替え待ち`のような移行・予定・旧新混在/旧/終息の注記、数量不明、範囲、主数量自体の約表記、単位なし、set、mixed-unitはhold。例外として、正確な主重量に既知文法の補助的な括弧内概算個数だけが付く表記は受理する。`2g(約71ヶ)`と`50g(中袋)`は正確な主重量2g<50gで比較し、前者のestimatedCount=71とapproximate=trueを別情報として保持する。概算個数を主数量や重量↔個数換算に使用しない。`1本 約38cm/約125ヶ(15インチ)`のような複合表記はholdし、先頭の1本だけで比較しない。括弧内のRC/1 アイボリー/PB-304シマエナガ等の物理差を包装注記とみなさず、任意の括弧除去は禁止する。たとえば10本と50gの群は数量が読めても最小不明。4ケは有限alias検証で説明できれば受理できるが、その追加を移行注記の自動無視へ広げない。
7. 最小数量の候補が複数なら同じ販売単位のtieとする。表示用offerは最小数量候補のうち固定catalogで販売可能と明示された候補を優先し、その後sourceDraftIdを安定した文字列昇順で選ぶ。最小数量が販売不可の場合も大きい数量へ差替えず、その状態を明示する。価格をtie-breakに使わない。tie memberの物理option一致が確認できない場合はhold。価格欠損は欠損表示し、より大きい包装の価格で補わない。

preliminary 4,281群/8,895variant/最大4,614余剰は候補数であり削除数ではない。unknown/set/mixed 441群等の初期分類も確定値ではない。実行前のfinite manifestがresolved/holdと根拠を全memberについて確定する。

### 別商品へ分割された大袋のfinite対応例外

大袋が別productIdへ分割されているため、productId一致だけでは同一物理部品の整理を完了できない。次の全条件を満たす固定source-bound pairだけをmanifestへ列挙し、通常商品productIdをfamily rootとして使える。ランタイムの曖昧検索・推測による横断統合はしない。

- 商品名はNFKC適用と、先頭の明示`[大袋]`だけの除去後、メーカー・品番/型番・色・加工を含む全文が完全一致する。部分一致・色名の類義語置換・数字/括弧の一括除去は不可。通常側と大袋側が相互に一意であること。多対一候補は全体をholdする。
- 公式description全文がbyte一致する。汎用説明の一致だけを物理同一性の証明としない。原description hashと両source URL/取得日を残す。
- 両商品の公式商品写真に同じ数値article codeが確認できる。ファイル名の許可形（数値code単独、または同codeに既知UUID suffix）だけから抽出し、任意の先頭数字一致を使わない。codeの一致だけを色・サイズ・仕上げの証明としない。
- 通常のcross-product例外では、両商品のgalleryに少なくとも一つ同じbytes SHA256を持つ当該articleの商品本体写真があり、公式gallery associationを確認できる。共通logo・寸法汎用図・注意書き・汎用販促画像は証拠から除く。以下の限定crystal識別子経路を満たさないpairは、shared商品写真hashがなければholdする。
- **貴和クリスタル限定の識別子経路:** 元の公式商品名が貴和クリスタルであり、上記の全文メーカー/型番/色/仕上げ名の一意一致・byte一致description・全非購入option/掲載サイズの一意対応に加え、固定公式catalogの原handleが厳密に`bulk.handle === normal.handle + '-grs'`を満たし、両商品の先頭公式商品写真の数値article codeが許可文法で一致する場合は、shared画像bytesを必須としない。handleの正規化・任意suffix除去・類似検索は不可。この識別子tupleを満たすfinite source pairだけを列挙し、他ブランド/他typeへ一般化しない。画像hash共有は取得済みなら補強情報として記録する。別bytesやUUID filename suffixだけで不一致としない一方、色/仕上げ/型番等の明示的矛盾があればtuple成立とせずholdする。
- variantごとの全非購入optionの原文と意味上の軸、掲載サイズ、物理修飾が完全一致し、一意に対応する。option軸をまたぐ対応は明示した有限のindex mappingで表し、並びや画像類似で推測しない。色/仕上げ/サイズ/assortの曖昧さや片側情報欠損は当該対応をholdする。shared gallery hashはvariant専用写真の一致や外観確認済みを意味しない。既存のappearance/geometry未確認flagsを維持する。

pair根拠とvariant対応を個別にmanifestへ固定する。一部variantが対応できなくても他の確定variantまで捨てず、不一致variantはholdに残す。原productId/variantId/sourceDraftIdを全て保持し、原registryも公式全件対応も変えない。新規pairの追加や入力hash変更は自動採用せず、再度finite根拠を検証する。

`(大袋)_移動`は、上記の根拠でfamilyが独立に成立し、数量の残部が許可文法だけで説明できる有限offerについてのみ行政的な包装移動markerとして許可できる。markerを消してfamily同一性を証明する循環は禁止する。marker原文・対象source ID・除去理由をmanifestへ残す。`旧`/`終息`/`切替`等の状態語を同じ扱いに広げない。shared商品写真経路も限定crystal識別子経路も満たさないpairはholdする。どちらの経路も購入identityの根拠であり、variant外観一致・画像尺度・物理校正・接続適合の証明へ昇格しない。

## finite manifestとPart/価格の分離

`src/data/`にversion付きfinite manifestを置く。registry/catalogのSHA256、parser version、identity encoding、全memberのdraft/variant ID・原option・parse結果・hold理由、canonicalOfferDraftId、最小数量/単位・掲載価格/通貨/取得日を含める。全27,046 IDが一度だけresolved群またはsingleton/holdに属し、漏れ・重複・未知ID・source hash変化は失敗する。入力不明時にランタイムが推測で群を作り直さない。`.ai/evidence/`にはmanifest hashと実DB照合・整理結果を保存する。

物理PartのsourceDraftIdと価格参照offerを分離する。既存最小offerのPartを優先して残す。ただしstrict校正Partをnominalへ置換しない。候補のgeometry/definition/画像の意味が矛盾する場合はholdとする。両立する場合はstrict校正を優先し、同じ品質ならcanonicalOfferDraftId一致、その後Part ID文字列昇順で物理survivorを決め、理由を記録する。

最小offerのPartが未登録でも、既存物理Partをsurvivorとして最小offerを表示時に参照する。sourceDraftIdを書き換えず、新規Part/Assetを作らない。manifestは`canonicalOfferDraftId`と`retainedPartId/retainedSourceDraftId`を区別する。校正根拠と購入価格の出典はそれぞれ追跡可能にする。ユーザーfavorite/使用履歴を集約表示するときも古いPart IDの履歴を破壊しない。

## 実データ整理

事前に実owner、稼働writer、schema、manifest/input hash、全対象Part aggregate、全Design aggregate/参照、Asset metadata/bytes hash、既存archive状態、registry hashを記録する。実行planには各groupのsurvivor、対象Part ID、archive/delete/hold予定と理由を明示する。登録停止を確認し、writer競合を防いだ正規backend経由で実施する。過去snapshotへrestoreしない。

各群の変更をtransaction内で再照合し、Part row lockと既存FK/immutability guardを維持する。直接参照に加えsuccessor参照等の削除阻害を確認し、参照ありの旧Partはarchive、真に未参照の旧Partだけ`remove_unreferenced_part`で物理削除する。共有画像・Asset・blobは削除しない。削除直前の参照競合をDBが拒否した場合はtransaction rollback後に再観測し、参照が確認できればarchiveへ変更する。原因不明の失敗を握り潰さない。

入力hash・対象内容の変化やsurvivor消失はfail closed。既に正しくarchive/削除済みのIDは期待状態と照合してno-op、再実行で追加変更0。単一transactionまたは耐久journal付き群単位transactionで、途中終了後に同じmanifestから安全に再開できること。古いidempotency keyの成功cacheだけで現在状態を証明しない。

## read側と将来登録のguard

編集library・検索・pickerはresolved群につきactive physical survivor 1件だけを表示する。量optionだけを取り除いて名前を組み直し、サイズ/色/仕上げ等は保持する。元Part名の文字列置換や数字の一括削除をしない。別欄に最小販売単位・掲載総額/通貨・価格参考/取得日を示す。最小単位の掲載総額を1個価格と表示しない。hold群は重複と断定せず、販売単位を保持して区別し、整理保留を記録する。既存Designのarchive Part読込/再保存は許可し、snapshotをsurvivorへ自動差替えしない。

正規保存境界（local `LocalWorkspace.rpc`の`save_part_successor`経路）で、実source IDをmanifestへ照合して最小offer選択・一群一active Partを強制する。clientが送るidentity/canonical flagを信用しない。nominal worker、official mapping worker、placement planningも同じ決定を使い、画像準備/予約前に非canonical・hold登録を止める。source付き公式登録で未知ID・必要source情報欠損は拒否し、metadataを外すことによる回避を防ぐ。手動Partに公式source重複規則を誤適用しない。

新規群はcanonicalOfferDraftIdだけを許可する。既存survivorは元sourceDraftIdのまま正規編集・必要successorを許可するが、同一群の別active Part新設は拒否する。判定・重複照会・保存を同じtransaction/直列化されたlockで行い、同時保存2件が両方成功しない。existing Part更新のpayloadは省略metadataを既存値とmergeした実効値で判定し、source外し/改変は拒否する。backup restoreは歴史的archiveを含め完全復元し、active重複を新規登録と同じように黙って破棄しない。Supabase側に同等guardがない間、クラウド登録対応済みとは扱わない。

## 受入と証拠

- parser/identity: 包装違いを統合し、色/仕上げ/サイズ/assort/option位置違いは統合しない。4ケ/10本/単位換算/tie/価格欠損/切替注記/mixed-unit/複数一致/不明sourceを境界テストする。
- cross-product例外: 共通条件といずれか一つの証拠経路が成立するpairは統合する。限定crystal経路はshared画像hashなしでも通り、他ブランド・handle一文字違い・先頭article code不一致では通らない。title部分一致・色違い・共通汎用画像だけ・両証拠経路不成立・article code不一致・対応軸欠損・多対一候補はholdする。証明済みfamily内のfinite`(大袋)_移動`だけを許可し、同markerだけでfamilyを作れないことを確認する。
- backend: 非canonical新規拒否、worker両入口一致、source偽装/省略拒否、survivor編集/参照済みsuccessor成功、同時登録の一件だけ成功、拒否時Part/Asset部分保存なしを隔離DBで検証する。
- cleanup: 未参照削除、Design参照archive、successor参照archive、共有画像保持、途中中断/再開、二回目変更0、対象外/hold不変を隔離DBで確認する。
- read/UI: 数量なしの物理名、最小単位の価格参考と欠損、全resolved群一件表示、hold区別、既存非空Designの読込/再保存/再起動を確認する。
- live: 整理前後の件数とID差分をmanifestに完全照合する。全Design aggregate/参照・全Asset/bytes・registry hashが不変、survivor geometry/evidence不変、変更が承認finite Partのarchive/deleteだけであることを証明する。最小offer表示はread projectionで行う。未解決群/登録未完了/校正未確認/実クラウド未検証を別々に明記する。

既存immutability契約を変える必要が判明した場合は本契約内で黙って緩めず、当該群をholdする。保留の存在を全件重複整理完了と表現しない。


