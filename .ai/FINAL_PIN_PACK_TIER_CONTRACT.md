# 残8 sourceの掲載販売クラスによる有限登録

ユーザーの「最後まで登録」の指示に基づく4商品/4group/8 variant/SKUのみの拡張。正本 `.local/setup/final-pin-pack-tiers-20261105/` の原資料・live HTML/JSON9 capture/hash・exact SKU/size/非購入optionを固定する。

仕入先の[通常袋と大容量袋の説明](https://kiwaseisakujo.jp/blogs/s_tokusyu/otoku)と各own商品ページの10本/50g(中袋)表記により、通常販売袋を明示的中袋より優先する掲載販売クラスとして10本をcanonicalにする。単位はpublished-pack-tier、序数1/2のみ。amountKnown=false、guaranteedPhysicalQuantityComparison=false。質量からの本数、他色由来の数量、価格による換算、10袋相当等の倍率は採用しない。物理的な最少本数を実証したとは扱わない。Sol Mediumを明示して有限判断を依頼し、条件付き契約を採用（actual runtime model情報なし）。

4 canonical Partを各商品固有のown原写真でneeds_review/未校正としてnormal RPC保存。8 sourceは4 Partへ対応させ、全offer原文/価格/在庫/採取時刻を保持。purchase_spec/pack_quantity/単価換算なし。10mm枠は技術上の表示枠、65mmは公開サイズ原文。注記とmetadataに販売クラスのみの判断、本数重量対応と実入り数未確認を明示する。

変更は固定4policy groupのみ。全他group/source partition/cleanup/旧行/Asset/Design/registry/catalog/hold/negative保持。元方針のholdを数合わせで解除せず、新しい仕入先根拠をresolutionへ結合する。既存Part混在、identity/size/option/SKU/原文/hash不一致、対象外/片方欠落は拒否。中袋の直接登録拒否を実APIで維持し、最後のholdがなくなるケースとhold拒否回帰は分ける。実保存/全member対応/4画像API/hash/購入null/未校正を読戻し後のみpendingを減らす。正式rerun created0、全工程精査とは区別する。
