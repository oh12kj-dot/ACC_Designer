export interface ImportedPartCandidate {
  sourceUrl:string;
  fetchedAt:string;
  name?:string;
  sku?:string;
  unitPrice?:number;
  currency?:string;
  packageText?:string;
  dimensionsText?:string;
  imageUrls:string[];
  categoryHints:string[];
  rawFields:Record<string,unknown>;
  status:'success'|'partial'|'failed';
  errorCode?:string;
  parserVersion:string;
}
export interface SourceSnapshotInput {
  sourceUrl:string;fetchedAt:string;parserVersion:string;rawFields:Record<string,unknown>;
  status:ImportedPartCandidate['status'];errorCode?:string;
}
export function candidateSnapshot(candidate:ImportedPartCandidate):SourceSnapshotInput {
  return {sourceUrl:candidate.sourceUrl,fetchedAt:candidate.fetchedAt,parserVersion:candidate.parserVersion,rawFields:{...candidate.rawFields,candidate:{name:candidate.name,sku:candidate.sku,unitPrice:candidate.unitPrice,currency:candidate.currency,packageText:candidate.packageText,dimensionsText:candidate.dimensionsText,imageUrls:candidate.imageUrls,categoryHints:candidate.categoryHints}},status:candidate.status,errorCode:candidate.errorCode};
}
export function failedCandidate(sourceUrl:string,errorCode:string):ImportedPartCandidate {
  return{sourceUrl,fetchedAt:new Date().toISOString(),imageUrls:[],categoryHints:[],rawFields:{},status:'failed',errorCode,parserVersion:'kiwa-v1'};
}
