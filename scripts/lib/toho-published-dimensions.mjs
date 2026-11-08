import assert from'node:assert/strict';import{sha256}from'../minimum-sale-units.mjs';
export const tohoDimensionsRecipe='toho-published-reference-dimensions-v1';
export function tohoPublishedDimensions(d){
 const name=d.name.normalize('NFKC'),size=d.sizeText.normalize('NFKC').trim(),body=d.description.normalize('NFKC'),m=name.match(/^TOHO\s*(丸小ビーズ|特小ビーズ|丸大ビーズ|特大ビーズ|竹ビーズ)/);if(!m)return;
 if(m[1]==='丸小ビーズ'&&size==='約2mm'&&/^(?:外)?径約2\.0[－−–~〜～-]2\.2mm/.test(body))return{family:'TOHO Round 11/0',outsideDiameterMm:2.2,outsideDiameterRangeMm:{min:2,max:2.2}};
 if(m[1]==='特小ビーズ'&&size==='約1.5mm'&&body.startsWith('外径約1.5mm'))return{family:'TOHO Round 15/0',outsideDiameterMm:1.5};
 if(m[1]==='丸大ビーズ'&&['3mm','-'].includes(size)&&body.startsWith('外径約3mm、穴のサイズは約1mmです。'))return{family:'TOHO Round 8/0',outsideDiameterMm:3,holeDiameterMm:{min:1,max:1},holeEvidenceKind:'supplier-product-description'};
 if(m[1]==='特大ビーズ'&&size==='5.5mm'&&body.startsWith('外径約5.5mm'))return{family:'TOHO Round 3/0',outsideDiameterMm:5.5};
 if(m[1]==='竹ビーズ'&&body.startsWith('竹のように細長い形をしています。')){const mm={'一分竹(3mm)':3,'二分竹(6mm)':6}[size];if(mm)return{family:'TOHO Bugle',axialLengthMm:mm};}
}
export function tohoDimensionPayload(d,a,refs,chartReview,at){
 const values=tohoPublishedDimensions(d);assert.ok(values,'SOURCE_DIMENSION_MEANING_NOT_SUPPORTED');assert.equal(a.part.metadata.sourceDraftId,d.id);assert.equal(a.part.sku,d.sku);assert.ok(a.part.outer_diameter_mm===null||a.part.outer_diameter_mm===values.outsideDiameterMm);assert.equal(a.part.hole_diameter_mm,null);assert.deepEqual(a.through_holes,[]);assert.deepEqual(a.connection_points,[]);assert.ok(refs.some(r=>r.file==='shape-chart.pdf'&&r.sha256===chartReview.pdfSha256));
 const review={version:1,recipe:tohoDimensionsRecipe,sourceDraftId:d.id,productId:d.productId,variantId:d.variantId,sku:d.sku,sourceObjectSha256:sha256(JSON.stringify(d)),manufacturer:'TOHO',...values,approximate:true,scope:'manufacturer-and-supplier-published-reference',individualMeasurementVerified:false,functionalConnectionReady:false,supplierEvidence:{url:d.sourceUrl,descriptionSha256:sha256(d.description),sourceFetchedAt:d.sourceFetchedAt},chartReview,evidenceReferences:refs,reviewedAt:at};
 const measures=[values.outsideDiameterRangeMm?`外径約${values.outsideDiameterRangeMm.min}〜${values.outsideDiameterRangeMm.max}mm`:values.outsideDiameterMm?`外径約${values.outsideDiameterMm}mm`:null,values.axialLengthMm?`軸方向長さ約${values.axialLengthMm}mm`:null,values.holeDiameterMm?'穴径約1mm（当該仕入先本文）':null].filter(Boolean).join('・');
 return{part:{...(values.outsideDiameterMm?{outer_diameter_mm:values.outsideDiameterMm}:{}),metadata:{...a.part.metadata,manufacturerDimensionReview:review},notes:[a.part.notes,`TOHO掲載参考寸法: ${measures}。加工・ロット差を含む参考値で、写真の実寸尺度や穴位置・適合を確認した数値ではありません。`].filter(Boolean).join('\n')},source_snapshots:[{source_url:refs.find(r=>r.file==='shape-chart.pdf').url,fetched_at:at,parser_version:tohoDimensionsRecipe,raw_fields:{manufacturerDimensionReview:review},status:'partial'}]};
}
