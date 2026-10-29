import type { DesignAggregate } from '../types/aggregate';
import type { Part,DesignPath } from '../types/domain';
import { derivePathGeometry } from '../domain/path/geometry';
import { isNodeFlipped } from '../domain/geometry/nodePart';
import { drawSegmentPath } from './segmentRenderer';
import {reviewedGuideAnchor} from '../domain/editor/guideAnchor';
const geometryCache=new WeakMap<DesignPath,ReturnType<typeof derivePathGeometry>>();
export function cachedGeometry(path:DesignPath){let value=geometryCache.get(path);if(!value){value=derivePathGeometry(path);geometryCache.set(path,value);}return value;}
/** Screen and export share a single global z order; dimensions always remain in mm. */
export function drawEditor(ctx:CanvasRenderingContext2D,a:DesignAggregate,parts:Part[],images:Map<string,HTMLImageElement>,selected:string[],selectedPath?:string){
 const byPart=new Map(parts.map(p=>[p.id,p]));
 const entities=[...a.nodes.map(node=>({node,path:undefined,z:node.zIndex})),...a.paths.map(path=>({path,node:undefined,z:path.zIndex}))].sort((l,r)=>l.z-r.z);
 for(const entity of entities){ctx.save();const part=byPart.get(entity.node?.partId??entity.path!.partId);if(!part){ctx.restore();continue;}
  const image=images.get(part.id);
  if(entity.node){const n=entity.node,w=part.widthMm??10,h=part.heightMm??10;ctx.translate(n.xMm,n.yMm);ctx.rotate(n.rotationDeg*Math.PI/180);ctx.scale(n.scaleX*(isNodeFlipped(a,n.id)?-1:1),n.scaleY);
   if(image){ctx.shadowColor='rgba(0,0,0,.18)';ctx.shadowBlur=1;ctx.shadowOffsetY=.5;ctx.drawImage(image,-w/2,-h/2,w,h);ctx.shadowColor='transparent';}
   else{ctx.fillStyle='#e7e5e4';ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeStyle='#78716c';ctx.strokeRect(-w/2,-h/2,w,h);}
   if(selected.includes(n.id)){ctx.strokeStyle='#0284c7';ctx.lineWidth=.5;ctx.strokeRect(-w/2-1,-h/2-1,w+2,h+2);const anchor=reviewedGuideAnchor(part);if(anchor){const x=(anchor.xNorm-.5)*w,y=(anchor.yNorm-.5)*h;ctx.beginPath();ctx.moveTo(x-.7,y);ctx.lineTo(x+.7,y);ctx.moveTo(x,y-.7);ctx.lineTo(x,y+.7);ctx.stroke();}}
  }else{const path=entity.path!,spec=part.pathRenderSpec;if(!spec){ctx.restore();continue;}
   ctx.globalAlpha=spec.opacity;
   if(spec.renderMode==='segment_texture'&&image&&spec.segmentPhysicalLengthMm)drawSegmentPath(ctx,path,image,spec.segmentPhysicalLengthMm,spec.textureOverlapMm);
   else{ctx.strokeStyle=spec.strokeColor??'#a8a29e';if(spec.renderMode==='stroke_texture'&&image)ctx.strokeStyle=ctx.createPattern(image,'repeat')??ctx.strokeStyle;ctx.lineWidth=spec.nominalDiameterMm??1;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();cachedGeometry(path).points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
   if(path.id===selectedPath){ctx.globalAlpha=1;ctx.strokeStyle='#0284c7';ctx.lineWidth=.4;ctx.beginPath();cachedGeometry(path).points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
  }ctx.restore();
 }
}
