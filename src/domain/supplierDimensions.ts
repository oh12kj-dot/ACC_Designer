import type {Part} from '../types/domain';
export function supplierDimensions(part:Pick<Part,'metadata'|'sku'>){
 const r=part.metadata?.supplierDimensionReview;if(!r||r.sourceDraftId!==part.metadata?.sourceDraftId||r.sku!==part.sku||r.approximate!==true)return;
 const positive=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 if(r.recipe==='supplier-chain-width-reference-v1'&&positive(r.chainWidthMm))return{component:false,body:`仕入先公表寸法: チェーン幅約${r.chainWidthMm}mm`,note:'線材の線径・厚み・全長とは別の値です。写真の実寸尺度・コマの内径・接続適合は未確認です。'};
 if(r.recipe==='supplier-pipe-inner-width-reference-v1'&&positive(r.publishedInnerMm)&&positive(r.publishedWidthMm))return{component:true,body:`仕入先本文参考寸法: 掲載内径約${r.publishedInnerMm}mm×掲載幅約${r.publishedWidthMm}mm`,hole:`仕入先本文参考値: パイプ内側の掲載内径約${r.publishedInnerMm}mm（穴形状・実物寸法は未確認）`,note:'仕入先本文が内径×幅の順序を明記しています。幅を軸長や写真尺度へ換算していません。穴位置・接続適合は未確認です。'};
 if(r.recipe==='supplier-component-dimensions-reference-v1'&&['ワイヤー','フープ','ポスト','カラビナ','ブレスレット','リング','スティック'].includes(r.subject)&&positive(r.componentWireDiameterMm)&&(r.componentLengthMm===undefined||positive(r.componentLengthMm)))return{component:true,body:`仕入先公表の部分寸法: ${r.subject}の線径約${r.componentWireDiameterMm}mm${r.componentLengthMm?`・長さ約${r.componentLengthMm}mm`:''}`,note:'本体の外径・幅・高さや貫通穴径とは別の値です。接続位置・適合・写真尺度は未確認です。'};
}
