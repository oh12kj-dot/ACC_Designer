import {it,expect} from 'vitest';
import {crystalDiagramRange} from './crystalDiagramMapping';
const recipe={productIds:['1'],sha256:'hash',ranges:{PP11:[1.7,1.8]}};
const input={productId:'1',variantId:'2',sku:'3',sizeText:'PP11',variant:{id:'2',sku:'3',sizeText:'PP11'},galleryUrls:['https://cdn.shopify.com/a'],captures:[{url:'https://cdn.shopify.com/a',sha256:'hash',productIds:['1'],fetchedAt:'2026-10-07',finalUrl:'https://cdn.shopify.com/a'}]};
it('preserves the full approximate interval without a midpoint or scale',()=>{const r=crystalDiagramRange(input,recipe);expect(r?.diameterRangeMm).toEqual({min:1.7,max:1.8,approximate:true});expect(r).not.toHaveProperty('mmPerPx');});
it('rejects neighbouring tokens and unrelated identities or images',()=>{for(const patch of [{sizeText:'PP10'},{sizeText:'SS11'},{sku:'other'},{variantId:'other'},{productId:'other'},{galleryUrls:[]},{captures:[]}])expect(crystalDiagramRange({...input,...patch},recipe)).toBeUndefined();});
