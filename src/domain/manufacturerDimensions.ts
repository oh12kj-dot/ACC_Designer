import type{Part}from'../types/domain';
export function manufacturerDimensions(part:Pick<Part,'metadata'>){
 const r=part.metadata?.manufacturerDimensionReview;if(!r||!['miyuki-dp-dbc-family-reference-v1','miyuki-db11-family-reference-dimensions-v1','toho-published-reference-dimensions-v1','shindo-sic109-width-reference-v1'].includes(r.recipe)||r.sourceDraftId!==part.metadata?.sourceDraftId||r.approximate!==true)return;
 const positive=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const range=r.outsideDiameterRangeMm,bodyValues:string[]=[];
 if(range&&positive(range.min)&&positive(range.max)&&range.min<=range.max)bodyValues.push(`外径約${range.min}〜${range.max}mm`);
 else if(positive(r.outsideDiameterMm))bodyValues.push(`外径約${r.outsideDiameterMm}mm`);
 if(positive(r.flatWidthMm))bodyValues.push(`リボン幅約${r.flatWidthMm}mm`);
 if(positive(r.axialLengthMm))bodyValues.push(`軸方向長さ約${r.axialLengthMm}mm`);if(!bodyValues.length)return;
 const h=r.holeDiameterMm,hole=h&&positive(h.min)&&positive(h.max)&&h.min<=h.max?`${r.holeEvidenceKind==='supplier-product-description'?'仕入先本文参考値':'メーカー系列参考値'}: 穴径約${h.min===h.max?h.min:h.min+'〜'+h.max}mm（加工・ロット差あり）`:undefined;
 return{body:'メーカー系列参考値: '+bodyValues.join('・'),hole,note:`${r.family??'MIYUKI DB 11/0'} の公表参考値です。${r.legacyIdentity?`旧品番${r.legacyIdentity.code}を保持し、切替先${r.legacyIdentity.currentReplacementCode}へ置換していません。`:''}個体の穴位置・適合や、商品写真の実寸尺度を確認した値ではありません。`,references:r.evidenceReferences};
}
