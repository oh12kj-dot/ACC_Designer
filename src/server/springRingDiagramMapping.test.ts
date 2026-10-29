import {it,expect} from 'vitest';import {springRingDiagram} from './springRingDiagramMapping';
const recipe={productIds:['1'],sha256:'h',diametersMm:[5,18]};const input={productId:'1',variantId:'2',sku:'3',sizeText:'約18mm',variant:{id:'2',sku:'3',sizeText:'約18mm'},galleryUrls:['url'],captures:[{url:'url',sha256:'h',productIds:['1'],fetchedAt:'today',finalUrl:'url'}]};
it('preserves approximate diameter without hole or scale claims',()=>{expect(springRingDiagram(input,recipe)).toMatchObject({mainRingDiameterMm:18,approximate:true});expect(springRingDiagram(input,recipe)).not.toHaveProperty('connectionPoints');});
it('rejects changed approximation, accessory size and foreign evidence',()=>{for(const patch of [{sizeText:'18mm'},{sizeText:'丸玉18mm'},{sku:'other'},{galleryUrls:[]},{captures:[]}])expect(springRingDiagram({...input,...patch},recipe)).toBeUndefined();});

it('keeps a nominal variant label separate from an approximate diagram',()=>{const nominal={...input,sizeText:'18mm',variant:{...input.variant,sizeText:'18mm'}};expect(springRingDiagram(nominal,{...recipe,diagramApproximate:true})).toMatchObject({mainRingDiameterMm:18,approximate:false,diagramApproximate:true});});
