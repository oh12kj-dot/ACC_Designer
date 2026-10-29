import {test} from 'node:test';import assert from 'node:assert/strict';
import {categoryBoxImageKey} from './prepare-category-box.mjs';
import {czechCropImageKey} from './prepare-czech-crop.mjs';
const spec={recipe:'kiwa-own-photo-category-box-v1',widthMm:8,heightMm:12,family:'own',photoPose:'upright',photoRotationDegrees:0,photoOrientationReview:{version:'reviewed-category-photo-pose-v1',rotationDegrees:0,reason:'own source reviewed'},sourceCrop:{url:'own',crop:{left:0,top:0,width:100,height:100},reviewedBy:'root',reviewedAt:'today'}};
test('category cache stays separate and binds review crop pose and dimensions',()=>{
 const key=categoryBoxImageKey('hash',spec);assert.notEqual(key,czechCropImageKey('hash',spec));
 for(const other of [{...spec,widthMm:9},{...spec,family:'other'},{...spec,sourceCrop:{...spec.sourceCrop,reviewedAt:'later'}},{...spec,photoOrientationReview:{...spec.photoOrientationReview,reason:'other reason'}},{...spec,photoPose:'other pose'}])assert.notEqual(key,categoryBoxImageKey('hash',other));
});
test('missing or mismatched explicit pose cannot prepare a category photo',()=>{
 for(const other of [{...spec,photoRotationDegrees:90},{...spec,photoOrientationReview:null},{...spec,photoPose:''},{...spec,sourceCrop:{...spec.sourceCrop,url:''}}])assert.throws(()=>categoryBoxImageKey('hash',other),/CATEGORY_PHOTO_REVIEW_INVALID/);
});
