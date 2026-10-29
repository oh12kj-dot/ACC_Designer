import type { PixelPoint,Crop } from '../domain/part/imageGeometry';
import { validateCrop } from '../domain/part/imageGeometry';
import type { PreparedImages } from './assetService';
export async function prepareSegmentImages(original:File,source:HTMLCanvasElement,crop:Crop,start:PixelPoint,end:PixelPoint,physicalLengthMm:number):Promise<PreparedImages>{
 validateCrop(crop,source.width,source.height);const length=Math.hypot(end.x-start.x,end.y-start.y);
 if(length<1||!Number.isFinite(physicalLengthMm)||physicalLengthMm<=0||![start,end].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=crop.x&&p.x<=crop.x+crop.width&&p.y>=crop.y&&p.y<=crop.y+crop.height))throw new Error('区間の2点を選択範囲内に指定し、実物長を入力してください');
 const angle=Math.atan2(end.y-start.y,end.x-start.x),cos=Math.cos(angle),sin=Math.sin(angle);
 const corners=[{x:crop.x,y:crop.y},{x:crop.x+crop.width,y:crop.y},{x:crop.x,y:crop.y+crop.height},{x:crop.x+crop.width,y:crop.y+crop.height}];const perpendicular=corners.map(p=>-(p.x-start.x)*sin+(p.y-start.y)*cos),top=Math.floor(Math.min(...perpendicular)),bottom=Math.ceil(Math.max(...perpendicular));
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(length);canvas.height=bottom-top;if(canvas.width>4096||canvas.height>4096)throw new Error('短区間画像は4096px以下にしてください');
 const cropped=document.createElement('canvas');cropped.width=crop.width;cropped.height=crop.height;cropped.getContext('2d')!.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height);
 const ctx=canvas.getContext('2d')!;ctx.translate(0,-top);ctx.rotate(-angle);ctx.drawImage(cropped,crop.x-start.x,crop.y-start.y);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;if(!pixels.some((value,i)=>i%4===3&&value>0))throw new Error('区間画像が完全に透明です');
 const encode=(value:HTMLCanvasElement)=>new Promise<Blob>((resolve,reject)=>value.toBlob(blob=>blob?resolve(blob):reject(new Error('短区間PNGを生成できません')),'image/png'));
 const resized=(max:number)=>{const scale=Math.min(1,max/Math.max(canvas.width,canvas.height)),out=document.createElement('canvas');out.width=Math.max(1,Math.round(canvas.width*scale));out.height=Math.max(1,Math.round(canvas.height*scale));out.getContext('2d')!.drawImage(canvas,0,0,out.width,out.height);return out;};
 const [high,medium,thumbnail]=await Promise.all([encode(canvas),encode(resized(1024)),encode(resized(256))]);
 return{original,high,medium,thumbnail,width:canvas.width,height:canvas.height,mmPerPx:physicalLengthMm/canvas.width,transform:{segmentCrop:crop,segmentStart:start,segmentEnd:end,segmentPhysicalLengthMm:physicalLengthMm,rotationDeg:-angle*180/Math.PI,perspective:{applied:false}}};
}
