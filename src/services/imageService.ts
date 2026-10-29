import { alphaBounds,validateCrop,type Crop,type PixelPoint } from '../domain/part/imageGeometry';
import type { PreparedImages } from './assetService';
import { warpPixels,type Perspective } from '../domain/part/perspective';

export interface MaskStroke {points:PixelPoint[];radius:number;restore:boolean}
export interface ImageEdit {crop:Crop;quarterTurns:number;rotationDeg?:number;perspective?:Perspective;strokes:MaskStroke[]}
export async function loadImage(file:File):Promise<ImageBitmap> {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>20*1024*1024)throw new Error('PNG/JPEG/WebP、20MB以下の画像を選択してください');
  const image=await createImageBitmap(file,{imageOrientation:'from-image'});
  if(image.width>4096 || image.height>4096){image.close();throw new Error('画像の長辺を4096px以下にして登録してください');}
  return image;
}
export function renderEdited(image:ImageBitmap,edit:ImageEdit):HTMLCanvasElement {
  validateCrop(edit.crop,image.width,image.height);
  const crop=edit.crop;
  const cropped=document.createElement('canvas');cropped.width=crop.width;cropped.height=crop.height;
  const cropContext=cropped.getContext('2d')!;cropContext.drawImage(image,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height);
  let source=cropped;
  if(edit.perspective){
    const spec=edit.perspective;source=document.createElement('canvas');source.width=spec.width;source.height=spec.height;
    source.getContext('2d')!.putImageData(new ImageData(warpPixels(cropContext.getImageData(0,0,crop.width,crop.height).data,crop.width,crop.height,spec),spec.width,spec.height),0,0);
  }
  const degrees=edit.quarterTurns*90+(edit.rotationDeg??0);
  if(!Number.isFinite(degrees))throw new Error('回転角が不正です');
  const angle=degrees*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.ceil(Math.abs(source.width*cos)+Math.abs(source.height*sin)-1e-8));canvas.height=Math.max(1,Math.ceil(Math.abs(source.width*sin)+Math.abs(source.height*cos)-1e-8));
  if(canvas.width>8192||canvas.height>8192)throw new Error('回転後の画像が大きすぎます');
  const ctx=canvas.getContext('2d')!;
  ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle);
  ctx.drawImage(source,-source.width/2,-source.height/2);
  ctx.setTransform(1,0,0,1,0,0);
  const original=ctx.getImageData(0,0,canvas.width,canvas.height);
  const edited=new ImageData(new Uint8ClampedArray(original.data),canvas.width,canvas.height);
  for(const stroke of edit.strokes){
    const centers:PixelPoint[]=[];
    for(let i=0;i<stroke.points.length;i++){
      const p=stroke.points[i],previous=stroke.points[i-1]??p;
      const steps=Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y)/Math.max(1,stroke.radius/2)));
      for(let step=1;step<=steps;step++)centers.push({x:previous.x+(p.x-previous.x)*step/steps,y:previous.y+(p.y-previous.y)*step/steps});
    }
    for(const p of centers)for(let y=Math.max(0,Math.floor(p.y-stroke.radius));y<=Math.min(canvas.height-1,Math.ceil(p.y+stroke.radius));y++)for(let x=Math.max(0,Math.floor(p.x-stroke.radius));x<=Math.min(canvas.width-1,Math.ceil(p.x+stroke.radius));x++){
      if(Math.hypot(x-p.x,y-p.y)<=stroke.radius){const index=(y*canvas.width+x)*4+3;edited.data[index]=stroke.restore?original.data[index]:0;}
    }
  }
  ctx.putImageData(edited,0,0);return canvas;
}
function png(canvas:HTMLCanvasElement):Promise<Blob>{return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG生成に失敗しました')),'image/png'));}
function resized(source:HTMLCanvasElement,max:number):HTMLCanvasElement {
  const scale=Math.min(1,max/Math.max(source.width,source.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
  canvas.getContext('2d')!.drawImage(source,0,0,canvas.width,canvas.height);return canvas;
}
export async function prepareImages(original:File,edited:HTMLCanvasElement,mmPerPx:number,transform:Record<string,unknown>):Promise<PreparedImages>{
  if(!Number.isFinite(mmPerPx)||mmPerPx<=0)throw new Error('実寸キャリブレーションが必要です');
  const box=alphaBounds(edited.getContext('2d')!.getImageData(0,0,edited.width,edited.height).data,edited.width,edited.height);
  const trimmed=document.createElement('canvas');trimmed.width=box.width;trimmed.height=box.height;
  trimmed.getContext('2d')!.drawImage(edited,box.x,box.y,box.width,box.height,0,0,box.width,box.height);
  const highCanvas=resized(trimmed,4096);
  if(Math.abs((highCanvas.height/box.height)/(highCanvas.width/box.width)-1)>0.03)throw new Error('画像縮小で縦横比が3%以上変化します。画像の向き・余白を調整してください');
  // No upscaling. Preserve physical dimensions after rotation expands the image.
  const highMmPerPx=mmPerPx*box.width/highCanvas.width;
  const [high,medium,thumbnail]=await Promise.all([png(highCanvas),png(resized(trimmed,1024)),png(resized(trimmed,256))]);
  return {original,high,medium,thumbnail,width:highCanvas.width,height:highCanvas.height,mmPerPx:highMmPerPx,transform:{...transform,trim:box,outputScale:highCanvas.width/box.width,perspective:transform.perspective??{applied:false}}};
}
