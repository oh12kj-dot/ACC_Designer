export interface Crop {x:number;y:number;width:number;height:number}
export interface PixelPoint {x:number;y:number}

export function validateCrop(crop:Crop,width:number,height:number):void {
  if(![crop.x,crop.y,crop.width,crop.height,width,height].every(Number.isInteger) || crop.x<0 || crop.y<0 || crop.width<=0 || crop.height<=0 || crop.x+crop.width>width || crop.y+crop.height>height)throw new Error('Crop範囲は画像内の整数pxで指定してください');
}
export function calibration(a:PixelPoint,b:PixelPoint,knownMm:number):number {
  const distance=Math.hypot(a.x-b.x,a.y-b.y);
  if(![a.x,a.y,b.x,b.y,knownMm].every(Number.isFinite) || distance<1 || knownMm<=0)throw new Error('離れた2点と正の実距離を指定してください');
  return knownMm/distance;
}
export function alphaBounds(data:Uint8ClampedArray,width:number,height:number):Crop {
  if(data.length!==width*height*4 || width<=0 || height<=0)throw new Error('画像データが不正です');
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<0)throw new Error('画像がすべて透明です');
  return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}
