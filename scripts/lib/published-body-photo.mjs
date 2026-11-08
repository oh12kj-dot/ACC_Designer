import assert from'node:assert/strict';
export const bodyPhotoRecipe='published-body-single-product-photo-finite-v1';
export const bodyPhotoNotice='同一商品の代表写真を掲載寸法の仮配置枠で表示しています。サイズ別の形状・線径との比率・画像尺度・実寸・穴接続は未確認です。';
export function publishedBodyFrame(d,e){
 for(const[k,v]of Object.entries({sourceDraftId:d.id,variantId:d.variantId,sku:d.sku,sourceUrl:d.sourceUrl}))assert.equal(e?.[k],v,'BODY_SOURCE_BINDING');
 let widthMm,heightMm,approximate=false;
 if(['official-shared-diagram-dimensions-only','official-stainless-ring-dimensions-only'].includes(e.kind)){
  assert.equal(d.category,'jump_ring');widthMm=heightMm=e.outerDiameterMm;
 }else if(e.kind==='official-oval-diagram-dimensions-only'){
  assert.equal(d.category,'jump_ring');widthMm=e.outerWidthMm;heightMm=e.outerHeightMm;
 }else if(e.kind==='official-clasp-number-approximate-only'){
  assert.equal(d.category,'clasp');widthMm=e.approximateWidthMm;heightMm=e.approximateHeightMm;approximate=true;
 }else throw Error('BODY_DIMENSION_KIND_REJECTED');
 assert.ok([widthMm,heightMm].every(x=>Number.isFinite(x)&&x>0&&x<=40&&Math.abs(x*40-Math.round(x*40))<1e-6),'BODY_DIMENSION_RANGE');
 assert.ok(Math.max(widthMm/heightMm,heightMm/widthMm)<=4,'BODY_DIMENSION_RATIO');
 return{widthMm,heightMm,approximate,layoutSizeChoice:'published-body-frame-representative-photo-only'};
}
