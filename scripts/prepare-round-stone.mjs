import sharp from 'sharp';

// Only called for the hash-bound galleries reviewed as single stones or triangular triples.
export async function prepareRoundStone(original, diameterMm, prepareSphere) {
 const trimmed=await sharp(original).flatten({background:'#ffffff'}).trim({background:'#ffffff',threshold:12}).png().toBuffer();
 const {data,info}=await sharp(trimmed).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const bands=[];let start=null;
 for(let y=0;y<info.height;y++){
  let occupied=false;
  for(let x=0;x<info.width;x++){const i=(y*info.width+x)*info.channels;if(Math.min(data[i],data[i+1],data[i+2])<235){occupied=true;break;}}
  if(occupied&&start===null)start=y;
  if(!occupied&&start!==null){bands.push({start,end:y});start=null;}
 }
 if(start!==null)bands.push({start,end:info.height});
 const significant=bands.filter(b=>b.end-b.start>=info.height*.08);
 let region=null;
 if(significant.length===2){
  const [top,bottom]=significant;
  if(bottom.start-top.end<3||top.end>info.height*.6||top.end-top.start<info.height*.25)throw new Error('ROUND_STONE_PHOTO_REVIEW_REQUIRED');
  region={left:0,top:top.start,width:info.width,height:top.end-top.start};
 }else if(significant.length!==1)throw new Error('ROUND_STONE_PHOTO_REVIEW_REQUIRED');
 const selected=region?await sharp(trimmed).extract(region).png().toBuffer():original;
 const p=await prepareSphere(selected,diameterMm);
 const meta=await sharp(original).metadata();
 return {...p,originalMime:meta.format==='jpeg'?'image/jpeg':meta.format==='webp'?'image/webp':'image/png',transform:{...p.transform,version:'nominal-round-stone-photo-v1',projection:'provisional-round-frontal-projection',selection:region?'top-frontal-stone-of-reviewed-triple':'reviewed-single-frontal-stone',sourceTrimWidth:info.width,sourceTrimHeight:info.height,selectedRegionAfterWhiteTrim:region}};
}
