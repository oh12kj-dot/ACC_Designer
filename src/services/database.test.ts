import { createMirror,makeMirrorIndependent } from '../domain/editor/createMirror';
import { fromRow,toRow } from './databaseMapping';
import type { DesignAggregate } from '../types/aggregate';
import type { Part } from '../types/domain';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const userA = '10000000-0000-4000-8000-000000000001';
const userB = '10000000-0000-4000-8000-000000000002';
let db: PGlite;
let partA: string;
let partB: string;
let designA: string;
let assetA: string;
let designB: string;
const id = () => crypto.randomUUID();

async function actor(user: string | null) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec('set role authenticated');
}
async function admin() { await db.exec('reset role'); }
async function createPart(name: string, kind: 'node' | 'path' = 'node') {
  const assetId = id();
  const user = (await db.query<{ uid: string }>('select auth.uid()')).rows[0].uid;
  const root = `users/${user}/parts/${assetId}/`;
  const payload = {
    image_asset: { id: assetId, asset_kind: 'part_main', content_hash: 'fixture-hash', original_path: root+'original.png', normalized_high_path: root+'high.png', normalized_medium_path: root+'medium.png', thumbnail_path: root+'thumbnail.png', pixel_width: 100, pixel_height: 200, calibration_mm_per_px: 0.1 },
    part: { name, category: kind === 'node' ? 'bead' : 'wire', geometry_kind: kind, image_asset_id: assetId, width_mm: kind === 'node' ? 10 : null, height_mm: kind === 'node' ? 20 : null },
    purchase_spec: { sale_mode: 'pack', pack_quantity: 20, minimum_units: 1, unit_price: 220, currency: 'JPY' },
    connection_points: [{ name: 'top', type: 'loop', x_norm: 0.5, y_norm: 0, direction_deg: 270, max_connections: 1 }],
    through_holes: [{ name: 'hole', entry_x_norm: 0, entry_y_norm: 0.5, exit_x_norm: 1, exit_y_norm: 0.5, diameter_mm: null, axis_deg: 0 }],
    ...(kind === 'path' ? { path_spec: { render_mode: 'solid_stroke', nominal_diameter_mm: 0.5, opacity: 1, texture_overlap_mm: 0, start_max_connections: 0, end_max_connections: 0 } } : {}),
  };
  const result = await db.query<{ result: { part_id: string } }>('select public.save_part_successor(null,$1::jsonb) as result', [JSON.stringify(payload)]);
  return { partId: result.rows[0].result.part_id, assetId, payload };
}
async function createDesign(name: string) {
  const result = await db.query<{ id: string }>("select id from public.create_design($1,'necklace')",[name]);
  return result.rows[0].id;
}
function snapshot(designId: string, nodes: object[] = []) {
  return { design: { id: designId, name: 'Saved design', type: 'necklace', canvas_config: {}, editor_config: {} }, nodes, paths: [], point_attachments: [], through_attachments: [], path_attachments: [], mirror_links: [] };
}
function node(part: string, nodeId = id()) {
  return { id: nodeId, part_id: part, x_mm: 1, y_mm: 2, rotation_deg: 90, scale_x: 1, scale_y: 1, z_index: 0, locked: false };
}
async function save(design: string, revision: number, payload: object, overwrite = false) {
  return db.query<{ result: { revision: number } }>('select public.save_design_aggregate($1,$2,$3::jsonb,$4) as result',[design,revision,JSON.stringify(payload),overwrite]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  await db.query('insert into auth.users values ($1),($2)',[userA,userB]);
  for (const name of readdirSync('supabase/migrations').sort()) {
    if (name.endsWith('_storage.sql')) continue; // Full Storage/auth fixture tested separately.
    await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  }
  await actor(userA);
  const first = await createPart('Part A'); partA = first.partId; assetA = first.assetId;
  designA = await createDesign('Design A');
  await actor(userB); partB = (await createPart('Part B')).partId; designB = await createDesign('Design B');
}, 30000);
afterAll(async () => { await db?.close(); });

describe('PostgreSQL migrations / RLS / atomic RPC', { concurrent: false }, () => {
  it('records refresh evidence without mutating Part and rejects other owners', async () => {
    await actor(userA);
    const before=(await db.query('select * from public.parts where id=$1',[partA])).rows;
    const payload={source_url:'https://kiwaseisakujo.jp/item',fetched_at:'2026-10-05T00:00:00Z',parser_version:'kiwa-v1',raw_fields:{candidate:{name:'Changed'}},status:'partial'};
    await db.query('select public.record_part_source_snapshot($1,$2::jsonb)',[partA,JSON.stringify(payload)]);
    expect((await db.query('select * from public.parts where id=$1',[partA])).rows).toEqual(before);
    expect((await db.query('select * from public.part_source_snapshots where part_id=$1',[partA])).rows).toHaveLength(1);
    await expect(db.query('select public.record_part_source_snapshot($1,$2::jsonb)',[partA,JSON.stringify({...payload,part_id:partB})])).rejects.toThrow(/INVALID_SNAPSHOT/);
    await actor(userB);
    await expect(db.query('select public.record_part_source_snapshot($1,$2::jsonb)',[partA,JSON.stringify(payload)])).rejects.toThrow(/PART_NOT_FOUND/);
  });
  it('persists physical and local dimensions with explicit zero and NULL missingness', async () => {
    await actor(userA);
    const result=await createPart('Physical fixture');
    await db.query('select public.save_part_successor($1,$2::jsonb)',[result.partId,JSON.stringify({part:{depth_mm:0,weight_g:0.25,thickness_mm:null},connection_points:[{name:'loop',type:'loop',x_norm:0.5,y_norm:0,direction_deg:270,max_connections:1,local_inner_diameter_mm:1.2,local_thickness_mm:0}]})]);
    const part=(await db.query('select depth_mm,weight_g,thickness_mm from public.parts where id=$1',[result.partId])).rows[0];expect(part).toEqual({depth_mm:'0',weight_g:'0.25',thickness_mm:null});
    const point=(await db.query('select local_inner_diameter_mm,local_thickness_mm from public.part_connection_points where part_id=$1',[result.partId])).rows[0];expect(point).toEqual({local_inner_diameter_mm:'1.2',local_thickness_mm:'0'});
    await db.query('select public.remove_unreferenced_part($1)',[result.partId]);
  });
  it('sets favorites and server-time recent usage only for owned active Parts',async()=>{
    await actor(userA);const fixture=(await createPart('Favorite fixture')).partId;await db.query('select public.set_part_user_state($1,true,false)',[fixture]);
    await db.query('select public.set_part_user_state($1,null,true)',[fixture]);
    const row=(await db.query<{favorite:boolean;last_used_at:unknown;use_count:unknown}>('select favorite,last_used_at,use_count from public.part_user_state where part_id=$1',[fixture])).rows[0];expect(row.favorite).toBe(true);expect(row.last_used_at).not.toBeNull();expect(String(row.use_count)).toBe('1');
    await actor(userB);await expect(db.query('select public.set_part_user_state($1,false,false)',[fixture])).rejects.toThrow(/PART_NOT_FOUND/);await actor(userA);await db.query('select public.remove_unreferenced_part($1)',[fixture]);
  });
  it('creates all 15 domain tables', async () => {
    await admin();
    const tables = await db.query("select tablename from pg_tables where schemaname='public'");
    expect(tables.rows).toHaveLength(15);
  });
  it('shows only owned entities through RLS and rejects direct writes', async () => {
    await actor(userA);
    expect((await db.query<{ id: string }>('select id from public.parts')).rows.map(r=>r.id)).toEqual([partA]);
    expect((await db.query('select * from public.designs where id=$1',[designB])).rows).toHaveLength(0);
    await expect(db.query('update public.parts set name=$1 where id=$2',['tampered',partA])).rejects.toThrow(/permission denied/);
  });
  it('rejects anonymous RPC execution', async () => {
    await admin(); await db.exec('set role anon');
    await expect(createDesign('anonymous')).rejects.toThrow(/permission denied/);
  });
  it('rejects unauthenticated and other-owner mutations', async () => {
    await actor(null); await expect(createDesign('no uid')).rejects.toThrow(/AUTH_REQUIRED/);
    await actor(userB); await expect(save(designA,0,snapshot(designA))).rejects.toThrow(/DESIGN_NOT_FOUND/);
    await expect(db.query('select public.save_part_successor($1,$2::jsonb)',[partA,JSON.stringify({part:{name:'stolen'}})])).rejects.toThrow(/PART_NOT_FOUND/);
  });
  it('saves a complete free-node snapshot and increments revision', async () => {
    await actor(userA);
    const result = await save(designA,0,snapshot(designA,[node(partA)]));
    expect(result.rows[0].result.revision).toBe(1);
    expect((await db.query('select * from public.design_nodes where design_id=$1',[designA])).rows).toHaveLength(1);
  });
  it('rejects stale ordinary saves and allows only explicit owner overwrite against the current revision', async () => {
    await actor(userA);
    await expect(save(designA,0,snapshot(designA))).rejects.toThrow(/REVISION_CONFLICT/);
    const overwriteDesign=await createDesign('Overwrite fixture');await save(overwriteDesign,0,snapshot(overwriteDesign));expect((await save(overwriteDesign,0,snapshot(overwriteDesign),true)).rows[0].result.revision).toBe(2);await actor(userB);await expect(save(overwriteDesign,0,snapshot(overwriteDesign),true)).rejects.toThrow(/DESIGN_NOT_FOUND/);await actor(userA);
    expect((await db.query<{ revision: number }>('select revision from public.designs where id=$1',[designA])).rows[0].revision).toBe(1);
  });
  it('rolls back deletions, partial inserts and revision on owner mismatch', async () => {
    await actor(userA);
    const before = (await db.query('select * from public.design_nodes where design_id=$1',[designA])).rows;
    await expect(save(designA,1,snapshot(designA,[node(partA),node(partB)]))).rejects.toThrow(/NODE_PART_NOT_OWNED/);
    expect((await db.query('select * from public.design_nodes where design_id=$1',[designA])).rows).toEqual(before);
    expect((await db.query<{ revision: number }>('select revision from public.designs where id=$1',[designA])).rows[0].revision).toBe(1);
  });
  it('rejects incomplete snapshots and malformed geometry without deleting saved data', async () => {
    await actor(userA);
    const incomplete: Record<string,unknown> = snapshot(designA); delete incomplete.paths;
    await expect(save(designA,1,incomplete)).rejects.toThrow(/INCOMPLETE_SNAPSHOT/);
    await expect(save(designA,1,{...snapshot(designA),paths:[{}]})).rejects.toThrow(/INVALID_ENTITY/);
    expect((await db.query('select * from public.design_nodes where design_id=$1',[designA])).rows).toHaveLength(1);
  });
  it('protects referenced Part, child definitions and image assets even in privileged SQL', async () => {
    await admin();
    await expect(db.query("update public.parts set width_mm=11 where id=$1",[partA])).rejects.toThrow(/REFERENCED_PART_IMMUTABLE/);
    await expect(db.query("update public.part_purchase_specs set unit_price=300 where part_id=$1",[partA])).rejects.toThrow(/REFERENCED_PART_IMMUTABLE/);
    await expect(db.query("delete from public.part_through_holes where part_id=$1",[partA])).rejects.toThrow(/REFERENCED_PART_IMMUTABLE/);
    await expect(db.query("update public.part_image_assets set content_hash='changed' where id=$1",[assetA])).rejects.toThrow(/ASSET_IMMUTABLE/);
    await expect(db.query("delete from public.part_image_assets where id=$1",[assetA])).rejects.toThrow(/REFERENCED_ASSET_IMMUTABLE/);
  });
  it('clones successor definitions and favorite while preserving old designs', async () => {
    await admin();
    await db.query('insert into public.part_user_state(user_id,part_id,favorite) values($1,$2,true)',[userA,partA]);
    await actor(userA);
    const result = await db.query<{ result: { part_id: string; created_successor: boolean } }>('select public.save_part_successor($1,$2::jsonb) as result',[partA,JSON.stringify({part:{name:'Successor',width_mm:12}})]);
    const next = result.rows[0].result;
    expect(next.created_successor).toBe(true); expect(next.part_id).not.toBe(partA);
    for (const table of ['part_purchase_specs','part_connection_points','part_through_holes']) {
      expect((await db.query(`select * from public.${table} where part_id=$1`,[next.part_id])).rows).toHaveLength(1);
    }
    const old = (await db.query<{ width_mm: string; is_archived: boolean }>('select width_mm,is_archived from public.parts where id=$1',[partA])).rows[0];
    expect(Number(old.width_mm)).toBe(10); expect(old.is_archived).toBe(true);
    expect((await db.query<{ part_id: string }>('select part_id from public.design_nodes where design_id=$1',[designA])).rows[0].part_id).toBe(partA);
    expect((await db.query<{ favorite: boolean }>('select favorite from public.part_user_state where part_id=$1',[next.part_id])).rows[0].favorite).toBe(true);
    expect((await db.query<{ image_asset_id: string }>('select image_asset_id from public.parts where id=$1',[next.part_id])).rows[0].image_asset_id).toBe(assetA);
  });
  it('preserves archived instances but rejects new archived use', async () => {
    await actor(userA);
    const saved = (await db.query<{a:{nodes:Record<string,unknown>[]}}>('select public.get_design_aggregate($1) a',[designA])).rows[0].a.nodes;
    await save(designA,1,snapshot(designA,saved));
    await expect(save(designA,2,snapshot(designA,[...saved,node(partA)]))).rejects.toThrow(/ARCHIVED_PART_NEW_USE/);
  });
  it('rolls back new asset and Part when a dependent definition fails', async () => {
    await actor(userA);
    const before = (await db.query('select * from public.part_image_assets')).rows.length;
    const a = id(); const root = `users/${userA}/parts/${a}/`;
    await expect(db.query('select public.save_part_successor(null,$1::jsonb)',[JSON.stringify({
      image_asset:{id:a,asset_kind:'part_main',content_hash:'x',original_path:root+'o',normalized_high_path:root+'h',normalized_medium_path:root+'m',thumbnail_path:root+'t',pixel_width:1,pixel_height:1,calibration_mm_per_px:1},
      part:{name:'Invalid',category:'bead',geometry_kind:'node',width_mm:1,height_mm:1,image_asset_id:a},
      purchase_spec:{sale_mode:'pack',pack_quantity:0,minimum_units:1,currency:'JPY'},
    })])).rejects.toThrow(/check constraint/);
    expect((await db.query('select * from public.part_image_assets')).rows.length).toBe(before);
    expect((await db.query('select * from public.parts where image_asset_id=$1',[a])).rows).toHaveLength(0);
  });
  it('allows path Part with null width/height and requires a rendering spec', async () => {
    await actor(userA);
    const path = await createPart('Wire','path');
    expect((await db.query<{ width_mm: null }>('select width_mm from public.parts where id=$1',[path.partId])).rows[0].width_mm).toBeNull();
    await expect(db.query('select public.save_part_successor($1,$2::jsonb)',[path.partId,JSON.stringify({part:{name:'broken'},path_spec:null})])).rejects.toThrow(/PATH_SPEC_REQUIRED/);
    expect((await db.query('select * from public.part_path_specs where part_id=$1',[path.partId])).rows).toHaveLength(1);
  });
  it('updates an unreferenced Part without changing its identity', async () => {
    await actor(userB);
    const result = await db.query<{ result: { part_id: string; created_successor: boolean } }>('select public.save_part_successor($1,$2::jsonb) as result',[partB,JSON.stringify({part:{name:'updated'}})]);
    expect(result.rows[0].result).toEqual({part_id:partB,created_successor:false});
  });
  it('snapshot omission deletes nodes atomically', async () => {
    await actor(userA);
    await save(designA,2,snapshot(designA));
    expect((await db.query('select * from public.design_nodes where design_id=$1',[designA])).rows).toHaveLength(0);
  });
  it('rejects numeric NaN, authority fields and foreign-owner assets', async () => {
    await actor(userB);
    await expect(db.query('select public.save_part_successor($1,$2::jsonb)',[partB,JSON.stringify({part:{width_mm:'NaN'}})])).rejects.toThrow(/check constraint/);
    await expect(db.query('select public.save_part_successor($1,$2::jsonb)',[partB,JSON.stringify({part:{user_id:userA}})])).rejects.toThrow(/PART_AUTHORITY_FIELD/);
    await expect(db.query('select public.save_part_successor($1,$2::jsonb)',[partB,JSON.stringify({part:{image_asset_id:assetA}})])).rejects.toThrow(/MAIN_ASSET_INVALID/);
  });
  it('reads a consistent aggregate with all sections and hides another owner', async () => {
    await actor(userA);
    const loaded = await db.query<{ result: Record<string,unknown> }>('select public.get_design_aggregate($1) as result',[designA]);
    expect(loaded.rows[0].result).toMatchObject({nodes:[],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]});
    expect((await db.query<{ result: unknown }>('select public.get_design_aggregate($1) as result',[designB])).rows[0].result).toBeNull();
    expect((await db.query<{ result: unknown }>('select public.get_part_aggregate($1) as result',[partB])).rows[0].result).toBeNull();
    const own = await db.query<{ result: {purchase_spec: {unit_price:number}; through_holes:{diameter_mm:unknown}[]} }>('select public.get_part_aggregate($1) as result',[partA]);
    expect(own.rows[0].result.purchase_spec.unit_price).toBe(220);
    expect(own.rows[0].result.through_holes[0].diameter_mm).toBeNull();
  });
  it('clones Path render specs in a referenced successor and preserves old geometry', async () => {
    await actor(userA);
    const path = await createPart('Path successor fixture','path');
    const design = await createDesign('Path fixture');
    await admin();
    // Privileged fixture seeds a persisted Path to test Part reference protection.
    await db.query("insert into public.design_paths(design_id,part_id,physical_length_mm,shape,start_x_mm,start_y_mm,end_x_mm,end_y_mm,z_index) values($1,$2,100,'straight',0,0,100,0,0)",[design,path.partId]);
    await actor(userA);
    const result = await db.query<{ result:{part_id:string} }>('select public.save_part_successor($1,$2::jsonb) as result',[path.partId,JSON.stringify({part:{name:'New path'}})]);
    const specs = await db.query<{part_id:string;nominal_diameter_mm:string}>('select part_id,nominal_diameter_mm from public.part_path_specs where part_id in ($1,$2)',[path.partId,result.rows[0].result.part_id]);
    expect(specs.rows).toHaveLength(2);
    expect(specs.rows.every(row=>Number(row.nominal_diameter_mm)===0.5)).toBe(true);
    await expect(db.query('select public.remove_unreferenced_part($1)',[path.partId])).rejects.toThrow(/REFERENCED_PART_IMMUTABLE/);
    expect((await save(design,0,snapshot(design))).rows[0].result.revision).toBe(1);
  });
  it('keeps the referenced Part active if a successor transaction fails', async () => {
    await actor(userB);
    const design=await createDesign('Part rollback fixture');
    await save(design,0,snapshot(design,[node(partB)]));
    const before=(await db.query('select * from public.parts')).rows.length;
    await expect(db.query('select public.save_part_successor($1,$2::jsonb)',[partB,JSON.stringify({part:{name:'Failed successor'},purchase_spec:{sale_mode:'pack',pack_quantity:0,minimum_units:1,currency:'JPY'}})])).rejects.toThrow(/check constraint/);
    expect((await db.query('select * from public.parts')).rows).toHaveLength(before);
    expect((await db.query<{is_archived:boolean}>('select is_archived from public.parts where id=$1',[partB])).rows[0].is_archived).toBe(false);
  });
  it('rejects cross-design ID reuse and rolls back the target snapshot', async () => {
    await actor(userB);
    const original=(await db.query<{id:string}>('select id from public.design_nodes')).rows[0].id;
    await expect(save(designB,0,snapshot(designB,[node(partB,original)]))).rejects.toThrow(/duplicate key/);
    expect((await db.query('select * from public.design_nodes where design_id=$1',[designB])).rows).toHaveLength(0);
    expect((await db.query<{revision:number}>('select revision from public.designs where id=$1',[designB])).rows[0].revision).toBe(0);
  });
  async function connectedSnapshot(){
    await actor(userA);const bead=await createPart('Geometry bead'),wire=await createPart('Geometry wire','path');
    const cp=(await db.query<{id:string}>('select id from public.part_connection_points where part_id=$1',[bead.partId])).rows[0].id,hole=(await db.query<{id:string}>('select id from public.part_through_holes where part_id=$1',[bead.partId])).rows[0].id;
    const a=id(),b=id(),anchor=id(),path=id();
    const payload={...snapshot(designA,[{...node(bead.partId,a),x_mm:30,y_mm:0,rotation_deg:0},{...node(bead.partId,b),x_mm:30,y_mm:0,rotation_deg:0},{...node(bead.partId,anchor),x_mm:70,y_mm:10,rotation_deg:0}]),paths:[{id:path,part_id:wire.partId,start_x_mm:0,start_y_mm:0,end_x_mm:100,end_y_mm:0,physical_length_mm:100,shape:'straight',z_index:0,locked:false}],point_attachments:[{id:id(),node_a_id:a,node_b_id:b,point_a_id:cp,point_b_id:cp,orientation_mode:'keep_rotation',relative_rotation_deg:0}],through_attachments:[{id:id(),node_id:a,hole_id:hole,path_id:path,distance_mm:30,order_index:0,flip_180:false,locked_to_neighbors:false}],path_attachments:[{id:id(),node_id:anchor,point_id:cp,path_id:path,anchor_kind:'position',distance_mm:70,normal_offset_mm:0,rotation_offset_deg:0,orientation_mode:'world_down'}]};
    await admin();return{payload,bead,wire,cp,hole,a,b,anchor,path};
  }
  it('rejects provably impossible chain position connections in the save RPC and rolls back revision and rows',async()=>{
    const {payload,bead,wire,cp}=await connectedSnapshot();
    await db.query("update public.parts set category='chain',thickness_mm=.5 where id=$1",[wire.partId]);
    await db.query("update public.parts set category='jump_ring',inner_diameter_mm=2,opening_width_mm=1 where id=$1",[bead.partId]);
    await db.query('update public.part_connection_points set local_inner_diameter_mm=null where id=$1',[cp]);
    const design=await createDesign('Position compatibility');payload.design.id=design;
    await actor(userA);await save(design,0,payload);const before=(await db.query<{a:unknown}>('select public.get_design_aggregate($1) a',[design])).rows[0].a;
    // Unknown envelope dimensions remain allowed, but a known necessary inequality must reject.
    await admin();
    // Modify only an unreferenced replacement to avoid violating referenced Part protection.
    await actor(userA);const bad=await createPart('Too small ring');await admin();
    await db.query("update public.parts set category='jump_ring',inner_diameter_mm=.2,opening_width_mm=1 where id=$1",[bad.partId]);
    const badCp=(await db.query<{id:string}>('select id from public.part_connection_points where part_id=$1',[bad.partId])).rows[0].id;
    const invalid=structuredClone(payload);(invalid.nodes[2] as Record<string,unknown>).part_id=bad.partId;invalid.path_attachments[0].point_id=badCp;
    await actor(userA);await expect(save(design,1,invalid)).rejects.toThrow(/INCOMPATIBLE_PATH_POSITION/);
    expect((await db.query<{a:unknown}>('select public.get_design_aggregate($1) a',[design])).rows[0].a).toEqual(before);
    await admin();
  });
  it('atomic save honors configured clearance and pin diameter and rolls back rejected settings',async()=>{
    const {payload,wire,hole}=await connectedSnapshot();
    await db.query("update public.parts set category='eye_pin',pin_diameter_mm=.2,wire_diameter_mm=2 where id=$1",[wire.partId]);
    await db.query('update public.part_through_holes set diameter_mm=1 where id=$1',[hole]);
    const design=await createDesign('Clearance boundary');payload.design.id=design;payload.design.editor_config={compatibility:{clearanceMm:.8}};
    await actor(userA);await save(design,0,payload);const before=(await db.query<{a:unknown}>('select public.get_design_aggregate($1) a',[design])).rows[0].a;
    payload.design.editor_config={compatibility:{clearanceMm:.81}};await expect(save(design,1,payload)).rejects.toThrow(/INCOMPATIBLE_THROUGH/);
    payload.design.editor_config={compatibility:{clearanceMm:-1}};await expect(save(design,1,payload)).rejects.toThrow(/INVALID_CLEARANCE/);
    expect((await db.query<{a:unknown}>('select public.get_design_aggregate($1) a',[design])).rows[0].a).toEqual(before);await admin();
  });
  it('validates owned Point/Through/Path poses against actual Part definitions without writing snapshot rows',async()=>{
    const {payload}=await connectedSnapshot(),before=(await db.query('select * from public.design_nodes')).rows;
    await db.query('select public._validate_design_geometry($1)',[JSON.stringify(payload)]);expect((await db.query('select * from public.design_nodes')).rows).toEqual(before);
    const invalid=structuredClone(payload);(invalid.nodes[2] as Record<string,unknown>).x_mm=71;await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(invalid)])).rejects.toThrow(/ANCHOR_POSE_MISMATCH/);
    const wrongPart=structuredClone(payload);(wrongPart.nodes[0] as Record<string,unknown>).part_id=partB;await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(wrongPart)])).rejects.toThrow(/NOT_OWNED/);
    const wrongPoint=structuredClone(payload);wrongPoint.point_attachments[0].point_b_id=id();await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(wrongPoint)])).rejects.toThrow(/POINT_NOT_IN_PART/);
  });
  it('rejects duplicate bindings, occupation outside a Path, overlap, known incompatibility and capacity excess',async()=>{
    const {payload,bead,cp}=await connectedSnapshot();
    const duplicate=structuredClone(payload);duplicate.through_attachments.push({...duplicate.through_attachments[0],id:id()});await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(duplicate)])).rejects.toThrow(/DUPLICATE_PATH_BINDING/);
    const outside=structuredClone(payload);outside.through_attachments[0].distance_mm=2;(outside.nodes[0] as Record<string,unknown>).x_mm=2;(outside.nodes[1] as Record<string,unknown>).x_mm=2;await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(outside)])).rejects.toThrow(/THROUGH_OUT_OF_PATH/);
    const overlap=structuredClone(payload);overlap.through_attachments.push({...overlap.through_attachments[0],id:id(),node_id:overlap.point_attachments[0].node_b_id});await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(overlap)])).rejects.toThrow(/THROUGH_OVERLAP/);
    await db.query('update public.part_connection_points set max_connections=0 where id=$1',[cp]);await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(payload)])).rejects.toThrow(/POINT_CAPACITY_EXCEEDED/);await db.query('update public.part_connection_points set max_connections=1 where id=$1',[cp]);
    await db.query('update public.part_through_holes set diameter_mm=.3 where part_id=$1',[bead.partId]);await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(payload)])).rejects.toThrow(/INCOMPATIBLE_THROUGH/);
    await db.exec('set role authenticated');await expect(db.query('select public._validate_design_geometry($1)',[JSON.stringify(payload)])).rejects.toThrow(/permission denied/);await admin();
  });

  it('validates client-generated Mirror geometry for all five entity types and independent reflection state',async()=>{
    const {payload,bead,wire}=await connectedSnapshot();await db.query("update public.parts set mirror_policy='mirror_image' where id=$1",[bead.partId]);
    const partRows=(await db.query<Record<string,unknown>>('select * from public.parts where id=any($1::uuid[])',[[bead.partId,wire.partId]])).rows;
    const parts:Part[]=[];for(const row of partRows){const aggregate=(await db.query<{a:{part:Record<string,unknown>;connection_points:Record<string,unknown>[];through_holes:Record<string,unknown>[];path_spec:Record<string,unknown>|null}}>('select public.get_part_aggregate($1) a',[row.id])).rows[0].a;parts.push({...fromRow(aggregate.part),connectionPoints:aggregate.connection_points.map(fromRow),throughHoles:aggregate.through_holes.map(fromRow),...(aggregate.path_spec?{pathRenderSpec:fromRow(aggregate.path_spec)}:{})} as unknown as Part);}
    const aggregate={design:fromRow(payload.design),nodes:payload.nodes.map(n=>fromRow(n as Record<string,unknown>)),paths:payload.paths.map(p=>({...fromRow(p),start:{x:p.start_x_mm,y:p.start_y_mm},end:{x:p.end_x_mm,y:p.end_y_mm}})),pointAttachments:payload.point_attachments.map(fromRow),throughAttachments:payload.through_attachments.map(fromRow),pathAttachments:payload.path_attachments.map(fromRow),mirrorLinks:[]} as unknown as DesignAggregate;
    const mirrored=createMirror(aggregate,parts,{nodeId:aggregate.nodes[0].id},150);
    const encode=(a:DesignAggregate)=>({design:toRow(a.design),nodes:a.nodes.map(toRow),paths:a.paths.map(p=>({...toRow(p),start_x_mm:p.start.x,start_y_mm:p.start.y,end_x_mm:p.end.x,end_y_mm:p.end.y})),point_attachments:a.pointAttachments.map(toRow),through_attachments:a.throughAttachments.map(toRow),path_attachments:a.pathAttachments.map(toRow),mirror_links:a.mirrorLinks.map(toRow)});
    const valid=encode(mirrored);await db.query('select public._validate_design_snapshot($1)',[JSON.stringify(valid)]);
    const missing=structuredClone(valid);missing.mirror_links.pop();await expect(db.query('select public._validate_design_snapshot($1)',[JSON.stringify(missing)])).rejects.toThrow(/MISSING_MIRROR_CORRESPONDENCE/);
    const z=structuredClone(valid);z.nodes[3].z_index=4;await expect(db.query('select public._validate_design_snapshot($1)',[JSON.stringify(z)])).rejects.toThrow(/MIRROR_ENTITY_MISMATCH/);
    const duplicate=structuredClone(valid);duplicate.mirror_links.push({...duplicate.mirror_links[0],id:id()});await expect(db.query('select public._validate_design_snapshot($1)',[JSON.stringify(duplicate)])).rejects.toThrow(/DUPLICATE_MIRROR_CORRESPONDENCE/);
    const groupId=mirrored.mirrorLinks[0].mirrorGroupId;const independent=makeMirrorIndependent(mirrored,groupId);await db.query('select public._validate_design_snapshot($1)',[JSON.stringify(encode(independent))]);
    const crossIndependent=encode(independent);const crossState=crossIndependent.design.editor_config as {mirror:{groups:Record<string,{left:{nodeIds:string[]};right:{nodeIds:string[]}}>}};
    const movedId=independent.pointAttachments[0].nodeBId;const crossGroup=crossState.mirror.groups[groupId];crossGroup.left.nodeIds=crossGroup.left.nodeIds.filter(n=>n!==movedId);crossGroup.right.nodeIds.push(movedId);
    await expect(db.query('select public._validate_design_snapshot($1)',[JSON.stringify(crossIndependent)])).rejects.toThrow(/CROSS_SIDE_MIRROR_ATTACHMENT/);
    await actor(userA);const mirrorDesign=await createDesign('Full mirror round trip');valid.design.id=mirrorDesign;
    const saved=await save(mirrorDesign,0,valid);expect(saved.rows[0].result.revision).toBe(1);
    const loaded=(await db.query<{a:Record<string,unknown>}>('select public.get_design_aggregate($1) a',[mirrorDesign])).rows[0].a;
    expect((loaded.nodes as unknown[]).length).toBe(6);expect((loaded.paths as unknown[]).length).toBe(2);expect((loaded.point_attachments as unknown[]).length).toBe(2);expect((loaded.through_attachments as unknown[]).length).toBe(2);expect((loaded.path_attachments as unknown[]).length).toBe(2);expect((loaded.mirror_links as unknown[]).length).toBe(7);expect((loaded.design as Record<string,unknown>).editor_config).toEqual(valid.design.editor_config);
    await admin();await db.exec(`create function public.fixture_mirror_insert_failure() returns trigger language plpgsql as $$begin raise exception 'FIXTURE_LATE_INSERT_FAILURE';end;$$;create trigger fixture_mirror_insert_failure after insert on public.design_mirror_links for each row when (new.metadata->>'fixture_fail'='true') execute function public.fixture_mirror_insert_failure();`);
    const lateFailure=structuredClone(valid);lateFailure.mirror_links[0].metadata={fixture_fail:true};await actor(userA);await expect(save(mirrorDesign,1,lateFailure)).rejects.toThrow(/FIXTURE_LATE_INSERT_FAILURE/);
    expect((await db.query<{a:unknown}>('select public.get_design_aggregate($1) a',[mirrorDesign])).rows[0].a).toEqual(loaded);
    await admin();await db.exec('drop trigger fixture_mirror_insert_failure on public.design_mirror_links;drop function public.fixture_mirror_insert_failure();');
    const orphan=structuredClone(valid);(orphan.design.editor_config as {mirror:{groups:Record<string,{right:{nodeIds:string[]}}>}}).mirror.groups[groupId].right.nodeIds.push(id());await expect(db.query('select public._validate_design_snapshot($1)',[JSON.stringify(orphan)])).rejects.toThrow(/ORPHAN_OR_DUPLICATE/);
  });

});
