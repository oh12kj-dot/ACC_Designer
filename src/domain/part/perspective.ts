import type { PixelPoint } from './imageGeometry';

export type Quad = [PixelPoint,PixelPoint,PixelPoint,PixelPoint];
export interface Perspective { corners:Quad; width:number; height:number }

export function validatePerspective(spec:Perspective,sourceWidth:number,sourceHeight:number):void {
  if(![spec.width,spec.height].every(n=>Number.isInteger(n)&&n>=2&&n<=4096))throw new Error('補正後の幅と高さは2〜4096pxで指定してください');
  if(spec.corners.length!==4 || !spec.corners.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<sourceWidth&&p.y<sourceHeight))throw new Error('画像内の4点を指定してください');
  let sign=0;
  for(let i=0;i<4;i++){
    const a=spec.corners[i],b=spec.corners[(i+1)%4],c=spec.corners[(i+2)%4];
    const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
    if(Math.abs(cross)<1e-6 || (sign!==0 && Math.sign(cross)!==sign))throw new Error('交差しない四角形を左上・右上・右下・左下の順で指定してください');
    sign=Math.sign(cross);
  }
  if(sign<0)throw new Error('左上・右上・右下・左下の順で指定してください');
}

/** Destination unit square -> source pixel coordinates. Partial-pivot Gaussian elimination. */
export function inverseHomography(corners:Quad):number[] {
  const destination=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  const matrix:number[][]=[];
  for(let i=0;i<4;i++){
    const {x:u,y:v}=destination[i],{x,y}=corners[i];
    matrix.push([u,v,1,0,0,0,-x*u,-x*v,x]);matrix.push([0,0,0,u,v,1,-y*u,-y*v,y]);
  }
  for(let col=0;col<8;col++){
    let pivot=col;for(let row=col+1;row<8;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;
    [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
    const divisor=matrix[col][col];if(Math.abs(divisor)<1e-10)throw new Error('4点から補正を計算できません');
    for(let k=col;k<=8;k++)matrix[col][k]/=divisor;
    for(let row=0;row<8;row++){if(row===col)continue;const factor=matrix[row][col];for(let k=col;k<=8;k++)matrix[row][k]-=factor*matrix[col][k];}
  }
  return [...matrix.map(row=>row[8]),1];
}
export function project(matrix:number[],u:number,v:number):PixelPoint {
  const divisor=matrix[6]*u+matrix[7]*v+1;
  if(!Number.isFinite(divisor)||Math.abs(divisor)<1e-10)throw new Error('射影変換が不正です');
  return {x:(matrix[0]*u+matrix[1]*v+matrix[2])/divisor,y:(matrix[3]*u+matrix[4]*v+matrix[5])/divisor};
}

/** Bilinear interpolation in premultiplied-alpha space avoids dark transparent edges. */
export function warpPixels(data:Uint8ClampedArray,width:number,height:number,spec:Perspective):Uint8ClampedArray<ArrayBuffer> {
  validatePerspective(spec,width,height);
  if(data.length!==width*height*4)throw new Error('画像データが不正です');
  const matrix=inverseHomography(spec.corners),output=new Uint8ClampedArray(spec.width*spec.height*4);
  for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){
    const p=project(matrix,x/(spec.width-1),y/(spec.height-1));
    const sx=Math.max(0,Math.min(width-1,p.x)),sy=Math.max(0,Math.min(height-1,p.y));
    const left=Math.floor(sx),top=Math.floor(sy),dx=sx-left,dy=sy-top;
    const samples=[[left,top,(1-dx)*(1-dy)],[Math.min(width-1,left+1),top,dx*(1-dy)],[left,Math.min(height-1,top+1),(1-dx)*dy],[Math.min(width-1,left+1),Math.min(height-1,top+1),dx*dy]];
    let alpha=0;const color=[0,0,0];
    for(const [px,py,weight] of samples){const i=(py*width+px)*4,a=data[i+3]/255;alpha+=a*weight;for(let channel=0;channel<3;channel++)color[channel]+=data[i+channel]*a*weight;}
    const index=(y*spec.width+x)*4;output[index+3]=alpha*255;for(let channel=0;channel<3;channel++)output[index+channel]=alpha>0?color[channel]/alpha:0;
  }
  return output;
}
