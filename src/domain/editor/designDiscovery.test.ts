import{it,expect}from'vitest';import{findDesigns}from'./designDiscovery';import type{Design}from'../../types/aggregate';
const item=(id:string,name:string,type:Design['type'],updatedAt:string)=>({id,name,type,updatedAt}as Design);
it('normalizes search, combines words and filters types without changing the source order',()=>{
 const list=[item('a','Ｐｅａｒｌ 白いネックレス','necklace','2026-01-01'),item('b','Pearl ピアス','earrings','2026-02-01')];
 expect(findDesigns(list,' pearl　白い ','necklace','updated').map(d=>d.id)).toEqual(['a']);expect(list.map(d=>d.id)).toEqual(['a','b']);expect(findDesigns(list,'見つからない','all','updated')).toEqual([]);
});
it('sorts dates and names deterministically, placing an unknown date last',()=>{
 const list=[item('b','B','necklace','invalid'),item('c','A','necklace','2026-02-01'),item('a','A','earrings','2026-02-01')];
 expect(findDesigns(list,'','all','updated').map(d=>d.id)).toEqual(['a','c','b']);expect(findDesigns(list,'','all','name').map(d=>d.id)).toEqual(['a','c','b']);
});
