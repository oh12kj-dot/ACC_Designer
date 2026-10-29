import sharp from 'sharp';
const gcd=(a,b)=>b?gcd(b,a%b):a;
export async function prepareBodyBox(original,spec){
 const meta=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata(),originalMime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[meta.format];
 if(!originalMime||!meta.width||!meta.height||meta.pages>1)throw new Error('BODY_BOX_IMAGE_INVALID');
 const ticks=[spec.widthMm,spec.heightMm].map(n=>Math.round(n*40));if(!ticks.every(n=>n>0))throw new Error('BODY_BOX_SIZE_INVALID');
 const divisor=gcd(...ticks),base=ticks.map(n=>n/divisor),factor=Math.max(1,Math.floor(256/Math.max(...base))),[width,height]=base.map(n=>n*factor);
 const trim=await sharp(original).flatten({background:'white'}).trim({background:'white',threshold:12}).png().toBuffer(),bounds=await sharp(trim).metadata();
 if(!bounds.width||!bounds.height||Math.max(bounds.width/bounds.height,bounds.height/bounds.width)>4||Math.min(bounds.width/meta.width,bounds.height/meta.height)<.2)throw new Error('BODY_BOX_PHOTO_REVIEW_REQUIRED');
 const {data,info}=await sharp(trim).rotate(spec.photoRotationDegrees).resize(width,height,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(width*height),queue=new Int32Array(seen.length);let head=0,tail=0;
 const visit=(x,y)=>{if(x<0||y<0||x>=width||y>=height)return;const p=y*width+x,i=p*4;if(seen[p])return;seen[p]=1;if(data[i+3]===0||data[i]>=250&&data[i+1]>=250&&data[i+2]>=250){data[i+3]=0;queue[tail++]=p;}};
 for(let x=0;x<width;x++){visit(x,0);visit(x,height-1);}for(let y=0;y<height;y++){visit(0,y);visit(width-1,y);}
 while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}
 const high=await sharp(data,{raw:info}).png().toBuffer(),thumbnail=await sharp(high).resize(128,128,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
 return{originalMime,high,medium:high,thumbnail,width,height,mmPerPx:spec.widthMm/width,transform:{version:'nominal-crystal-body-box-photo-v1',placementMode:'published-nominal',layoutSizeChoice:spec.layoutSizeChoice,photoRotationDegrees:spec.photoRotationDegrees,resizeFit:'contain-with-transparent-padding',sourceTrimWidth:bounds.width,sourceTrimHeight:bounds.height,whiteMaskThreshold:250,imageScaleVerified:false,variantAppearanceVerified:false,sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,connectionReady:false}};
}
