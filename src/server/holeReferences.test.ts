import{expect,it}from'vitest';import{readFileSync}from'node:fs';import{reviewedHoleIndex,projectHoleReference}from'./holeReferences';import manifest from'../data/kiwa-reviewed-hole-diameters.json';
it('binds each of the finite source statements to its own variant, text, size and original Part',()=>{
 const registry=JSON.parse(readFileSync('.local/parts/parts.json','utf8')).parts,index=reviewedHoleIndex(registry,manifest.registrySha256);expect(index.size).toBe(24);
 const e=manifest.entries[0],part={id:e.partId,name:e.partName,source_url:e.sourceUrl,metadata:{sourceDraftId:e.sourceDraftId}};
 expect(projectHoleReference(part,index)).toMatchObject({minMm:e.minMm,maxMm:e.maxMm,presence:'through'});expect(projectHoleReference({...part,id:'other'},index)).toBeUndefined();expect(projectHoleReference({...part,name:'other size'},index)).toBeUndefined();expect(reviewedHoleIndex(registry,'changed').size).toBe(0);
 const changed=registry.map((d:any)=>d.id===e.sourceDraftId?{...d,description:d.description+'changed'}:d);expect(reviewedHoleIndex(changed,manifest.registrySha256).has(e.sourceDraftId)).toBe(false);
});
