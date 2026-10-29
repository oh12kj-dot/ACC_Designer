import {it,expect} from 'vitest';
import {sharedDiagramCapture} from './sharedDiagramMapping';
const capture={url:'https://cdn.shopify.com/own.jpg',sha256:'reviewed',productIds:['2'],fetchedAt:'2026-10-07',finalUrl:'https://cdn.shopify.com/own.jpg'};
const input={productId:'2',variantId:'20',sku:'002',sizeText:'0.5×2.5mm',variant:{id:'20',sku:'002',sizeText:'0.5×2.5mm'},galleryUrls:[capture.url],reviewedHash:'reviewed',reviewedSize:'0.5x2.5',captures:[capture]};
it('requires the identical reviewed bytes on this products own official gallery',()=>{expect(sharedDiagramCapture(input)).toEqual(capture);expect(sharedDiagramCapture({...input,productId:'3'})).toBeUndefined();expect(sharedDiagramCapture({...input,galleryUrls:['https://cdn.shopify.com/other.jpg']})).toBeUndefined();expect(sharedDiagramCapture({...input,reviewedHash:'different'})).toBeUndefined();});
it('keeps distinct variants and does not substitute neighbouring sizes or SKUs',()=>{expect(sharedDiagramCapture({...input,sizeText:'0.5×2.3mm'})).toBeUndefined();expect(sharedDiagramCapture({...input,sku:'003'})).toBeUndefined();expect(sharedDiagramCapture({...input,variantId:'21'})).toBeUndefined();});
