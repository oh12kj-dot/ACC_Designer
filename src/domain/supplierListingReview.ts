import type {Part} from '../types/domain';
export interface SupplierListingAssessment {
 version:1;recipe:'supplier-listing-drift-v1';status:'compared-unchanged'|'needs-review'|'unavailable'|'stale';
 binding:'verified'|'unavailable'|'stale';partId?:string;sourceDraftId:string;sourceUrl?:string;checkedAt?:string;
 codes:string[];bodyEffects?:('descriptive'|'formatting-only'|'composition-consumption'|'physical-form-fit'|'unresolved')[];
 observed?:{sku?:string;price?:string;option1?:string;option2?:string;available?:boolean|null};
 offer?:SupplierListingAssessment;
}
const blocking=new Set(['SKU_CHANGED','PRICE_CHANGED','PURCHASE_LABEL_CHANGED','SIZE_LABEL_CHANGED','CURRENT_PRODUCT_ENDPOINT_404','CURRENT_VARIANT_NOT_LISTED','CURRENT_FETCH_UNRESOLVED']);
const labels:Record<string,string>={SKU_CHANGED:'品番',PRICE_CHANGED:'価格',PURCHASE_LABEL_CHANGED:'入数・販売単位',SIZE_LABEL_CHANGED:'寸法表記',REFERENCE_IMAGE_NO_LONGER_IN_PRODUCT_GALLERY:'写真',REFERENCE_IMAGE_VERSION_CHANGED:'写真の版',PRODUCT_BODY_HTML_CHANGED:'商品説明',CURRENT_PRODUCT_ENDPOINT_404:'掲載先404',CURRENT_VARIANT_NOT_LISTED:'バリエーション未掲載',CURRENT_FETCH_UNRESOLVED:'取得未確認'};
export function listingAssessmentBlocked(a:SupplierListingAssessment|undefined):boolean {
 if(!a)return false;
 if(a.version!==1||a.recipe!=='supplier-listing-drift-v1'||a.binding!=='verified'||!['compared-unchanged','needs-review'].includes(a.status)||!Array.isArray(a.codes))return true;
 if(a.codes.some(c=>!labels[c]||blocking.has(c)))return true;
 if(a.codes.includes('PRODUCT_BODY_HTML_CHANGED')&&(!a.bodyEffects?.length||a.bodyEffects.some(e=>!['descriptive','formatting-only'].includes(e))))return true;
 return a.offer?listingAssessmentBlocked(a.offer):false;
}
type ListingPart=Pick<Part,'id'|'metadata'|'selectionReference'|'supplierListingReview'|'importSource'>;
export function partListingReview(part:ListingPart):SupplierListingAssessment|undefined {
 const a=part.supplierListingReview,source=part.metadata?.sourceDraftId;
 if(!a){if(!source?.startsWith('kiwa:')&&part.importSource!=='kiwa_url')return;return{version:1,recipe:'supplier-listing-drift-v1',status:'unavailable',binding:'unavailable',partId:part.id,sourceDraftId:source??'',codes:['CURRENT_FETCH_UNRESOLVED']};}
 if(a.partId!==part.id||a.sourceDraftId!==source||part.selectionReference&&a.offer?.sourceDraftId!==part.selectionReference.offerDraftId)return{...a,status:'stale',binding:'stale'};
 return a;
}
export function supplierPurchaseBlocked(part:ListingPart){return listingAssessmentBlocked(partListingReview(part));}
export function supplierListingNotice(part:ListingPart){
 const a=partListingReview(part);if(!a)return;
 if(a.binding!=='verified')return a.binding==='stale'?'掲載情報の照合が失効しています。現在の購入条件を確認してください。':'現在の掲載情報の照合結果がありません。購入条件は未確認です。';
 const flagged=a.status==='needs-review'||a.offer?.status==='needs-review';if(!flagged)return;
 const codes=[...new Set([...a.codes,...(a.offer?.codes??[])])];
 const detail=codes.includes('CURRENT_PRODUCT_ENDPOINT_404')?'確認時に掲載先が404を返しました。販売終了とは断定していません。':codes.includes('CURRENT_FETCH_UNRESOLVED')?'現在の掲載情報を取得できず未確認です。':`掲載情報が登録時から変わっています（${codes.map(c=>labels[c]??c).join('・')}）。`;
 return `${detail}${a.checkedAt?' 照合日 '+a.checkedAt.slice(0,10)+'。':''}${listingAssessmentBlocked(a)?' 現在の購入計算には使用しません。':' 登録時の条件による参考計算です。'} 実寸・外観・適合の確認とは別です。`;
}
