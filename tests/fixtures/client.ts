import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesignAggregate } from '../../src/types/aggregate';
import type { Part } from '../../src/types/domain';
import { toRow,fromRow } from '../../src/services/databaseMapping';
import { resolvePoses } from '../../src/domain/editor/resolvePoses';
export const getWorkspaceClient=()=>getBrowserSupabase();
let localWorkspace=false;export const setLocalWorkspace=(value:boolean)=>{localWorkspace=value;};
export const isLocalWorkspace=()=>localWorkspace;
export const point={id:'point',name:'上',type:'ring',xNorm:.5,yNorm:0,directionDeg:270,maxConnections:3,localInnerDiameterMm:4,localThicknessMm:.5};
export const bead:Part={id:'bead',name:'ビーズ',color:'赤',geometryKind:'node',category:'bead',widthMm:10,heightMm:10,mirrorPolicy:'mirror_image',imageAssetId:'image',tags:[],isArchived:false,connectionPoints:[point],throughHoles:[{id:'hole',name:'穴',entryXNorm:0,entryYNorm:.5,exitXNorm:1,exitYNorm:.5,diameterMm:2,axisDeg:0}],purchaseSpec:{saleMode:'pack',packQuantity:10,minimumUnits:1,currency:'JPY',unitPrice:100}};
export const wire:Part={...bead,id:'wire',name:'ワイヤー',color:'銀',category:'wire',geometryKind:'path',wireDiameterMm:.5,connectionPoints:[],throughHoles:[],pathRenderSpec:{renderMode:'solid_stroke',nominalDiameterMm:.5,opacity:1,textureOverlapMm:0,startPortType:'ring',endPortType:'ring',startMaxConnections:2,endMaxConnections:2}};
export const available:Part[]=[bead,{...bead,id:'replacement',name:'大きいビーズ',color:'青',widthMm:12,heightMm:12,connectionPoints:[{...point,id:'new-point'}],throughHoles:[{...bead.throughHoles[0],id:'new-hole'}]},wire];
export let current:DesignAggregate;
export const writes:Record<string,unknown>[]=[];
let authListener:((event:string,session:unknown)=>void)|undefined;
export function signOut(){authListener?.('SIGNED_OUT',null);}
export function fixture(count=0,through=false){const nodes=Array.from({length:count},(_,i)=>({id:`node-${i}`,partId:'bead',xMm:20+i%20*15,yMm:20+Math.floor(i/20)*15,rotationDeg:0,scaleX:1,scaleY:1,zIndex:i+1,locked:false}));
 current={design:{id:'design',name:'テストデザイン',type:'necklace',canvasConfig:{},editorConfig:{},revision:0,createdAt:'2026-10-05T00:00:00Z',updatedAt:'2026-10-05T00:00:00Z'},nodes,paths:through?[{id:'path',partId:'wire',start:{x:20,y:20},end:{x:350,y:20},physicalLengthMm:Math.max(500,count*12+20),shape:'u',bendSide:1,zIndex:0,locked:false}]:[],pointAttachments:[],throughAttachments:through?nodes.map((n,i)=>({id:`through-${i}`,kind:'through',nodeId:n.id,holeId:'hole',pathId:'path',distanceMm:10+i*12,orderIndex:i,flip180:false,lockedToNeighbors:false})):[],pathAttachments:[],mirrorLinks:[]};if(through)current=resolvePoses(current,available);writes.length=0;return current;}
function aggregateRow(a:DesignAggregate){return{design:toRow(a.design),nodes:a.nodes.map(toRow),paths:a.paths.map(p=>{const{start,end,...rest}=p;return{...toRow(rest),start_x_mm:start.x,start_y_mm:start.y,end_x_mm:end.x,end_y_mm:end.y};}),point_attachments:a.pointAttachments.map(toRow),through_attachments:a.throughAttachments.map(toRow),path_attachments:a.pathAttachments.map(toRow),mirror_links:a.mirrorLinks.map(toRow)};}
function imageUrl(){const c=document.createElement('canvas');c.width=100;c.height=100;const x=c.getContext('2d')!;x.fillStyle='#dc2626';x.beginPath();x.arc(50,50,50,0,Math.PI*2);x.fill();return c.toDataURL('image/png');}
export function getBrowserSupabase(){return {
 auth:{getSession:async()=>({data:{session:{user:{id:'fixture-user'}}},error:null}),onAuthStateChange:(fn:typeof authListener)=>{authListener=fn;return{data:{subscription:{unsubscribe:()=>{authListener=undefined;}}}};}},
 from:(table:string)=>({select:()=>({in:async()=>({data:[{id:'image',thumbnail_path:'thumbnail'}],error:null}),eq:()=>table==='parts'?Promise.resolve({data:available.map(p=>({id:p.id})),error:null}):{single:async()=>({data:{original_path:'original',normalized_high_path:'high',normalized_medium_path:'medium',pixel_width:100,pixel_height:100,calibration_mm_per_px:.1},error:null})}})}),
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:imageUrl()},error:null}),download:async()=>({data:await(await fetch(imageUrl())).blob(),error:null}),upload:async()=>({error:null}),remove:async()=>({error:null})})},
 rpc:async(name:string,args:Record<string,unknown>)=>{
  if(name==='get_design_aggregate')return{data:aggregateRow(current),error:null};
  if(name==='get_part_aggregate'){const p=available.find(p=>p.id===args.part_id)??available[0];const{connectionPoints,throughHoles,purchaseSpec,pathRenderSpec,holeReference,...part}=p;return{data:{part:toRow(part),hole_reference:holeReference,connection_points:connectionPoints.map(toRow),through_holes:throughHoles.map(toRow),purchase_spec:purchaseSpec?toRow(purchaseSpec):null,path_spec:pathRenderSpec?toRow(pathRenderSpec):null},error:null};}
  if(name==='save_design_aggregate'){writes.push(args);const p=args.payload as any;current={design:{...fromRow(p.design),revision:writes.length,updatedAt:'2026-10-05T10:00:00Z'},nodes:p.nodes.map(fromRow),paths:p.paths.map((v:any)=>({...fromRow(v),start:{x:v.start_x_mm,y:v.start_y_mm},end:{x:v.end_x_mm,y:v.end_y_mm}})),pointAttachments:p.point_attachments.map((v:any)=>({...fromRow(v),kind:'point'})),throughAttachments:p.through_attachments.map((v:any)=>({...fromRow(v),kind:'through'})),pathAttachments:p.path_attachments.map((v:any)=>({...fromRow(v),kind:'path'})),mirrorLinks:p.mirror_links.map(fromRow)} as DesignAggregate;return{data:{revision:writes.length,saved_at:'2026-10-05T10:00:00Z'},error:null};}
  if(name==='reserve_asset_upload'){const id=crypto.randomUUID();return{data:{id,paths:['original','high','medium','thumbnail'].map(p=>`${id}/${p}.png`)},error:null};}
  if(name==='save_part_successor'){writes.push(args);return{data:{part_id:'bead',created_successor:true},error:null};}
  return{data:null,error:null};
 }
 } as unknown as SupabaseClient;}
