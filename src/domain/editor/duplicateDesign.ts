import type{Design,DesignAggregate}from'../../types/aggregate';
import type{MirrorState}from'./createMirror';
import type{CordLayout}from'./studio';
import{visualGroups}from'./studio';
/** Copy identities owned by this design; shared Part/Asset/Point/Hole/source identities stay shared. */
export function duplicateSnapshot(source:DesignAggregate,target:Design,allocate:()=>string=()=>crypto.randomUUID()):DesignAggregate{
 const a=structuredClone(source),sections=[a.nodes,a.paths,a.pointAttachments,a.throughAttachments,a.pathAttachments,a.mirrorLinks],ids=sections.flatMap(s=>s.map(e=>e.id));
 if(new Set(ids).size!==ids.length||ids.some(id=>!id))throw Error('元デザインの識別情報を確認してください。');
 const oldMirror=a.design.editorConfig.mirror as MirrorState|undefined;
 const groupIds=[...new Set([...Object.keys(oldMirror?.groups??{}),...a.mirrorLinks.map(l=>l.mirrorGroupId)])];
 const groups=visualGroups(a),map=new Map<string,string>(),reserved=new Set([source.design.id,target.id,...ids,...groupIds,...groups.map(g=>g.id)]);
 const next=()=>{const id=allocate();if(!id||reserved.has(id))throw Error('複製の識別情報が重複しています。');reserved.add(id);return id;};
 for(const id of ids)map.set(id,next());
 const ref=(id:string)=>{const result=map.get(id);if(!result)throw Error('元デザインに参照先のない部品があります。');return result;};
 const groupMap=new Map(groupIds.map(id=>[id,next()]));
 a.nodes=a.nodes.map(n=>({...n,id:ref(n.id)}));a.paths=a.paths.map(p=>({...p,id:ref(p.id)}));
 a.pointAttachments=a.pointAttachments.map(e=>({...e,id:ref(e.id),nodeAId:ref(e.nodeAId),nodeBId:ref(e.nodeBId)}));
 a.throughAttachments=a.throughAttachments.map(e=>({...e,id:ref(e.id),nodeId:ref(e.nodeId),pathId:ref(e.pathId)}));
 a.pathAttachments=a.pathAttachments.map(e=>({...e,id:ref(e.id),nodeId:ref(e.nodeId),pathId:ref(e.pathId)}));
 a.mirrorLinks=a.mirrorLinks.map(e=>({...e,id:ref(e.id),mirrorGroupId:groupMap.get(e.mirrorGroupId)!,leftEntityId:ref(e.leftEntityId),rightEntityId:ref(e.rightEntityId)}));
 const config=a.design.editorConfig;
 if(oldMirror)config.mirror={...oldMirror,nodeFlipX:Object.fromEntries(Object.entries(oldMirror.nodeFlipX).map(([id,flip])=>[ref(id),flip])),groups:Object.fromEntries(Object.entries(oldMirror.groups).map(([id,g])=>[groupMap.get(id)!,{...g,left:{nodeIds:g.left.nodeIds.map(ref),pathIds:g.left.pathIds.map(ref)},right:{nodeIds:g.right.nodeIds.map(ref),pathIds:g.right.pathIds.map(ref)}}]))};
 const layout=config.cordLayoutV1 as CordLayout|undefined;if(layout)config.cordLayoutV1={...layout,patternNodeIds:layout.patternNodeIds.map(ref)};
 if(config.visualAssembliesV1)config.visualAssembliesV1={version:1,groups:groups.map(g=>({...g,id:next(),baseNodeId:ref(g.baseNodeId),decorationNodeIds:g.decorationNodeIds.map(ref)}))};
 for(const rows of[a.nodes,a.paths,a.pointAttachments,a.throughAttachments,a.pathAttachments,a.mirrorLinks])for(const row of rows){const db=row as unknown as Record<string,unknown>;delete db.designId;delete db.ownerId;delete db.createdAt;delete db.updatedAt;}
 a.design={...target,canvasConfig:a.design.canvasConfig,editorConfig:config,thumbnailPath:undefined};return a;
}
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
const fields={nodes:'id partId xMm yMm rotationDeg scaleX scaleY zIndex locked',paths:'id partId physicalLengthMm shape start end bendSide zIndex locked',pointAttachments:'id kind nodeAId pointAId nodeBId pointBId orientationMode relativeRotationDeg',throughAttachments:'id kind nodeId holeId pathId distanceMm orderIndex lockedToNeighbors flip180',pathAttachments:'id kind nodeId pointId pathId anchorKind distanceMm normalOffsetMm orientationMode rotationOffsetDeg',mirrorLinks:'id mirrorGroupId entityType leftEntityId rightEntityId manualMirrorPolicy'} as const;
export function snapshotFingerprint(a:DesignAggregate){const content:Record<string,unknown>={design:{id:a.design.id,name:a.design.name,type:a.design.type,canvasConfig:a.design.canvasConfig,editorConfig:a.design.editorConfig}};for(const key of Object.keys(fields)as(keyof typeof fields)[])content[key]=a[key].map(row=>Object.fromEntries(fields[key].split(' ').map(field=>[field,(row as unknown as Record<string,unknown>)[field]]))).sort((a,b)=>String(a.id).localeCompare(String(b.id)));return JSON.stringify(canonical(content));}
