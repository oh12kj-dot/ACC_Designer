-- Main and optional segment assets commit with the Part and both upload leases atomically.
create or replace function public.save_part_successor(part_id uuid, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare old_part public.parts; next_part public.parts; asset public.part_image_assets; target uuid; referenced boolean := false; item jsonb; section text; base jsonb; was_favorite boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or jsonb_typeof(payload->'part') is distinct from 'object' then raise exception 'INVALID_PART_PAYLOAD'; end if;
  -- Keys with ownership/identity authority are always server controlled.
  if (payload->'part') ?| array['id','user_id','supersedes_part_id','created_at','updated_at','is_archived'] then raise exception 'PART_AUTHORITY_FIELD'; end if;
  foreach section in array array['purchase_spec','path_spec'] loop
    if payload ? section and jsonb_typeof(payload->section) not in ('object','null') then raise exception 'INVALID_PART_SECTION'; end if;
  end loop;
  foreach section in array array['connection_points','through_holes','source_snapshots'] loop
    if payload ? section and jsonb_typeof(payload->section) <> 'array' then raise exception 'INVALID_PART_SECTION'; end if;
  end loop;
  if part_id is not null then
    select * into old_part from public.parts p where p.id = part_id and p.user_id = auth.uid() for update;
    if not found then raise exception 'PART_NOT_FOUND'; end if;
    if old_part.is_archived then raise exception 'ARCHIVED_PART_UPDATE'; end if;
    referenced := exists(select 1 from public.design_nodes where public.design_nodes.part_id = old_part.id) or exists(select 1 from public.design_paths where public.design_paths.part_id = old_part.id);
    base := to_jsonb(old_part);
  else
    base := jsonb_build_object('tags','[]'::jsonb,'metadata','{}'::jsonb,'mirror_policy','keep_orientation','created_at',now());
  end if;
  target := case when old_part.id is not null and not referenced then old_part.id else gen_random_uuid() end;
  if payload ? 'image_asset' then
    if jsonb_typeof(payload->'image_asset') <> 'object' or (payload->'image_asset') ?| array['user_id','created_at'] then raise exception 'INVALID_ASSET_PAYLOAD'; end if;
    asset := jsonb_populate_record(null::public.part_image_assets,jsonb_build_object('source_transform','{}'::jsonb) || (payload->'image_asset') || jsonb_build_object('user_id',auth.uid(),'created_at',now()));
    insert into public.part_image_assets select (asset).*;
  end if;
  if payload ? 'segment_asset' then
    if jsonb_typeof(payload->'segment_asset') <> 'object' or (payload->'segment_asset') ?| array['user_id','created_at'] or payload->'segment_asset'->>'asset_kind' is distinct from 'path_segment' then raise exception 'INVALID_SEGMENT_ASSET'; end if;
    if payload->'path_spec'->>'segment_asset_id' is distinct from payload->'segment_asset'->>'id' then raise exception 'SEGMENT_ASSET_REFERENCE_REQUIRED'; end if;
    asset := jsonb_populate_record(null::public.part_image_assets,jsonb_build_object('source_transform','{}'::jsonb) || (payload->'segment_asset') || jsonb_build_object('user_id',auth.uid(),'created_at',now()));
    insert into public.part_image_assets select (asset).*;
  end if;
  next_part := jsonb_populate_record(null::public.parts, base || (payload->'part') || jsonb_build_object('id',target,'user_id',auth.uid(),'supersedes_part_id',case when referenced then old_part.id else old_part.supersedes_part_id end,'is_archived',false,'updated_at',now(),'created_at',case when referenced or old_part.id is null then now() else old_part.created_at end));
  next_part.tags := array(select distinct tag from unnest(next_part.tags) tag order by tag);
  if old_part.id is not null and not referenced then
    update public.parts set (name,sku,source_name,source_url,category,geometry_kind,sub_category,color,material,width_mm,height_mm,depth_mm,weight_g,hole_diameter_mm,wire_diameter_mm,pin_diameter_mm,inner_diameter_mm,outer_diameter_mm,opening_width_mm,thickness_mm,image_asset_id,mirror_policy,tags,notes,source_checked_at,import_source,import_status,metadata,updated_at)
    = (next_part.name,next_part.sku,next_part.source_name,next_part.source_url,next_part.category,next_part.geometry_kind,next_part.sub_category,next_part.color,next_part.material,next_part.width_mm,next_part.height_mm,next_part.depth_mm,next_part.weight_g,next_part.hole_diameter_mm,next_part.wire_diameter_mm,next_part.pin_diameter_mm,next_part.inner_diameter_mm,next_part.outer_diameter_mm,next_part.opening_width_mm,next_part.thickness_mm,next_part.image_asset_id,next_part.mirror_policy,next_part.tags,next_part.notes,next_part.source_checked_at,next_part.import_source,next_part.import_status,next_part.metadata,next_part.updated_at)
    where id = target;
  else
    insert into public.parts select (next_part).*;
  end if;

  -- Single-row specs: absent means preserve/clone, explicit null means remove.
  foreach section in array array['purchase_spec','path_spec'] loop
    if payload ? section then item := payload->section;
    elsif old_part.id is not null then
      if section = 'purchase_spec' then select to_jsonb(s) into item from public.part_purchase_specs s where s.part_id = old_part.id;
      else select to_jsonb(s) into item from public.part_path_specs s where s.part_id = old_part.id; end if;
    else item := null; end if;
    if section = 'purchase_spec' then
      delete from public.part_purchase_specs where public.part_purchase_specs.part_id = target;
      if item is not null and item <> 'null'::jsonb then
        insert into public.part_purchase_specs select (jsonb_populate_record(null::public.part_purchase_specs,jsonb_build_object('metadata','{}'::jsonb) || item || jsonb_build_object('id',gen_random_uuid(),'part_id',target))).*;
      end if;
    else
      delete from public.part_path_specs where public.part_path_specs.part_id = target;
      if item is not null and item <> 'null'::jsonb then
        insert into public.part_path_specs select (jsonb_populate_record(null::public.part_path_specs,jsonb_build_object('metadata','{}'::jsonb) || item || jsonb_build_object('id',gen_random_uuid(),'part_id',target))).*;
      end if;
    end if;
  end loop;
  foreach section in array array['connection_points','through_holes'] loop
    if payload ? section then base := payload->section;
    elsif old_part.id is not null then
      if section = 'connection_points' then select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into base from public.part_connection_points s where s.part_id = old_part.id;
      else select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into base from public.part_through_holes s where s.part_id = old_part.id; end if;
    else base := '[]'::jsonb; end if;
    if section = 'connection_points' then
      delete from public.part_connection_points where public.part_connection_points.part_id = target;
      for item in select value from jsonb_array_elements(base) loop
        insert into public.part_connection_points select (jsonb_populate_record(null::public.part_connection_points,jsonb_build_object('metadata','{}'::jsonb) || item || jsonb_build_object('id',gen_random_uuid(),'part_id',target))).*;
      end loop;
    else
      delete from public.part_through_holes where public.part_through_holes.part_id = target;
      for item in select value from jsonb_array_elements(base) loop
        insert into public.part_through_holes select (jsonb_populate_record(null::public.part_through_holes,jsonb_build_object('metadata','{}'::jsonb) || item || jsonb_build_object('id',gen_random_uuid(),'part_id',target))).*;
      end loop;
    end if;
  end loop;
  if next_part.geometry_kind = 'path' and not exists(select 1 from public.part_path_specs where public.part_path_specs.part_id = target) then raise exception 'PATH_SPEC_REQUIRED'; end if;
  if next_part.geometry_kind = 'node' and exists(select 1 from public.part_path_specs where public.part_path_specs.part_id = target) then raise exception 'NODE_HAS_PATH_SPEC'; end if;
  for item in select value from jsonb_array_elements(coalesce(payload->'source_snapshots','[]'::jsonb)) loop
    insert into public.part_source_snapshots select (jsonb_populate_record(null::public.part_source_snapshots,item || jsonb_build_object('id',gen_random_uuid(),'part_id',target))).*;
  end loop;
  if referenced then
    select favorite into was_favorite from public.part_user_state s where s.part_id = old_part.id and user_id = auth.uid();
    insert into public.part_user_state(user_id,part_id,favorite) values(auth.uid(),target,coalesce(was_favorite,false));
    update public.parts set is_archived = true, updated_at = now() where id = old_part.id;
  end if;
  return jsonb_build_object('part_id',target,'created_successor',referenced);
end;
$$;
