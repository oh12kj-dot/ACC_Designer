import{expect,it}from'vitest';import{mountingAssessment as assess}from'./mounting';import type{Part}from'../../types/domain';
const p={id:'p',geometryKind:'node',sourceUrl:'source',metadata:{sourceDraftId:'d'},throughHoles:[]}as unknown as Part;
const copper={...p,holeReference:{sourceDraftId:'d',sourceUrl:'source',descriptionSha256:'hash',minMm:.8,maxMm:.8,approximate:true,presence:'through',sizeText:'2mm',reviewedAt:'now'}}as Part;
it('permits unknown with warning; blocks only listed-size insufficiency and known no-hole in through mode',()=>{
 expect(assess(p,{mode:'through',diameter:'1'})).toMatchObject({blocked:false,warning:true});expect(assess(copper,{mode:'through',diameter:'.75'})).toMatchObject({blocked:false});expect(assess(copper,{mode:'through',diameter:'.8'}).blocked).toBe(true);
 for(const diameter of['','-1','NaN'])expect(assess(copper,{mode:'through',diameter}).blocked).toBe(false);
 const noHole={...p,imageAssetId:'asset',metadata:{...p.metadata,nominalPlacement:{photoSha256:'photo'},guideOrientation:{version:1,status:'no-through-hole',imageAssetId:'asset',sourceDraftId:'d',photoSha256:'photo',descriptionSha256:'hash',evidenceText:'none',reviewedAt:'now'}}}as Part;
 expect(assess(noHole,{mode:'through',diameter:'1'}).blocked).toBe(true);expect(assess(noHole,{mode:'glue',diameter:'1'})).toMatchObject({blocked:false,warning:true});expect(assess(noHole,{mode:'all',diameter:'1'}).blocked).toBe(false);
 expect(assess({...noHole,holeReference:copper.holeReference},{mode:'through',diameter:'.1'}).blocked).toBe(true);
});
it('keeps ambiguous ranges selectable, rejects stale bindings, and exempts material paths',()=>{
 const range={...copper,holeReference:{...copper.holeReference!,minMm:1.8,maxMm:2}};
 expect(assess(range,{mode:'through',diameter:'1.9'})).toMatchObject({blocked:false,warning:true});expect(assess(range,{mode:'through',diameter:'2.1'}).blocked).toBe(true);
 expect(assess({...copper,sourceUrl:'changed'},{mode:'through',diameter:'1'})).toMatchObject({blocked:false,warning:true});expect(assess({...copper,geometryKind:'path'},{mode:'through',diameter:'10'}).blocked).toBe(false);
 expect(p.throughHoles).toEqual([]);
});
