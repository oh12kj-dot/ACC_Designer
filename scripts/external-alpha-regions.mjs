// Native integer pixel-boundary regions. This module does not approve photos,
// infer contours, or dispatch registration; callers must enforce the finite scope.
const fail = reason => { throw Error('EXTERNAL_ALPHA_' + reason); };
const cross = (a, b, c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const on = (a,b,p) => cross(a,b,p)===0 && p[0]>=Math.min(a[0],b[0]) && p[0]<=Math.max(a[0],b[0]) && p[1]>=Math.min(a[1],b[1]) && p[1]<=Math.max(a[1],b[1]);
function intersects(a,b,c,d) {
 const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
 return x*y<0&&z*w<0 || on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
}
function polygon(points,crop) {
 if(!Array.isArray(points)||points.length<3||points.length>256)fail('POLYGON');
 const {left:l,top:t,width:w,height:h}=crop;
 for(let i=0;i<points.length;i++) {
  const p=points[i],n=points[(i+1)%points.length];
  if(!Array.isArray(p)||p.length!==2||!p.every(Number.isSafeInteger)||p[0]<l||p[1]<t||p[0]>l+w||p[1]>t+h)fail('COORDINATE');
  if(p[0]===n?.[0]&&p[1]===n?.[1])fail('DUPLICATE_VERTEX');
 }
 let area=0;
 for(let i=0;i<points.length;i++) {
  const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];
  // Adjacent collinear edges can backtrack or hide an overlapping boundary.
  if(cross(points[(i+points.length-1)%points.length],a,b)===0)fail('COLLINEAR_VERTEX');
  for(let j=i+1;j<points.length;j++) {
   if(j===i+1||i===0&&j===points.length-1)continue;
   if(intersects(a,b,points[j],points[(j+1)%points.length]))fail('SELF_INTERSECTION');
  }
 }
 if(!area)fail('ZERO_AREA');
}
function inside(points,x,y) {
 const p=[x,y];let yes=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++) {
  const a=points[j],b=points[i];if(on(a,b,p))return true;
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }
 return yes;
}
export function externalAlphaPixels(crop,protectedRoi,polygons) {
 if(!crop||!['left','top','width','height'].every(k=>Number.isSafeInteger(crop[k]))||crop.left<0||crop.top<0||crop.width<=0||crop.height<=0||crop.width*crop.height>16777216)fail('CROP');
 if(!Array.isArray(polygons)||!polygons.length||polygons.length>32)fail('REGIONS');
 polygon(protectedRoi,crop);for(const p of polygons)polygon(p,crop);
 const {left,top,width:w,height:h}=crop,n=w*h,protectedPixels=new Uint8Array(n),excluded=new Uint8Array(n);
 let protectedCount=0,excludedCount=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
  const i=y*w+x,px=left+x+.5,py=top+y+.5;
  if(inside(protectedRoi,px,py)){protectedPixels[i]=1;protectedCount++;}
  if(polygons.some(p=>inside(p,px,py))){excluded[i]=1;excludedCount++;}
 }
 if(!protectedCount||!excludedCount)fail('EMPTY_REGION');
 // Every protected pixel, including apparent internal holes, gets a 2px guard.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(protectedPixels[y*w+x])
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
   const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<w&&ny<h&&excluded[ny*w+nx])fail('PROTECTED_REGION_CONTACT');
  }
 const seen=new Uint8Array(n),queue=new Int32Array(n);
 for(let start=0;start<n;start++)if(excluded[start]&&!seen[start]) {
  let head=0,tail=1,boundary=false;queue[0]=start;seen[start]=1;
  while(head<tail) {
   const p=queue[head++],x=p%w,y=Math.floor(p/w);
   if(x===0||y===0||x===w-1||y===h-1)boundary=true;
   for(const [nx,ny]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
    if(nx<0||ny<0||nx>=w||ny>=h)continue;
    const q=ny*w+nx;if(excluded[q]&&!seen[q]){seen[q]=1;queue[tail++]=q;}
   }
  }
  if(!boundary)fail('INTERIOR_COMPONENT');
 }
 return {excluded,protectedPixels,excludedCount,protectedCount};
}
export function applyExternalAlphaRgba(rgba,crop,protectedRoi,polygons) {
 if(!(rgba instanceof Uint8Array)||rgba.length!==crop?.width*crop?.height*4)fail('RGBA');
 const pixels=externalAlphaPixels(crop,protectedRoi,polygons),output=Buffer.from(rgba);
 for(let p=0;p<pixels.excluded.length;p++)if(pixels.excluded[p])output[p*4+3]=0;
 return {...pixels,data:output};
}
