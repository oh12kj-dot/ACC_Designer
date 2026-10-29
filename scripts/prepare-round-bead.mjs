import sharp from 'sharp';
export async function prepareRoundBead(original,diameterMm,prepareSphere){
 const meta=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata();
 const mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[meta.format];
 if(!mime||!meta.width||!meta.height||meta.pages>1)throw new Error('ROUND_BEAD_IMAGE_INVALID');
 const {data}=await sharp(original).flatten({background:'white'}).removeAlpha().extract({left:0,top:0,width:1,height:1}).raw().toBuffer({resolveWithObject:true});
 const black=data[0]<20&&data[1]<20&&data[2]<20;
 const trim=await sharp(original).flatten({background:'white'}).trim({background:black?'#000000':'#ffffff',threshold:12}).png().toBuffer();
 const bounds=await sharp(trim).metadata();if(!bounds.width||!bounds.height||Math.max(bounds.width/bounds.height,bounds.height/bounds.width)>1.35||Math.min(bounds.width/meta.width,bounds.height/meta.height)<.25)throw new Error('ROUND_BEAD_PHOTO_REVIEW_REQUIRED');
 const result=await prepareSphere(trim,diameterMm);
 return{...result,originalMime:mime,transform:{...result.transform,version:'nominal-reviewed-round-bead-v1',sourceBackground:black?'black':'white',sourceTrimWidth:bounds.width,sourceTrimHeight:bounds.height}};
}
