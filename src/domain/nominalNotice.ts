export const nominalBodySizeNotice='掲載サイズを正方形の暫定配置枠に使用しています。実際の幅・高さと、サイズが表す軸は未確認です。';
export const nominalBodyPairNotice='掲載サイズ2値を暫定配置枠に使用しています。実際の幅・高さと、掲載値が表す軸・写真との対応は未確認です。';
export function nominalLayoutNotice(metadata:Record<string,unknown>|undefined){
 const n=metadata?.nominalPlacement;
 if(!n||typeof n!=='object'||!('layoutSizeChoice' in n))return undefined;
 const natural=n as Record<string,unknown>;
 if(natural.recipe==='nominal-t-pin-reviewed-single-photo-v1'){
  if(![natural.widthMm,natural.heightMm,natural.wireDiameterMm].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0)||Number(natural.widthMm)>2.2||Number(natural.heightMm)>75)return undefined;
  return `掲載値の頭部目安径約${natural.widthMm}mm×全長${natural.heightMm}mmで一本のTピンの仮配置枠を置いています。線径${natural.wireDiameterMm}mmは軸の太さです。写真は一本を切り出した形状参考で、サイズ別の長さ・実寸・画像尺度・曲げ後の形状・接続位置は未確認です。`;
 }
 if(natural.recipe==='kiwa-own-photo-natural-stone-body-finite-v1'){
  if(typeof natural.publishedSizeLabel!=='string'||!natural.publishedSizeLabel.trim()||![natural.widthMm,natural.heightMm].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0&&x<=40))return undefined;
  return `掲載概寸「${natural.publishedSizeLabel}」から仮配置枠（幅${natural.widthMm}mm・高さ${natural.heightMm}mm）を選択しています。${natural.publishedBodyRanges?'範囲は各軸の算術中点を配置の目安にしたもので、同じ個体で同時に成立する保証はありません。':''}天然石の個体差、実寸、掲載軸と写真の対応、画像尺度、サイズ別外観、穴径・接続位置は未確認です。`;
 }
 if(n.layoutSizeChoice==='published-H-W-range-axis-midpoints-for-layout-only'){
  const v=n as Record<string,unknown>,h=v.publishedBodyHeightRangeMm as {min:number;max:number}|undefined,w=v.publishedBodyWidthRangeMm as {min:number;max:number}|undefined;
  if(!h||!w||![h.min,h.max,w.min,w.max,v.widthMm,v.heightMm].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0)||h.min>h.max||w.min>w.max)return undefined;
  return `掲載の概寸範囲（H${h.min}〜${h.max}mm、W${w.min}〜${w.max}mm）の中点（幅${v.widthMm}mm・高さ${v.heightMm}mm）を暫定配置枠に使用しています。実寸・画像尺度・サイズ別の外観・掲載軸と写真の対応・穴径・接続位置は未確認です。`;
 }
 return n.layoutSizeChoice==='published-body-size-square-box-for-layout-only'?nominalBodySizeNotice:n.layoutSizeChoice==='published-body-size-pair-box-for-layout-only'?nominalBodyPairNotice:undefined;
}
