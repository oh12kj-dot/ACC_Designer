import { readFileSync,readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';

let db:PGlite;
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
async function actor(user=a){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');}
async function reserve(){return (await db.query<{id:string;paths:string[]}>('select * from public.reserve_asset_upload()')).rows[0];}
async function upload(paths:string[]){for(const path of paths)await db.query("insert into storage.objects(bucket_id,name) values('part-images',$1)",[path]);}
async function create(r:{id:string;paths:string[]},bad=false){
  const [original_path,normalized_high_path,normalized_medium_path,thumbnail_path]=r.paths;
  return db.query('select public.save_part_successor(null,$1::jsonb)',[JSON.stringify({
    image_asset:{id:r.id,asset_kind:'part_main',content_hash:'hash',original_path,normalized_high_path,normalized_medium_path,thumbnail_path,pixel_width:10,pixel_height:20,calibration_mm_per_px:1},
    part:{name:'Fixture',category:'bead',geometry_kind:'node',width_mm:10,height_mm:20,image_asset_id:r.id},
    ...(bad?{purchase_spec:{sale_mode:'pack',pack_quantity:0,minimum_units:1,currency:'JPY'}}:{}),
  })]);
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
  `);
  await db.query('insert into auth.users values($1),($2)',[a,b]);
  for(const file of readdirSync('supabase/migrations').sort())await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
},30000);
afterAll(async()=>await db?.close());

describe('Storage lifecycle and SQL policies',{concurrent:false},()=>{
  it('creates a private MIME/size restricted bucket',async()=>{
    const result=await db.query<{public:boolean;file_size_limit:number;allowed_mime_types:string[]}>('select * from storage.buckets');
    expect(result.rows[0].public).toBe(false);expect(Number(result.rows[0].file_size_limit)).toBe(20971520);
    expect(result.rows[0].allowed_mime_types).not.toContain('image/svg+xml');
  });
  it('allows only reserved owner paths and refuses overwrite',async()=>{
    await actor();const r=await reserve();await upload([r.paths[0]]);
    await expect(upload(['users/'+a+'/parts/random/file'])).rejects.toThrow(/row-level security/);
    await expect(upload([r.paths[0]])).rejects.toThrow(/duplicate key/);
    expect((await db.query("update storage.objects set name='tampered' returning id")).rows).toHaveLength(0);
    await actor(b);expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);
    await expect(upload([r.paths[1]])).rejects.toThrow(/row-level security/);
    await expect(db.query('select public.claim_asset_cleanup($1)',[r.id])).rejects.toThrow(/UPLOAD_NOT_FOUND/);
  });
  it('rejects DB commit before all four objects exist',async()=>{
    await actor();const r=await reserve();await upload(r.paths.slice(0,3));
    await expect(create(r)).rejects.toThrow(/UPLOAD_INCOMPLETE/);
    expect((await db.query<{state:string}>('select state from public.asset_uploads where id=$1',[r.id])).rows[0].state).toBe('pending');
  });
  it('protects committed images even when save response is lost',async()=>{
    await actor();const r=await reserve();await upload(r.paths);await create(r);
    expect((await db.query<{paths:string[]}>('select public.claim_asset_cleanup($1) as paths',[r.id])).rows[0].paths).toEqual([]);
    expect((await db.query('delete from storage.objects where name=any($1) returning id',[r.paths])).rows).toHaveLength(0);
    await expect(upload([r.paths[0]])).rejects.toThrow(/row-level security/);
  });
  it('rolls back committed lease when Part transaction fails, then safely cleans all objects',async()=>{
    await actor();const r=await reserve();await upload(r.paths);await expect(create(r,true)).rejects.toThrow(/check constraint/);
    expect((await db.query<{state:string}>('select state from public.asset_uploads where id=$1',[r.id])).rows[0].state).toBe('pending');
    await db.query('select public.claim_asset_cleanup($1)',[r.id]);
    await expect(create(r)).rejects.toThrow(/UPLOAD_NOT_PENDING/);
    await expect(db.query('select public.finish_asset_cleanup($1)',[r.id])).rejects.toThrow(/CLEANUP_INCOMPLETE/);
    await db.query('delete from storage.objects where name=any($1)',[r.paths]);
    await db.query('select public.finish_asset_cleanup($1)',[r.id]);
    expect((await db.query<{state:string}>('select state from public.asset_uploads where id=$1',[r.id])).rows[0].state).toBe('cleaned');
    await expect(upload([r.paths[0]])).rejects.toThrow(/row-level security/);
  });
  it('commits main and segment leases together and rolls both back if the second Asset fails',async()=>{
    await actor();const main=await reserve(),segment=await reserve();await upload(main.paths);await upload(segment.paths.slice(0,3));
    const asset=(r:{id:string;paths:string[]},kind:string)=>({id:r.id,asset_kind:kind,content_hash:'hash',original_path:r.paths[0],normalized_high_path:r.paths[1],normalized_medium_path:r.paths[2],thumbnail_path:r.paths[3],pixel_width:10,pixel_height:10,calibration_mm_per_px:1});
    const payload={image_asset:asset(main,'part_main'),segment_asset:asset(segment,'path_segment'),part:{name:'Texture wire',category:'wire',geometry_kind:'path',image_asset_id:main.id},path_spec:{render_mode:'stroke_texture',segment_asset_id:segment.id,nominal_diameter_mm:1,opacity:1,texture_overlap_mm:0,start_max_connections:0,end_max_connections:0}};
    await expect(db.query('select public.save_part_successor(null,$1::jsonb)',[JSON.stringify(payload)])).rejects.toThrow(/UPLOAD_INCOMPLETE/);
    expect((await db.query<{state:string}>('select state from public.asset_uploads where id=any($1)',[[main.id,segment.id]])).rows.map(r=>r.state)).toEqual(['pending','pending']);
    await upload(segment.paths.slice(3));await db.query('select public.save_part_successor(null,$1::jsonb)',[JSON.stringify(payload)]);
    expect((await db.query<{state:string}>('select state from public.asset_uploads where id=any($1)',[[main.id,segment.id]])).rows.map(r=>r.state)).toEqual(['committed','committed']);
    for(const r of [main,segment])expect((await db.query<{paths:string[]}>('select public.claim_asset_cleanup($1) as paths',[r.id])).rows[0].paths).toEqual([]);
  });
  it('restrictive policies withstand a broad existing policy, including anon',async()=>{
    await db.exec('reset role');
    await db.exec("create policy broad_existing on storage.objects for all to public using(true) with check(true);grant usage on schema storage to anon;grant select,insert,update,delete on storage.objects to anon;");
    await actor(b);expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');
    await expect(db.query('select * from storage.objects')).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from storage.objects returning id")).rejects.toThrow(/permission denied/);
    await expect(db.query("update storage.objects set name='tampered' returning id")).rejects.toThrow(/permission denied/);
  });
});
