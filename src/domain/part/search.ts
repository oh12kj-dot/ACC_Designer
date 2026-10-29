export interface SearchablePart {
 id:string;name:string;category:string;geometry_kind:string;sku?:string;source_name?:string;material?:string;color?:string;tags:string[];
 width_mm:number|null;height_mm:number|null;wire_diameter_mm:number|null;unitPrice?:number|null;favorite?:boolean;lastUsedAt?:string;
}
export interface PartFilters {query:string;category:string;material:string;color:string;source:string;favorite:boolean;recent:boolean;sizeField:'width_mm'|'height_mm'|'wire_diameter_mm';minimumSize?:number;maximumSize?:number;minimumPrice?:number;maximumPrice?:number}
export function filterParts<T extends SearchablePart>(parts:T[],filters:PartFilters):T[]{
 for(const [min,max] of [[filters.minimumSize,filters.maximumSize],[filters.minimumPrice,filters.maximumPrice]]){if([min,max].some(n=>n!==undefined&&(!Number.isFinite(n)||n<0))||(min!==undefined&&max!==undefined&&min>max))throw new Error('検索範囲は0以上の数値で、下限以下にならない上限を指定してください');}
 const query=filters.query.trim().toLocaleLowerCase('ja-JP');const range=(value:number|null|undefined,min?:number,max?:number)=>(min===undefined&&max===undefined)||(value!==null&&value!==undefined&&Number.isFinite(Number(value))&&(min===undefined||Number(value)>=min)&&(max===undefined||Number(value)<=max));
 return parts.filter(p=>(!filters.favorite||p.favorite)&&(!filters.recent||p.lastUsedAt)&&(!filters.category||p.category===filters.category)&&(!filters.material||p.material===filters.material)&&(!filters.color||p.color===filters.color)&&(!filters.source||p.source_name===filters.source)&&(!query||[p.name,p.sku,p.source_name,p.material,p.color,...p.tags].some(value=>value?.toLocaleLowerCase('ja-JP').includes(query)))&&range(p[filters.sizeField],filters.minimumSize,filters.maximumSize)&&range(p.unitPrice,filters.minimumPrice,filters.maximumPrice)).sort((a,b)=>filters.recent?(b.lastUsedAt??'').localeCompare(a.lastUsedAt??''):0);
}
