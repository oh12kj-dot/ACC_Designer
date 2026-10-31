import type {Design} from '../../types/aggregate';
export type DesignFilter='all'|Design['type'];
export type DesignSort='updated'|'name';
export function findDesigns(designs:Design[],query:string,type:DesignFilter,sort:DesignSort){
 const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('ja').trim();
 const words=normalize(query).split(/\s+/).filter(Boolean);
 return designs.filter(d=>(type==='all'||d.type===type)&&words.every(word=>normalize(d.name).includes(word))).sort((a,b)=>{
  const compared=sort==='name'?a.name.localeCompare(b.name,'ja'):(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0);
  return compared||a.id.localeCompare(b.id);
 });
}
