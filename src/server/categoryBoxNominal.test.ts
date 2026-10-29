import {it,expect} from 'vitest';
import {nominalCategoryBox,type CategoryBoxRule,type CategoryBoxReview} from './categoryBoxNominal';
import type {RegisteredPartDraft} from '../types/registeredPart';
const draft={id:'d',productId:'p',name:'チャーム メタルボール 金 / 約H12×W8mm',category:'charm',description:'カンが付いた丸玉のメタルチャームです。本文',tags:['チャーム'],sizeText:'約H12×W8mm',imageUrls:['own']} as RegisteredPartDraft;
const rule:CategoryBoxRule={draftId:'d',productId:'p',name:draft.name,family:'チャーム メタルボール',tag:'チャーム',description:draft.description,bodyPrefix:'カンが付いた丸玉のメタルチャームです。',bodyReviewed:true,category:'charm',labelKind:'published-H-W-pair'};
const review:CategoryBoxReview={family:rule.family,reviewed:true,url:'own',sha256:'hash',sourceWidth:100,sourceHeight:100,crop:{left:0,top:0,width:100,height:100},reviewedBy:'reviewer',reviewedAt:'2026-10-10',photoPose:'upright',coordinateConvention:'unrotated-decoded-raster-integer-pixels',rotationDegrees:0,rotationReason:'Visible own photo pose'};
const capture={sha256:'hash',productIds:['p']};
it('keeps labeled axes as a provisional BOX with category and source order',()=>{
 const result=nominalCategoryBox(draft,rule,review,capture)!;
 expect(result).toMatchObject({category:'charm',widthMm:8,heightMm:12,publishedSizeValuesMm:[12,8],physicalWidthVerified:false,sizeAxisInterpretationVerified:false});expect(result).not.toHaveProperty('diameterMm');
 expect(nominalCategoryBox({...draft,sizeText:'W8×H12mm'},{...rule,labelKind:'published-W-H-pair'},review,capture)).toMatchObject({widthMm:8,heightMm:12});
});
it('rejects mismatched own identity BODY category source and unreviewed photos',()=>{
 for(const altered of [{...draft,id:'other'},{...draft,productId:'other'},{...draft,name:draft.name+'別'},{...draft,description:'適合寸法'+draft.description},{...draft,category:'gem' as const},{...draft,tags:[]}])expect(nominalCategoryBox(altered,rule,review,capture)).toBeUndefined();
 expect(nominalCategoryBox(draft,{...rule,bodyReviewed:false},review,capture)).toBeUndefined();
 for(const altered of [{...review,reviewed:false},{...review,url:'related'},{...review,sha256:'other'},{...review,rotationReason:''},{...review,photoPose:''}])expect(nominalCategoryBox(draft,rule,altered,capture)).toBeUndefined();
 expect(nominalCategoryBox(draft,rule,review,{...capture,productIds:['related']})).toBeUndefined();
});
it('rejects ambiguous, selling and out-of-bound labels while accepting the grid boundary',()=>{
 for(const sizeText of ['H12×8mm','H12×W8×3mm','H12xW8mm','H12×W8','H41×W8mm','H0×W8mm','H12.01×W8mm','適合H12×W8mm','H12×W8mm/1m'])expect(nominalCategoryBox({...draft,sizeText},rule,review,capture)).toBeUndefined();
 expect(nominalCategoryBox({...draft,sizeText:'H40×W0.025mm'},rule,review,capture)).toMatchObject({widthMm:0.025,heightMm:40});
 expect(nominalCategoryBox({...draft,sizeText:'12×8mm'},{...rule,labelKind:'unlabeled-pair'},review,capture)).toMatchObject({widthMm:12,heightMm:8});
 expect(nominalCategoryBox({...draft,sizeText:'8mm'},{...rule,labelKind:'scalar'},review,capture)).toMatchObject({widthMm:8,heightMm:8});
 expect(nominalCategoryBox({...draft,category:'other'},{...rule,category:'other'},review,capture)).toBeUndefined();
});
