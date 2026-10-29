-- Complete geometry validation includes persistent reflection and MirrorLink invariants.
-- This helper remains private; the save gate is not changed by this migration.
create function public._validate_design_snapshot(payload jsonb) returns void
language plpgsql set search_path = '' as $$
declare cfg jsonb; groups_ jsonb; group_ jsonb; group_id_ text; side_ text; kind_ text; section_ text; ids_ jsonb; item jsonb; ref jsonb; refs jsonb;
 entities jsonb := '{}'; owners jsonb := '{}'; mappings jsonb := '{}'; used_ text[] := '{}'; key_ text; id_ text;
 membership jsonb; candidate jsonb; left_ jsonb; right_ jsonb; expected jsonb; fields text[]; field_ text;
 part_ jsonb; axis_ double precision; flip_l boolean; flip_r boolean; policy_ text; source_key text; target_key text;
begin
 perform public._validate_design_geometry(payload);
 cfg:=payload->'design'->'editor_config'->'mirror';
 if cfg is null then if jsonb_array_length(payload->'mirror_links')>0 then raise exception 'MIRROR_CONFIG_REQUIRED'; end if;return;end if;
 groups_:=cfg->'groups';
 foreach kind_ in array array['node','path','point_attachment','through_attachment','path_attachment'] loop
  section_:=case kind_ when 'node' then 'nodes' when 'path' then 'paths' else kind_||'s' end;
  for item in select value from jsonb_array_elements(payload->section_) loop
   entities:=entities||jsonb_build_object(kind_||':'||(item->>'id')::uuid::text,item);
  end loop;
 end loop;
 for group_id_,group_ in select key,value from jsonb_each(groups_) loop
  perform group_id_::uuid;perform public._design_require_numbers(group_,array['axisX']);
  if group_->>'mode' is null or group_->>'mode' not in ('linked','independent') then raise exception 'INVALID_MIRROR_MODE'; end if;
  foreach side_ in array array['left','right'] loop foreach kind_ in array array['node','path'] loop
   ids_:=group_->side_->(case kind_ when 'node' then 'nodeIds' else 'pathIds' end);
   if jsonb_typeof(ids_) is distinct from 'array' then raise exception 'INVALID_MIRROR_MEMBERSHIP'; end if;
   for item in select value from jsonb_array_elements(ids_) loop
    if jsonb_typeof(item) is distinct from 'string' then raise exception 'INVALID_MIRROR_MEMBER_ID'; end if;
    id_:=(item#>>'{}')::uuid::text;key_:=kind_||':'||id_;
    if not(entities?key_) or owners?key_ then raise exception 'ORPHAN_OR_DUPLICATE_MIRROR_MEMBER'; end if;
    owners:=owners||jsonb_build_object(key_,jsonb_build_object('group',group_id_,'side',side_));
   end loop;
  end loop;end loop;
 end loop;
 foreach kind_ in array array['point_attachment','through_attachment','path_attachment'] loop
  for item in select value from jsonb_array_elements(payload->(kind_||'s')) loop
   refs:=case when kind_='point_attachment' then jsonb_build_array('node:'||(item->>'node_a_id')::uuid::text,'node:'||(item->>'node_b_id')::uuid::text) else jsonb_build_array('node:'||(item->>'node_id')::uuid::text,'path:'||(item->>'path_id')::uuid::text) end;
   membership:=null;
   for ref in select value from jsonb_array_elements(refs) loop
    candidate:=owners->(ref#>>'{}');if candidate is not null then membership:=candidate;exit;end if;
   end loop;
   if membership is not null then
    for ref in select value from jsonb_array_elements(refs) loop if owners->(ref#>>'{}') is distinct from membership then raise exception 'CROSS_SIDE_MIRROR_ATTACHMENT'; end if;end loop;
    owners:=owners||jsonb_build_object(kind_||':'||(item->>'id')::uuid::text,membership);
   end if;
  end loop;
 end loop;
 for item in select value from jsonb_array_elements(payload->'mirror_links') loop
  kind_:=item->>'entity_type';group_id_:=(item->>'mirror_group_id')::uuid::text;group_:=groups_->group_id_;
  if kind_ is null or kind_ not in ('node','path','point_attachment','through_attachment','path_attachment') or group_ is null or group_->>'mode'<>'linked' then raise exception 'INVALID_MIRROR_LINK'; end if;
  source_key:=kind_||':'||(item->>'left_entity_id')::uuid::text;target_key:=kind_||':'||(item->>'right_entity_id')::uuid::text;
  if owners->source_key is distinct from jsonb_build_object('group',group_id_,'side','left') or owners->target_key is distinct from jsonb_build_object('group',group_id_,'side','right') then raise exception 'MIRROR_LINK_MEMBERSHIP_MISMATCH'; end if;
  if source_key=any(used_) or target_key=any(used_) then raise exception 'DUPLICATE_MIRROR_CORRESPONDENCE'; end if;
  used_:=array_append(array_append(used_,source_key),target_key);mappings:=mappings||jsonb_build_object(source_key,(item->>'right_entity_id')::uuid::text);
 end loop;
 for key_,membership in select key,value from jsonb_each(owners) loop
  if groups_->(membership->>'group')->>'mode'='linked' and not(key_=any(used_)) then raise exception 'MISSING_MIRROR_CORRESPONDENCE'; end if;
 end loop;
 for item in select value from jsonb_array_elements(payload->'mirror_links') loop
  kind_:=item->>'entity_type';group_id_:=(item->>'mirror_group_id')::uuid::text;axis_:=(groups_->group_id_->>'axisX')::double precision;
  left_:=entities->(kind_||':'||(item->>'left_entity_id')::uuid::text);right_:=entities->(kind_||':'||(item->>'right_entity_id')::uuid::text);expected:=left_;
  if kind_='node' then
   select to_jsonb(p) into part_ from public.parts p where p.id=(left_->>'part_id')::uuid and p.user_id=auth.uid();
   policy_:=case when part_->>'mirror_policy'='manual' then item->>'manual_mirror_policy' else part_->>'mirror_policy' end;
   if policy_ is null or policy_ not in ('keep_orientation','mirror_image') then raise exception 'MIRROR_POLICY_REQUIRED'; end if;
   flip_l:=coalesce((cfg->'nodeFlipX'->>((left_->>'id')::uuid::text))::boolean,false);flip_r:=coalesce((cfg->'nodeFlipX'->>((right_->>'id')::uuid::text))::boolean,false);
   if flip_r is distinct from (case when policy_='mirror_image' then not flip_l else flip_l end) then raise exception 'MIRROR_FLIP_MISMATCH'; end if;
   expected:=expected||jsonb_build_object('x_mm',2*axis_-(left_->>'x_mm')::double precision,'rotation_deg',public._design_angle(-(left_->>'rotation_deg')::double precision));
   fields:=array['part_id','x_mm','y_mm','rotation_deg','scale_x','scale_y','z_index','locked'];
  elsif kind_='path' then
   expected:=expected||jsonb_build_object('start_x_mm',2*axis_-(left_->>'start_x_mm')::double precision,'end_x_mm',2*axis_-(left_->>'end_x_mm')::double precision);
   fields:=array['part_id','start_x_mm','start_y_mm','end_x_mm','end_y_mm','physical_length_mm','shape','bend_side','z_index','locked'];
  elsif kind_='point_attachment' then
   expected:=expected||jsonb_build_object('node_a_id',mappings->>('node:'||(left_->>'node_a_id')::uuid::text),'node_b_id',mappings->>('node:'||(left_->>'node_b_id')::uuid::text),'relative_rotation_deg',-(left_->>'relative_rotation_deg')::double precision);
   fields:=array['node_a_id','node_b_id','point_a_id','point_b_id','orientation_mode','relative_rotation_deg'];
  elsif kind_='through_attachment' then
   expected:=expected||jsonb_build_object('node_id',mappings->>('node:'||(left_->>'node_id')::uuid::text),'path_id',mappings->>('path:'||(left_->>'path_id')::uuid::text));
   fields:=array['node_id','path_id','hole_id','distance_mm','order_index','flip_180','locked_to_neighbors'];
  else
   expected:=expected||jsonb_build_object('node_id',mappings->>('node:'||(left_->>'node_id')::uuid::text),'path_id',mappings->>('path:'||(left_->>'path_id')::uuid::text),'normal_offset_mm',-(left_->>'normal_offset_mm')::double precision,'rotation_offset_deg',-(left_->>'rotation_offset_deg')::double precision);
   fields:=array['node_id','path_id','point_id','anchor_kind','distance_mm','normal_offset_mm','rotation_offset_deg','orientation_mode'];
  end if;
  foreach field_ in array fields loop
   if field_='rotation_deg' then
    if abs(public._design_angle((right_->>field_)::double precision-(expected->>field_)::double precision+180)-180)>1e-5 then raise exception 'MIRROR_GEOMETRY_MISMATCH'; end if;
   elsif field_ in ('x_mm','y_mm','start_x_mm','start_y_mm','end_x_mm','end_y_mm','relative_rotation_deg','normal_offset_mm','rotation_offset_deg') then
    if abs((right_->>field_)::double precision-(expected->>field_)::double precision)>1e-5 then raise exception 'MIRROR_GEOMETRY_MISMATCH'; end if;
   elsif coalesce(right_->field_,'null'::jsonb) is distinct from coalesce(expected->field_,'null'::jsonb) then raise exception 'MIRROR_ENTITY_MISMATCH: %',field_;end if;
  end loop;
 end loop;
end; $$;
revoke all on function public._validate_design_snapshot(jsonb) from public,anon,authenticated;
