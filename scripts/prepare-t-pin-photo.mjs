import sharp from'sharp';import{createHash}from'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function rotateTPinOriginal(original,rotationDegrees){
 if(!Number.isFinite(rotationDegrees)||rotationDegrees < -180||rotationDegrees>180)throw Error('T_PIN_ROTATION_INVALID');
 return sharp(original,{limitInputPixels:16777216,failOn:'warning'}).rotate(rotationDegrees,{background:{r:255,g:255,b:255,alpha:1}}).png().toBuffer({resolveWithObject:true});
}
export async function prepareTPinPhoto(original,spec){
 const r=spec.sourceCrop,c=r?.crop,m=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata();
 if(!r?.reviewed||hash(original)!==r.sha256||m.width!==r.sourceWidth||m.height!==r.sourceHeight||m.pages>1||r.coordinateConvention!=='expanded-rotated-raster-integer-pixels')throw Error('T_PIN_SOURCE_INVALID');
 const rotated=await rotateTPinOriginal(original,r.rotationDegrees);if(rotated.info.width!==r.expandedWidth||rotated.info.height!==r.expandedHeight||!c||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>r.expandedWidth||c.top+c.height>r.expandedHeight)throw Error('T_PIN_EXPANDED_CROP_INVALID');
 const width=Math.round(spec.widthMm*40),height=Math.round(spec.heightMm*40);if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||width>88||height<600||height>3000||Math.abs(width/40-spec.widthMm)>1e-10||Math.abs(height/40-spec.heightMm)>1e-10)throw Error('T_PIN_BOX_INVALID');
 const crop=await sharp(rotated.data).extract(c).png().toBuffer();
 const{data,info}=await sharp(crop).resize(width,height,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),seen=new Uint8Array(width*height),queue=new Int32Array(seen.length);let head=0,tail=0;
 const visit=(x,y)=>{if(x<0||y<0||x>=width||y>=height)return;const p=y*width+x,i=p*4;if(seen[p])return;seen[p]=1;if(data[i+3]===0||data[i]>=250&&data[i+1]>=250&&data[i+2]>=250){data[i+3]=0;queue[tail++]=p;}};
 for(let x=0;x<width;x++){visit(x,0);visit(x,height-1);}for(let y=0;y<height;y++){visit(0,y);visit(width-1,y);}while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}
 const high=await sharp(data,{raw:info}).png().toBuffer(),thumbnail=await sharp(high).resize(128,128,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer(),originalMime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[m.format];if(!originalMime)throw Error('T_PIN_MIME_INVALID');
 return{originalMime,high,medium:high,thumbnail,width,height,mmPerPx:1/40,transform:{version:'nominal-t-pin-rotated-single-crop-v1',placementMode:'published-nominal',sourceCrop:r,resizeFit:'contain-with-transparent-padding',sourceRotationDegrees:r.rotationDegrees,photoRotationDegrees:0,layoutSizeChoice:spec.layoutSizeChoice,nominalFrameMmPerPx:1/40,whiteMaskThreshold:250,imageScaleVerified:false,variantAppearanceVerified:false,sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,connectionReady:false}};
}
