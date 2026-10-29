import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll,afterAll,it,expect } from 'vitest';
import type { DesignPath } from '../types/domain';
import { derivePathGeometry,pointAtDistance } from '../domain/path/geometry';
let db:PGlite;
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon;create role authenticated;');await db.exec(readFileSync('supabase/migrations/202610050010_geometry_helpers.sql','utf8'));});afterAll(async()=>{await db.close();});
const input=(p:DesignPath)=>({shape:p.shape,physical_length_mm:p.physicalLengthMm,bend_side:p.bendSide,start_x_mm:p.start.x,start_y_mm:p.start.y,end_x_mm:p.end.x,end_y_mm:p.end.y});
it.each(['straight','u','v'] as const)('matches the %s client solver and physical-distance samples at boundaries and midpoints',async shape=>{
 const p={shape,start:{x:-10,y:5},end:{x:50,y:25},physicalLengthMm:shape==='straight'?Math.hypot(60,20):120,bendSide:1} as DesignPath,g=derivePathGeometry(p);
 const sql=(await db.query<{g:{points:number[][];cumulative:number[];arc_length_mm:number}}>('select public._design_path_geometry($1::jsonb) as g',[JSON.stringify(input(p))])).rows[0].g;
 expect(sql.arc_length_mm).toBeCloseTo(g.arcLengthMm,7);expect(sql.points).toHaveLength(g.points.length);sql.points.forEach((point,i)=>{expect(point[0]).toBeCloseTo(g.points[i].x,7);expect(point[1]).toBeCloseTo(g.points[i].y,7);});
 for(const fraction of [0,.25,.5,.75,1]){const actual=(await db.query<{sample:{x:number;y:number;tangent_x:number;tangent_y:number}}>('select public._design_path_sample($1::jsonb,$2,$3) as sample',[JSON.stringify(sql),p.physicalLengthMm*fraction,p.physicalLengthMm])).rows[0].sample,expected=pointAtDistance(g,g.arcLengthMm*fraction);expect(actual.x).toBeCloseTo(expected.position.x,7);expect(actual.y).toBeCloseTo(expected.position.y,7);expect(actual.tangent_x).toBeCloseTo(expected.tangent.x,7);expect(actual.tangent_y).toBeCloseTo(expected.tangent.y,7);}
});
it('rejects malformed, impossible, unknown and pending-vertical geometry',async()=>{
 const base={shape:'u',start_x_mm:0,start_y_mm:0,end_x_mm:50,end_y_mm:0,physical_length_mm:100,bend_side:1};
 for(const p of [{...base,physical_length_mm:10},{...base,physical_length_mm:'100'},{...base,bend_side:0},{...base,shape:'free'},{...base,end_x_mm:0,end_y_mm:50},{...base,shape:'straight'}])await expect(db.query('select public._design_path_geometry($1::jsonb)',[JSON.stringify(p)])).rejects.toThrow();
});
it('keeps internal helpers unavailable to anonymous and authenticated callers',async()=>{
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await expect(db.query(`select public._design_path_geometry('{}')`)).rejects.toThrow(/permission denied/);await db.exec('reset role');}
});
