export interface GalleryRecord {sha256:string;url:string;productIds:string[];pixelWidth:number;pixelHeight:number}
export function groupGalleryRecords(records:GalleryRecord[]){
 const grouped=new Map<string,GalleryRecord&{urls:string[]}>();
 for(const record of records){const prior=grouped.get(record.sha256);if(prior){if(prior.pixelWidth!==record.pixelWidth||prior.pixelHeight!==record.pixelHeight)throw new Error('IMAGE_HASH_DIMENSION_CONFLICT');prior.productIds=[...new Set([...prior.productIds,...record.productIds])].sort();prior.urls=[...new Set([...prior.urls,record.url])].sort();}else grouped.set(record.sha256,{...record,productIds:[...new Set(record.productIds)].sort(),urls:[record.url]});}
 return[...grouped.values()];
}
/** OCR proposes an edge only. Nearby dimensions, confidence and matching size do not certify it. */
export function ocrContainsVariantSize(ocrText:string,sizeText:string){
 const normalized=ocrText.normalize('NFKC').replace(/\s+/g,'').replace(/[×✕]/g,'x');
 const size=sizeText.normalize('NFKC').replace(/\s+/g,'').replace(/[×✕]/g,'x');
 const key=size.match(/^(?:約)?(\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?){0,2}mm)(?:\((?:洋白|鉄)\))?$/)?.[1];if(!key)return false;
 const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?:^|[^0-9.])'+escaped+'(?:$|[^a-zA-Z0-9.])').test(normalized);
}
