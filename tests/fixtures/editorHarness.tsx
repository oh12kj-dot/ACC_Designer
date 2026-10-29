import { createRoot } from 'react-dom/client';
import DesignEditor from '../../src/components/editor/DesignEditor';
import PartRegistration from '../../src/components/parts/PartRegistration';
import { fixture,writes,signOut,available,wire,setLocalWorkspace } from './client';
import { drawEditor } from '../../src/services/editorRenderer';
import { dragComponent } from '../../src/domain/editor/dragComponent';
import { changePath } from '../../src/domain/editor/throughCommands';
export { writes,signOut };
export { readRecovery } from '../../src/services/recovery';
export function mount(count=0,through=false,imageEdit=false,local=false){document.body.innerHTML='<div id="fixture-root"></div>';fixture(count,through);setLocalWorkspace(local);createRoot(document.getElementById('fixture-root')!).render(imageEdit?<PartRegistration editPartId="bead"/>:<DesignEditor designId="design"/>);}
export function mountChain(){wire.category='chain';wire.pathRenderSpec={...wire.pathRenderSpec!,renderMode:'segment_texture',segmentAssetId:'segment',segmentPhysicalLengthMm:4};mount(3);}
export async function measure(count:number,through:boolean){const a=fixture(count,through),c=document.createElement('canvas');c.width=900;c.height=700;const ctx=c.getContext('2d')!;
 const asset=document.createElement('canvas');asset.width=100;asset.height=100;asset.getContext('2d')!.fillRect(0,0,100,100);const image=new Image();await new Promise<void>(resolve=>{image.onload=()=>resolve();image.src=asset.toDataURL();});const imageMap=new Map(available.map(p=>[p.id,image]));
 const values:Record<string,number[]>={drag:[],path:[],draw:[],frame:[]};let last=0;for(let i=0;i<20;i++){
 let t=performance.now();const moving=a.nodes[Math.floor(count/2)],preview=dragComponent(a,available,moving.id,{x:moving.xMm+.1,y:moving.yMm},{x:.1,y:0});values.drag.push(performance.now()-t);
 t=performance.now();ctx.clearRect(0,0,900,700);ctx.save();ctx.scale(3,3);drawEditor(ctx,preview,available,imageMap,[]);ctx.restore();values.draw.push(performance.now()-t);
 if(through){t=performance.now();changePath(a,available,'path',{end:{x:350+i*.1,y:20}});values.path.push(performance.now()-t);}
 const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));if(last)values.frame.push(now-last);last=now;
 }return Object.fromEntries(Object.entries(values).map(([name,v])=>[name,{median:[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)]??0,max:Math.max(0,...v)}]));}

export function mountGroupedColors(){available[0].color='アメジスト/G';available[1].color='アメジスト/S';wire.color='AR';mount();}

export function mountClearColors(){available[0].color='クリアエメラルド';available[1].color='クリアブルー';wire.color='クリア';mount();}

export function mountSmallBeads(){available[0].widthMm=3;available[0].heightMm=3;available[0].connectionPoints=[];available[0].throughHoles=[];mount();}
export function mountReviewedAxis(status:'reviewed-axis'|'no-through-hole'){
 available[0].connectionPoints=[];available[0].throughHoles=[];
 available[0].metadata={sourceDraftId:'fixture',nominalPlacement:{imageScaleVerified:false,connectionReady:false,photoSha256:'fixture-photo'},guideOrientation:{version:1,status,axisDeg:0,imageAssetId:available[0].imageAssetId,sourceDraftId:'fixture',photoSha256:'fixture-photo',descriptionSha256:'fixture-text',evidenceText:'fixture own source',reviewedAt:'2026-10-23'}};mount();
}
export function mountHoleAnchor(){
 available[0].widthMm=10;available[0].heightMm=8;available[0].connectionPoints=[];available[0].throughHoles=[];
 available[0].metadata={sourceDraftId:'fixture',nominalPlacement:{imageScaleVerified:false,connectionReady:false,photoSha256:'fixture-photo'},guideOrientation:{version:1,status:'reviewed-axis',axisDeg:0,imageAssetId:available[0].imageAssetId,sourceDraftId:'fixture',photoSha256:'fixture-photo',descriptionSha256:'fixture-text',evidenceText:'own horizontal hole',reviewedAt:'2026-10-24'},guideAnchor:{version:1,status:'photo-estimate',xNorm:.5,yNorm:.1,imageAssetId:available[0].imageAssetId,sourceDraftId:'fixture',photoSha256:'fixture-photo',evidenceText:'own side and chain photos',reviewedAt:'2026-10-24'}};mount();
}

export function mountCentralAnchor(){
 available[0].connectionPoints=[];available[0].throughHoles=[];
 available[0].metadata={sourceDraftId:'fixture',nominalPlacement:{imageScaleVerified:false,connectionReady:false,photoSha256:'fixture-photo'},guideAnchor:{version:1,status:'photo-estimate',referenceKind:'source-central-projection',rotationMode:'keep-current',xNorm:.5,yNorm:.5,imageAssetId:available[0].imageAssetId,sourceDraftId:'fixture',photoSha256:'fixture-photo',evidenceText:'explicit two-ended round bead source and photo; projection only',reviewedAt:'2026-10-24'}};mount();
}

export function mountMounting(){
 available[0].throughHoles=[];available[0].connectionPoints=[];available[0].metadata={sourceDraftId:'fixture',nominalPlacement:{imageScaleVerified:false,connectionReady:false,photoSha256:'photo'},guideOrientation:{version:1,status:'no-through-hole',imageAssetId:available[0].imageAssetId,sourceDraftId:'fixture',photoSha256:'photo',descriptionSha256:'text',evidenceText:'none',reviewedAt:'now'}};
 available[1].throughHoles=[];available[1].connectionPoints=[];available[1].sourceUrl='fixture-source';available[1].metadata={sourceDraftId:'fixture-2'};available[1].holeReference={sourceDraftId:'fixture-2',sourceUrl:'fixture-source',descriptionSha256:'text',minMm:.8,maxMm:.8,approximate:true,presence:'through',sizeText:'4mm',reviewedAt:'now'};
 available.push({...available[1],id:'unknown-hole',name:'穴径未確認のビーズ',metadata:{},holeReference:undefined});mount();
}
