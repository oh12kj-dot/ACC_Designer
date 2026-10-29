import sharp from 'sharp';
export interface DiagramRegion {sizeKey:string;imageIndex:number;crop:{left:number;top:number;width:number;height:number};outerDiameterMm:number;wireDiameterMm:number;approximateInnerDiameterMm:number}
export function ringSizeKey(text:string){const match=text.normalize('NFKC').replace(/\s/g,'').match(/^(\d+(?:\.\d+)?)[×x](\d+(?:\.\d+)?)mm(?:\((?:洋白|鉄)\))?$/);return match?`${Number(match[1])}x${Number(match[2])}`:undefined;}
/** Mask processing is recorded provenance; only a reviewed source diagram establishes dimensions. */
export async function prepareDiagramRegion(original:Buffer,region:DiagramRegion){
 if(ringSizeKey(`${region.wireDiameterMm}x${region.outerDiameterMm}mm`)!==region.sizeKey||region.wireDiameterMm<=0||region.outerDiameterMm<=region.wireDiameterMm*2||region.approximateInnerDiameterMm<=0)throw new Error('DIAGRAM_DIMENSIONS_INVALID');
 const meta=await sharp(original).metadata();const originalMime=meta.format==='webp'?'image/webp':meta.format==='jpeg'?'image/jpeg':meta.format==='png'?'image/png':undefined;if(!originalMime)throw new Error('DIAGRAM_IMAGE_FORMAT_INVALID');const c=region.crop;if(![c.left,c.top,c.width,c.height].every(Number.isInteger)||c.left<0||c.top<0||c.width<2||c.height<2||c.left+c.width>(meta.width??0)||c.top+c.height>(meta.height??0))throw new Error('DIAGRAM_REGION_INVALID');
 const {data,info}=await sharp(original).extract(c).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,top=info.height,right=-1,bottom=-1,count=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
  const foreground=r>g*1.025&&g>b*1.015&&r-b>=5&&data[i+3]>0;data[i+3]=foreground?255:0;if(foreground){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;}
 }
 const width=right-left+1,height=bottom-top+1;if(width<20||height<20||count<100||Math.max(width/height,height/width)>1.15)throw new Error('DIAGRAM_OUTLINE_UNVERIFIED');
 const high=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left,top,width,height}).png().toBuffer();
 const medium=await sharp(high).resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).png().toBuffer();const thumbnail=await sharp(high).resize({width:192,height:192,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 const mmPerPx=region.outerDiameterMm/width;
 return{originalMime,high,medium,thumbnail,width,height,mmPerPx,transform:{version:'kiwa-reviewed-gold-ring-v1',crop:c,trim:{x:left,y:top,width,height},mask:'gold-chroma-v1',calibration:{measurement:'outer_diameter',knownMm:region.outerDiameterMm,a:{x:c.left+left,y:c.top+top+height/2},b:{x:c.left+right+1,y:c.top+top+height/2},pixelBoundaryConvention:'outer edges of included pixel cells',aspectRatio:width/height},connectionReadiness:'unverified',physicalAccuracy:'not_independently_measured'}};
}
