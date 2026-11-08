import{describe,it,expect}from'vitest';
import{nominalLayoutNotice,nominalBodyPairNotice,nominalBodySizeNotice}from'./nominalNotice';
describe('finite T pin notice',()=>{
 const n={recipe:'nominal-t-pin-reviewed-single-photo-v1',layoutSizeChoice:'published-body-size-pair-box-for-layout-only',widthMm:1.3,heightMm:75,wireDiameterMm:0.5};
 it('separates head diameter, total length and wire with unverified appearance',()=>{const s=nominalLayoutNotice({nominalPlacement:n});expect(s).toContain('頭部目安径約1.3mm');expect(s).toContain('全長75mm');expect(s).toContain('線径0.5mm');expect(s).toContain('曲げ後');expect(s).toContain('未確認');});
 it('rejects invalid or outside finite display bounds',()=>{for(const patch of [{widthMm:0},{heightMm:76},{wireDiameterMm:Infinity}])expect(nominalLayoutNotice({nominalPlacement:{...n,...patch}})).toBeUndefined();});
});
describe('reviewed single product photo in published BODY frame',()=>{
 const n={recipe:'published-body-single-product-photo-finite-v1',layoutSizeChoice:'published-body-frame-representative-photo-only',widthMm:3,heightMm:4,representativePhoto:true,imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false};
 it('distinguishes representative proportions and nominal dimensions from physical calibration',()=>{const text=nominalLayoutNotice({nominalPlacement:n});expect(text).toContain('幅3mm・高さ4mm');expect(text).toContain('同一商品の代表写真');expect(text).toContain('線径との比率');expect(text).toContain('実寸・穴接続は未確認');expect(nominalLayoutNotice({nominalPlacement:{...n,approximate:true}})).toContain('幅約3mm');});
 it('rejects invalid bounds and false claims of image verification',()=>{for(const patch of [{widthMm:0},{heightMm:41},{imageScaleVerified:true},{representativePhoto:false}])expect(nominalLayoutNotice({nominalPlacement:{...n,...patch}})).toBeUndefined();});
});
describe('finite natural stone uncertainty notice',()=>{
 const n={recipe:'kiwa-own-photo-natural-stone-body-finite-v1',layoutSizeChoice:'published-H-W-range-axis-midpoints-for-layout-only',publishedSizeLabel:'約H9-13×W5-9mm',publishedBodyRanges:{heightMm:[9,13],widthMm:[5,9]},widthMm:7,heightMm:11};
 it('exposes raw range and actual frame with natural variation on shared picker/editor notice path',()=>{const s=nominalLayoutNotice({nominalPlacement:n});expect(s).toContain('約H9-13×W5-9mm');expect(s).toContain('幅7mm・高さ11mm');expect(s).toContain('算術中点');expect(s).toContain('天然石の個体差');expect(s).toContain('未確認');expect(s).not.toContain('正方形');});
 it('facet scalar never claims a midpoint or verified diameter',()=>{const s=nominalLayoutNotice({nominalPlacement:{...n,publishedSizeLabel:'約4mm(32面カット)',widthMm:4,heightMm:4,publishedBodyRanges:null}});expect(s).not.toContain('算術中点');expect(s).not.toContain('直径');expect(s).toContain('約4mm(32面カット)');});
 it('refuses missing labels and invalid dimensions and preserves old notices',()=>{for(const patch of [{publishedSizeLabel:''},{widthMm:0},{heightMm:Infinity}])expect(nominalLayoutNotice({nominalPlacement:{...n,...patch}})).toBeUndefined();expect(nominalLayoutNotice({nominalPlacement:{layoutSizeChoice:'published-body-size-pair-box-for-layout-only'}})).toBe(nominalBodyPairNotice);expect(nominalLayoutNotice({nominalPlacement:{layoutSizeChoice:'published-body-size-square-box-for-layout-only'}})).toBe(nominalBodySizeNotice);});
});
