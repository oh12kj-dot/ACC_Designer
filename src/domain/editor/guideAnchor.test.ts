import{expect,it}from'vitest';import type{Part}from'../../types/domain';import type{DesignAggregate}from'../../types/aggregate';
import{reviewedGuideAnchor,guideAnchorWorld}from'./guideAnchor';import{guidePose,layoutGeometry,type LayoutGuide}from'./layoutGuide';import{proposeBatch,type Placement}from'./placement';import{nearestDistance,pointAtDistance}from'../path/geometry';
const part={id:'p',geometryKind:'node',imageAssetId:'asset',widthMm:10,heightMm:8,throughHoles:[],metadata:{sourceDraftId:'draft',nominalPlacement:{photoSha256:'photo'},guideOrientation:{version:1,status:'reviewed-axis',axisDeg:0,imageAssetId:'asset',sourceDraftId:'draft',photoSha256:'photo',descriptionSha256:'text',evidenceText:'own horizontal hole',reviewedAt:'now'},guideAnchor:{version:1,status:'photo-estimate',xNorm:.5,yNorm:.1,imageAssetId:'asset',sourceDraftId:'draft',photoSha256:'photo',evidenceText:'own side/chain photos',reviewedAt:'now'}}} as unknown as Part;
const g:LayoutGuide={enabled:true,snap:true,rotate:true,offset:0,shape:'v',width:100,drop:50,center:{x:100,y:100}};
const a={design:{},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
it('snaps the estimated hole, not the center, and remains stable over repeated previews',()=>{
 const geometry=layoutGeometry(g)!;let pose=guidePose(g,geometry,{x:75,y:103.2},0,3,part);expect(pose.snapped).toBe(true);expect(pose.point.x).not.toBeCloseTo(75);expect(guideAnchorWorld(part,pose.point,pose.angle)).toEqual({x:75,y:100});const first=pose;
 for(let i=0;i<20;i++)pose=guidePose(g,geometry,pose.point,pose.angle,3,part);
 expect(pose.point.x).toBeCloseTo(first.point.x,8);expect(pose.point.y).toBeCloseTo(first.point.y,8);
 const noRotate=guidePose({...g,rotate:false},geometry,{x:75,y:103.2},0,3,part);expect(noRotate.angle).toBe(0);expect(noRotate.point.y).toBeCloseTo(103.2);
 const scaled=guidePose(g,geometry,{x:75,y:106.4},0,3,part,-1,2);expect(nearestDistance(geometry,guideAnchorWorld(part,scaled.point,scaled.angle,-1,2)).distanceToPathMm).toBeCloseTo(0);
});
it('does not apply stale, invalid or functional hole anchor metadata',()=>{
 for(const patch of[{imageAssetId:'other'},{photoSha256:'other'},{sourceDraftId:'other'},{xNorm:NaN},{yNorm:1.1},{status:'verified'}])expect(reviewedGuideAnchor({...part,metadata:{...part.metadata,guideAnchor:{...part.metadata!.guideAnchor,...patch}}} as Part)).toBeUndefined();
 expect(reviewedGuideAnchor({...part,throughHoles:[{axisDeg:0}]} as Part)).toBeUndefined();
 expect(guidePose(g,layoutGeometry(g),{x:75,y:100},0,3,{...part,heightMm:100}).snapped).toBe(false);
});
it('keeps the anchor stable at both ends and the V guide corner',()=>{
 const geometry=layoutGeometry(g)!;for(const d of[0,geometry.arcLengthMm/2,geometry.arcLengthMm]){const target=pointAtDistance(geometry,d).position;let pose=guidePose(g,geometry,{x:target.x,y:target.y+3.2},0,3,part);const first=pose;for(let i=0;i<20;i++)pose=guidePose(g,geometry,pose.point,pose.angle,3,part);const world=guideAnchorWorld(part,pose.point,pose.angle);expect(world.x).toBeCloseTo(target.x,8);expect(world.y).toBeCloseTo(target.y,8);expect(pose.angle).toBeCloseTo(first.angle,8);}
});
it('allows source-central layout projection without inventing an in-plane hole axis or rotating it',()=>{
 const central={...part,metadata:{...part.metadata,guideOrientation:undefined,guideAnchor:{...part.metadata!.guideAnchor!,xNorm:.5,yNorm:.5,rotationMode:'keep-current',referenceKind:'source-central-projection'}}} as Part;
 expect(reviewedGuideAnchor(central)).toBeTruthy();const pose=guidePose(g,layoutGeometry(g),{x:75,y:100},17,3,central);expect(pose.angle).toBe(17);expect(pose.point).toEqual({x:75,y:100});expect(central.throughHoles).toEqual([]);
 const visible={...central,metadata:{...central.metadata,guideAnchor:{...central.metadata!.guideAnchor!,referenceKind:'visible-opening',yNorm:.1}}} as Part;
 const upper=guidePose(g,layoutGeometry(g),{x:75,y:103},17,3,visible);expect(upper.angle).toBe(17);expect(upper.snapped).toBe(true);expect(guideAnchorWorld(visible,upper.point,upper.angle).y).toBeCloseTo(guideAnchorWorld(visible,upper.point,upper.angle).x+25,8);
 const repeated=guidePose(g,layoutGeometry(g),upper.point,upper.angle,3,visible);expect(repeated.point.x).toBeCloseTo(upper.point.x,8);expect(repeated.point.y).toBeCloseTo(upper.point.y,8);
 const stale={...central,metadata:{...central.metadata,guideAnchor:{...central.metadata!.guideAnchor!,imageAssetId:'other'}}} as Part;expect(reviewedGuideAnchor(stale)).toBeUndefined();expect(guidePose(g,layoutGeometry(g),{x:75,y:100},17,3,stale).angle).toBe(315);
 const noHole={...central,metadata:{...central.metadata,guideOrientation:{...part.metadata!.guideOrientation!,status:'no-through-hole'}}} as Part;expect(reviewedGuideAnchor(noHole)).toBeUndefined();
});
it('uses anchor arc distances for one copy and curved batches without creating attachments',()=>{
 const settings={...g,shape:'u' as const},geometry=layoutGeometry(settings)!,target=pointAtDistance(geometry,30).position,p:Placement={id:'one',part,point:{x:target.x,y:target.y+3.2},rotationDeg:0,length:1,shape:'straight',shallow:false};
 for(const count of[1,3]){const result=proposeBatch(a,{...p,count,spacingMm:5,copyIds:['one','two','three'].slice(0,count)},{settings,geometry,cssPxPerMm:3});
 const positions=result.nodes.map(n=>nearestDistance(geometry,guideAnchorWorld(part,{x:n.xMm,y:n.yMm},n.rotationDeg)));expect(positions.every(p=>p.distanceToPathMm<1e-7)).toBe(true);if(count>1)expect(positions[1].distanceMm-positions[0].distanceMm).toBeCloseTo(5,6);expect(result.throughAttachments).toEqual([]);}
 const blocked=proposeBatch(a,p,{settings,geometry,cssPxPerMm:3,allowSnap:false});expect(blocked.nodes[0].xMm).toBe(p.point.x);expect(blocked.nodes[0].yMm).toBe(p.point.y);
});
