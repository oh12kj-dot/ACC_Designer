import sharp from'sharp';import assert from'node:assert/strict';
export async function removeReviewedWhiteVoid(bytes,review){
 const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const [sx,sy]=review.seed;assert.ok(review.backgroundVoidReviewed===true&&review.reviewedBy&&review.reviewedAt);
 assert.ok(Number.isInteger(sx)&&Number.isInteger(sy)&&sx>0&&sy>0&&sx<info.width-1&&sy<info.height-1,'VOID_SEED_BOUNDS');
 const original=Buffer.from(data),seen=new Uint8Array(info.width*info.height),queue=new Int32Array(seen.length),mask=Buffer.alloc(seen.length*4);let head=0,tail=0;
 const visit=(x,y)=>{if(x<0||y<0||x>=info.width||y>=info.height)return;const p=y*info.width+x,i=p*4;if(seen[p])return;seen[p]=1;if(data[i+3]===255&&data[i]>=250&&data[i+1]>=250&&data[i+2]>=250){queue[tail++]=p;}};
 visit(sx,sy);assert.equal(tail,1,'VOID_SEED_NOT_OPAQUE_WHITE');let minX=info.width,minY=info.height,maxX=0,maxY=0;
 while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width),i=p*4;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);data[i+3]=0;mask[i]=255;mask[i+3]=150;visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}
 assert.ok(minX>0&&minY>0&&maxX<info.width-1&&maxY<info.height-1,'VOID_COMPONENT_REACHED_FRAME_EDGE');assert.ok(tail>10&&tail<info.width*info.height*.8,'VOID_COMPONENT_AREA');
 let differences=0;for(let i=0;i<data.length;i++){if(i%4!==3)assert.equal(data[i],original[i],'VOID_RGB_CHANGE');else if(data[i]!==original[i]){assert.equal(mask[i],150);assert.equal(data[i],0);differences++;}}
 assert.equal(differences,tail);const high=await sharp(data,{raw:info}).png().toBuffer(),overlay=await sharp(original,{raw:info}).composite([{input:await sharp(mask,{raw:info}).png().toBuffer()}]).png().toBuffer();
 return{high,overlay,mask:await sharp(mask,{raw:info}).png().toBuffer(),removedPixels:tail,bounds:{left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1},width:info.width,height:info.height};
}

export async function removeReviewedBackgroundVoids(bytes,reviews){
 assert.equal(reviews.length,2,'TWO_REVIEWED_CLASP_REGIONS_REQUIRED');
 const{data:original,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),data=Buffer.from(original),union=Buffer.alloc(original.length),components=[];
 for(let n=0;n<reviews.length;n++){
  const review=reviews[n],[x,y]=review.seed;assert.ok(review.backgroundVoidReviewed&&review.reviewedBy&&review.reviewedAt);assert.ok(Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&x<info.width-1&&y<info.height-1);
  const at=(y*info.width+x)*4,alpha=original[at+3];
  if(alpha===0){components.push({region:review.region,seed:review.seed,status:'already-transparent-preserved',removedPixels:0});continue;}
  assert.equal(alpha,255,'UNREVIEWED_PARTIAL_ALPHA');assert.ok(original[at]>=250&&original[at+1]>=250&&original[at+2]>=250,'REVIEWED_REGION_NOT_WHITE');
  const result=await removeReviewedWhiteVoid(bytes,review),mask=await sharp(result.mask).ensureAlpha().raw().toBuffer();
  for(let i=0;i<mask.length;i+=4)if(mask[i+3]){assert.equal(union[i+3],0,'REVIEWED_COMPONENTS_NOT_DISTINCT');union[i+n]=255;union[i+3]=150;data[i+3]=0;}
  components.push({region:review.region,seed:review.seed,status:'opaque-white-component-removed',removedPixels:result.removedPixels,bounds:result.bounds});
 }
 let removed=0;for(let i=0;i<data.length;i++){if(i%4!==3)assert.equal(data[i],original[i]);else if(data[i]!==original[i]){assert.equal(original[i],255);assert.equal(data[i],0);assert.equal(union[i],150);removed++;}}
 assert.equal(removed,components.reduce((n,c)=>n+c.removedPixels,0));
 const high=await sharp(data,{raw:info}).png().toBuffer(),mask=await sharp(union,{raw:info}).png().toBuffer(),overlay=await sharp(original,{raw:info}).composite([{input:mask}]).png().toBuffer();
 return{high,mask,overlay,components,removedPixels:removed,width:info.width,height:info.height};
}
