-- Full owned geometry is validated before any snapshot rows are replaced.
create or replace function public.save_design_aggregate(design_id uuid, expected_revision bigint, payload jsonb, force_overwrite boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.designs; item jsonb; section text; saved_at timestamptz;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if jsonb_typeof(payload) is distinct from 'object' then raise exception 'INVALID_SNAPSHOT'; end if;
 select * into d from public.designs where id=design_id and user_id=auth.uid() for update;
 if not found then raise exception 'DESIGN_NOT_FOUND'; end if;
 if force_overwrite is null then raise exception 'INVALID_OVERWRITE_FLAG'; end if;
 if expected_revision is null or expected_revision<0 or expected_revision>9007199254740991 or d.revision>=9007199254740991 then raise exception 'INVALID_REVISION'; end if;
 if not force_overwrite and expected_revision<>d.revision then raise exception 'REVISION_CONFLICT' using errcode='40001'; end if;
 foreach section in array array['nodes','paths','point_attachments','through_attachments','path_attachments','mirror_links'] loop
  if jsonb_typeof(payload->section) is distinct from 'array' then raise exception 'INCOMPLETE_SNAPSHOT'; end if;
  for item in select value from jsonb_array_elements(payload->section) loop
   if item?'design_id' and (item->>'design_id')::uuid is distinct from d.id then raise exception 'DESIGN_ID_MISMATCH'; end if;
  end loop;
 end loop;
 if jsonb_typeof(payload->'design') is distinct from 'object' or not((payload->'design')?&array['id','name','type','canvas_config','editor_config']) then raise exception 'INCOMPLETE_SNAPSHOT'; end if;
 if (payload->'design'->>'id')::uuid is distinct from d.id then raise exception 'DESIGN_ID_MISMATCH'; end if;
 if payload->'design'->>'type' is distinct from d.type then raise exception 'DESIGN_TYPE_IMMUTABLE'; end if;
 if jsonb_typeof(payload->'design'->'canvas_config') is distinct from 'object' or jsonb_typeof(payload->'design'->'editor_config') is distinct from 'object' or jsonb_typeof(payload->'design'->'name') is distinct from 'string' then raise exception 'INVALID_CONFIG'; end if;
 -- Use a stable lock order for both old and new references. Never lock foreign Parts.
 perform p.id from public.parts p where p.user_id=auth.uid() and p.id in (
  select part_id from public.design_nodes where public.design_nodes.design_id=d.id
  union select part_id from public.design_paths where public.design_paths.design_id=d.id
  union select (value->>'part_id')::uuid from jsonb_array_elements(payload->'nodes')
  union select (value->>'part_id')::uuid from jsonb_array_elements(payload->'paths')
 ) order by p.id for update;
 perform public._validate_design_snapshot(payload);
 foreach section in array array['nodes','paths'] loop
  for item in select value from jsonb_array_elements(payload->section) loop
   if exists(select 1 from public.parts p where p.id=(item->>'part_id')::uuid and p.is_archived) then
    if section='nodes' then
     if not exists(select 1 from public.design_nodes n where n.design_id=d.id and n.id=(item->>'id')::uuid and n.part_id=(item->>'part_id')::uuid) then raise exception 'ARCHIVED_PART_NEW_USE'; end if;
    else
     if not exists(select 1 from public.design_paths p where p.design_id=d.id and p.id=(item->>'id')::uuid and p.part_id=(item->>'part_id')::uuid) then raise exception 'ARCHIVED_PART_NEW_USE'; end if;
    end if;
   end if;
  end loop;
 end loop;
 delete from public.design_mirror_links where public.design_mirror_links.design_id=d.id;
 delete from public.design_point_attachments where public.design_point_attachments.design_id=d.id;
 delete from public.design_through_attachments where public.design_through_attachments.design_id=d.id;
 delete from public.design_path_attachments where public.design_path_attachments.design_id=d.id;
 delete from public.design_nodes where public.design_nodes.design_id=d.id;
 delete from public.design_paths where public.design_paths.design_id=d.id;
 insert into public.design_nodes select (r).* from jsonb_array_elements(payload->'nodes') v cross join lateral jsonb_populate_record(null::public.design_nodes,jsonb_build_object('metadata','{}'::jsonb)||v||jsonb_build_object('design_id',d.id)) r;
 insert into public.design_paths select (r).* from jsonb_array_elements(payload->'paths') v cross join lateral jsonb_populate_record(null::public.design_paths,jsonb_build_object('metadata','{}'::jsonb)||v||jsonb_build_object('design_id',d.id,'derived_geometry',public._design_path_geometry(v))) r;
 insert into public.design_point_attachments select (r).* from jsonb_array_elements(payload->'point_attachments') v cross join lateral jsonb_populate_record(null::public.design_point_attachments,jsonb_build_object('metadata','{}'::jsonb)||v||jsonb_build_object('design_id',d.id)) r;
 insert into public.design_through_attachments select (r).* from jsonb_array_elements(payload->'through_attachments') v cross join lateral jsonb_populate_record(null::public.design_through_attachments,jsonb_build_object('metadata','{}'::jsonb)||v||jsonb_build_object('design_id',d.id)) r;
 insert into public.design_path_attachments select (r).* from jsonb_array_elements(payload->'path_attachments') v cross join lateral jsonb_populate_record(null::public.design_path_attachments,jsonb_build_object('metadata','{}'::jsonb)||v||jsonb_build_object('design_id',d.id)) r;
 insert into public.design_mirror_links select (r).* from jsonb_array_elements(payload->'mirror_links') v cross join lateral jsonb_populate_record(null::public.design_mirror_links,jsonb_build_object('metadata','{}'::jsonb)||v||jsonb_build_object('design_id',d.id)) r;
 saved_at:=clock_timestamp();
 update public.designs set name=payload->'design'->>'name',canvas_config=payload->'design'->'canvas_config',editor_config=payload->'design'->'editor_config',revision=revision+1,updated_at=saved_at where id=d.id;
 return jsonb_build_object('revision',d.revision+1,'saved_at',saved_at);
end; $$;
revoke all on function public.save_design_aggregate(uuid,bigint,jsonb,boolean) from public,anon;
grant execute on function public.save_design_aggregate(uuid,bigint,jsonb,boolean) to authenticated;
