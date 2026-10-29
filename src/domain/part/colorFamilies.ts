/** Search-only families inferred from published names; never stored as product colour data. */
export const colorFamilies=[
 ['clear','白・クリア系'],['red','赤・ピンク系'],['orange','黄・オレンジ系'],
 ['green','緑系'],['blue','青系'],['purple','紫系'],['brown','茶・ベージュ系'],
 ['dark','黒・グレー系'],['gold','ゴールド・金古美系'],['silver','シルバー・銀古美系'],
 ['multi','ミックス・多色'],['other','その他の色名'],['unspecified','色の記載なし'],
] as const;
export type ColorFamily=typeof colorFamilies[number][0];
const rules:readonly [ColorFamily,RegExp][]=[
 ['dark',/ブラック|黒|グレ[ーイ]|灰|ジェット|ヘマタイト|ガンメタ|モリオン/],
 ['brown',/ブラウン|茶|ベージュ|ブロンズ|チョコレート|スモーキ|スモークトパーズ|スモークドトパーズ|コロラドトパーズ|モカ|カーキ|コーヒー|べっ甲|ベッコウ/],
 ['purple',/パープル|紫|アメジスト|ラベンダー|バイオレット|タンザナイト|ライラック|プラム/],
 ['blue',/ブル[ー－]|青|アクア|サファイ[アヤ]|ターコイズ|モンタナ|インディゴ|カプリ|デニム|ネイビー|紺/],
 ['green',/グリーン|緑|エメラルド|ペリドット|クリソライト|クリソプレーズ|オリーブ|ミント|ジェイド|マラカイト|ライム/],
 ['red',/レッド|赤|ピンク|ローズ|シャム|ルビー|ルビ[ーイ]|ガーネット|フューシャ|フクシア|スカーレット|コーラル|サンゴ|珊瑚|マゼンタ/],
 ['orange',/イエロー|黄|オレンジ|トパーズ|シトリン|ジョンキル|サンフラワー|アンバー|アプリコット|ピーチ/],
 ['clear',/ホワイト|白|クリーム|アイボリー|キスカ|乳/],
];
export function pickerColorFamilies(color:string):ColorFamily[]{
 const value=color.normalize('NFKC').trim();
 if(!value)return ['unspecified'];
 // Metal finishes are whole colour labels. A stone called "クリスタルゴールド" is not metal.
 if(/^(?:金古美|アンティークゴールド)(?:\(.*\))?$/.test(value)||/^(?:マット|ピンク|ホワイト|イエロー|ライト|シャンパン)?ゴールド(?:\(.*\))?$/.test(value)||value==='金色')return ['gold'];
 if(/^(?:銀古美|アンティークシルバー|ロジウムカラー|(?:マット|ホワイト)?シルバー)(?:\(.*\))?$/.test(value)||value==='銀色')return ['silver'];
 if(/ミックス|mix|マルチ|レインボー|虹/i.test(value))return ['multi'];
 const matches=rules.filter(([,pattern])=>pattern.test(value)).map(([id])=>id);
 // Brown topaz labels are not also yellow simply because they contain "トパーズ".
 const result=matches.filter(id=>!(id==='orange'&&matches.includes('brown')&&!/イエロー|黄|オレンジ/.test(value)));
 // Transparency does not cancel a visible hue: clear blue belongs to blue only.
 const hues=result.filter(id=>id!=='clear');
 if(hues.length)return hues;
 if(result.includes('clear'))return ['clear'];
 // Unknown suffixes after 'clear' are not evidence of a near-colourless part.
 if(/^(?:(?:スノー|マット|フロスト)?(?:クリア|透明|無色)(?:AB)?)(?:\/(?:ホワイト|白))?$/.test(value)||/^クリスタル(?:AB)?$/.test(value))return ['clear'];
 return ['other'];
}
