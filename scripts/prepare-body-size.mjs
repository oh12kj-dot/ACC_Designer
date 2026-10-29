import sharp from 'sharp';
export async function prepareBodySize(original,sizeMm){
 const meta=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata();
 const originalMime=meta.format==='jpeg'?'image/jpeg':meta.format==='png'?'image/png':meta.format==='webp'?'image/webp':undefined;
 if(!originalMime||!meta.width||!meta.height||meta.pages&&meta.pages>1)throw new Error('BODY_PHOTO_INVALID');
 const trimmed=await sharp(original).flatten({background:'white'}).trim({background:'white',threshold:12}).png().toBuffer();
 const bounds=await sharp(trimmed).metadata();if(!bounds.width||!bounds.height||Math.max(bounds.width/bounds.height,bounds.height/bounds.width)>1.6||Math.min(bounds.width/meta.width,bounds.height/meta.height)<.25)throw new Error('BODY_PHOTO_REVIEW_REQUIRED');
 // Keep the photographed projection's aspect ratio. A square box does not assert body height.
 const {data,info}=await sharp(trimmed).resize(256,256,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height),queue=new Int32Array(seen.length);let head=0,tail=0;
 const visit=(x,y)=>{if(x<0||y<0||x>=info.width||y>=info.height)return;const p=y*info.width+x,i=p*4;if(seen[p])return;seen[p]=1;if(data[i+3]===0||data[i]>=250&&data[i+1]>=250&&data[i+2]>=250){data[i+3]=0;queue[tail++]=p;}};
 for(let x=0;x<info.width;x++){visit(x,0);visit(x,info.height-1);}for(let y=0;y<info.height;y++){visit(0,y);visit(info.width-1,y);}
 while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width);visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}
 const high=await sharp(data,{raw:info}).png().toBuffer(),thumbnail=await sharp(high).resize(128,128).png().toBuffer();
 return{originalMime,high,medium:high,thumbnail,width:256,height:256,mmPerPx:sizeMm/256,transform:{version:'nominal-body-size-box-photo-v1',placementMode:'published-nominal',publishedBodySizeMm:sizeMm,layoutSizeChoice:'published-body-size-square-box-for-layout-only',resizeFit:'contain-with-transparent-padding',sourceTrimWidth:bounds.width,sourceTrimHeight:bounds.height,whiteMaskThreshold:250,imageScaleVerified:false,variantAppearanceVerified:false,sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,connectionReady:false}};
}
