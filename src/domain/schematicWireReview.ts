type WireReviewPart={metadata?:{wirePathReview?:{recipe?:string;publishedDiameterMm?:number}}};
export function isSchematicWire(part:WireReviewPart){return part.metadata?.wirePathReview?.recipe==='supplier-gauge-schematic-wire-path-v1';}
export function schematicWireNotice(part:WireReviewPart){if(!isSchematicWire(part))return undefined;const d=part.metadata?.wirePathReview?.publishedDiameterMm;return `掲載概算線径${typeof d==='number'&&Number.isFinite(d)&&d>0?'約'+d+'mm':''}による模式線です。商品写真はスプールの参照写真です。線の色は中立色で、実物の仕上げを表しません。実際の太さ・仕上げ・曲げ方・穴への適合・端の処理は未確認です。`;}
