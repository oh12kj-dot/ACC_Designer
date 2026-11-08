import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sha256 } from './minimum-sale-units.mjs';
const dir = '.local/setup/all-parts-review-20261106/current-supplier';
const groupsBytes = await readFile(dir + '/body-semantic-groups.json');
const groups = JSON.parse(groupsBytes);
assert.equal(groups.length, 49);
const categories = new Map();
const assign = (ids, kind, impact, judgment) => { for (const i of ids) { assert.ok(!categories.has(i)); categories.set(i, { kind, impact, judgment }); } };
assign([0], 'published-hole-presence-clarification', ['connection'], '両穴の明記が追加。穴径・位置・適合・サイズ別の実測は確定しない。');
assign([1,4], 'distribution-note-removal', ['availability'], '店舗・オンライン限定の注記削除。商品本体の寸法変更とは判定しない。');
assign([2,3,28,32,33,34,35,38,40,41,47,48], 'supplier-specification-or-appearance-change', ['identity','image','dimensions','connection'], '仕入先・形状・厚み・穴・色等の仕様変更または順次切替の告知。保存済み写真と旧仕様を現行品へ自動適用しない。');
assign([5,6,7,8], 'finish-or-material-description-change', ['identity','appearance'], '表面仕上げ・素材・フォイル等の説明変更。旧色と現行品の同一性を自動確定しない。');
assign([9,10,11,12,13,14,15,16,17,18,19,20,21,23,24,29,30,31], 'manufacturing-variation-caution', ['appearance'], '気泡・傷・色混在・形状個体差等の注意追加。購入数量や寸法を新しく推定しない。');
assign([22], 'material-or-luminescence-claim-removed', ['material','appearance'], '発光性等の説明削除と個体差注意の追加。旧説明の性質を現行品について保証しない。');
assign([25,26], 'manufacturing-method-description-correction', ['identity','appearance'], 'プレス成型からファイヤーポリッシュの説明へ訂正。写真や実寸の再確認なしに品質判定へ転用しない。');
assign([27], 'threading-use-clarification', ['connection'], 'ピン・テグスを通す用途の説明追加。測定した穴径・位置・適合ではない。');
assign([36], 'ring-size-state-and-adjustment-clarification', ['dimensions','fit'], '11号が閉じた状態で個体差約2mmとの明記。配置寸法や製作適合を固定値として保証しない。');
assign([37,39,44,45,46], 'set-component-count-change', ['purchase','consumption'], 'セット構成数に変更。旧セット定義を現在の構成数と見なした必要量・購入見積りを確定しない。');
assign([42], 'product-name-change', ['identity'], '小サイズの商品名変更告知。旧品番から新名称への同一性は別確認。');
assign([43], 'price-change-notice', ['purchase'], '価格変更の告知。保存時価格と現在価格を別扱いにする。');
assert.equal(categories.size, groups.length);
const at = new Date().toISOString();
const rows = groups.map((g, i) => ({ group: i, productIds: g.products, partCount: g.parts,
  oldVisibleTextSha256: sha256(g.old), currentVisibleTextSha256: sha256(g.new),
  review: categories.get(i), reviewer: 'root-source-text-comparison', reviewedAt: at,
  visualReview: false, physicalVerification: false, domainUpdated: false }));
const summary = { at, reviewedGroups: rows.length, reviewedProducts: rows.reduce((n,r) => n+r.productIds.length,0),
  affectedParts: rows.reduce((n,r) => n+r.partCount,0), inputSha256: sha256(groupsBytes),
  domainWrites: 0, newPhysicalOrConnectionAssertions: 0 };
await writeFile(dir + '/body-semantic-review.json', JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
