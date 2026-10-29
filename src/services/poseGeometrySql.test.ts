import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll,afterAll,it,expect } from 'vitest';
import type { Part,DesignNode,ThroughHole,ConnectionPoint,PathAttachment } from '../types/domain';
import { reflectPartGeometry } from '../domain/geometry/nodePart';
import { normalizedPointToWorld } from '../domain/geometry/transforms';
import { throughPose,projectBoundsRelativeToHole } from '../domain/attachment/through';
import { pathAnchorPose } from '../domain/attachment/pathPose';
let db:PGlite;
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon;create role authenticated;');for(const file of ['010_geometry_helpers','011_pose_helpers'])await db.exec(readFileSync(`supabase/migrations/202610050${file}.sql`,'utf8'));});afterAll(async()=>{await db.close();});
const part={geometryKind:'node',widthMm:10,heightMm:8,connectionPoints:[{id:'cp',xNorm:.2,yNorm:.3,directionDeg:35}],throughHoles:[{id:'hole',entryXNorm:.1,exitXNorm:.4,entryYNorm:.3,exitYNorm:.3,axisDeg:0}]} as Part;
const node={xMm:23,yMm:31,rotationDeg:47,scaleX:1.2,scaleY:.8} as DesignNode;
const n={x_mm:23,y_mm:31,rotation_deg:47,scale_x:1.2,scale_y:.8},p={width_mm:10,height_mm:8},h={entry_x_norm:.1,exit_x_norm:.4,entry_y_norm:.3,exit_y_norm:.3,axis_deg:0},cp={x_norm:.2,y_norm:.3,direction_deg:35};
const sample={x:40,y:20,tangent_x:.6,tangent_y:.8};
const json=(v:unknown)=>JSON.stringify(v);
it.each([false,true])('matches reflected world point, through pose and asymmetric occupancy for flip=%s',async flip=>{
 const effective=flip?reflectPartGeometry(part):part,hole=effective.throughHoles[0] as ThroughHole;
 const point=(await db.query<{r:{x:number;y:number}}>('select public._design_node_point($1,$2,.2,.3,$3) r',[json(n),json(p),flip])).rows[0].r,expected=normalizedPointToWorld(node,effective,flip?.8:.2,.3);expect(point.x).toBeCloseTo(expected.x,7);expect(point.y).toBeCloseTo(expected.y,7);
 for(const reverse of [false,true]){const pose=(await db.query<{r:{x_mm:number;y_mm:number;rotation_deg:number}}>('select public._design_through_pose($1,$2,$3,$4,$5,$6) r',[json(n),json(p),json(h),json(sample),flip,reverse])).rows[0].r,js=throughPose(node,effective,hole,{x:40,y:20},{x:.6,y:.8},reverse);expect(pose.x_mm).toBeCloseTo(js.xMm,7);expect(pose.y_mm).toBeCloseTo(js.yMm,7);expect(pose.rotation_deg).toBeCloseTo(js.rotationDeg,7);
 const interval=(await db.query<{r:{start_mm:number;end_mm:number}}>('select public._design_through_interval($1,$2,$3,$4,30,$5) r',[json({...n,...pose}),json(p),json(h),json(sample),flip])).rows[0].r,bounds=projectBoundsRelativeToHole(js,effective,hole,{x:.6,y:.8});expect(interval.start_mm).toBeCloseTo(30-bounds.beforeMm,7);expect(interval.end_mm).toBeCloseTo(30+bounds.afterMm,7);}
});
it.each(['world_down','path_normal','path_tangent','keep_rotation'] as const)('matches %s anchor direction and signed normal offsets on both local orientations',async orientation=>{
 for(const flip of [false,true])for(const offset of [-2,2]){const a={anchorKind:'position',distanceMm:50,normalOffsetMm:offset,orientationMode:orientation,rotationOffsetDeg:15} as PathAttachment,path={id:'p',partId:'wire',start:{x:10,y:-20},end:{x:70,y:60},physicalLengthMm:100,shape:'straight' as const,zIndex:0,locked:false},effective=flip?reflectPartGeometry(part):part,js=pathAnchorPose(node,effective,effective.connectionPoints[0] as ConnectionPoint,path,a);
 const result=(await db.query<{r:{x_mm:number;y_mm:number;rotation_deg:number}}>('select public._design_anchor_pose($1,$2,$3,$4,$5,$6) r',[json(n),json(p),json(cp),json(sample),json({normal_offset_mm:offset,rotation_offset_deg:15,orientation_mode:orientation}),flip])).rows[0].r;expect(result.x_mm).toBeCloseTo(js.xMm,7);expect(result.y_mm).toBeCloseTo(js.yMm,7);expect(result.rotation_deg).toBeCloseTo(js.rotationDeg,7);}
});
it('rejects invalid node geometry and denies execution to authenticated callers',async()=>{
 for(const value of [{...n,scale_x:0},{...n,x_mm:'23'}])await expect(db.query('select public._design_node_point($1,$2,.2,.3,false)',[json(value),json(p)])).rejects.toThrow();await expect(db.query('select public._design_node_point($1,$2,2,.3,false)',[json(n),json(p)])).rejects.toThrow();
 await db.exec('set role authenticated');await expect(db.query('select public._design_through_pose($1,$2,$3,$4,false,false)',[json(n),json(p),json(h),json(sample)])).rejects.toThrow(/permission denied/);await db.exec('reset role');
});
