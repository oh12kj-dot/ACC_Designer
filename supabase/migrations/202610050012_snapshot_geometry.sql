-- Submitted snapshots are validated against owned, immutable Part definitions.
-- These internal functions do not lift the Atomic Save gate.
create function public._design_require_numbers(item jsonb, fields text[]) returns void
language plpgsql immutable set search_path = '' as $$
declare field text; value_ double precision;
begin
 foreach field in array fields loop
  if jsonb_typeof(item->field) is distinct from 'number' then raise exception 'INVALID_GEOMETRY_NUMBER: %',field; end if;
  value_ := (item->>field)::double precision;
  if value_ in ('NaN'::double precision,'Infinity'::double precision,'-Infinity'::double precision) then raise exception 'INVALID_GEOMETRY_NUMBER: %',field; end if;
 end loop;
end; $$;
create function public._design_pose_matches(n jsonb, expected jsonb) returns boolean
language sql immutable set search_path = '' as $$
 select abs((n->>'x_mm')::double precision-(expected->>'x_mm')::double precision)<=1e-5
 and abs((n->>'y_mm')::double precision-(expected->>'y_mm')::double precision)<=1e-5
 and abs(public._design_angle((n->>'rotation_deg')::double precision-(expected->>'rotation_deg')::double precision+180)-180)<=1e-5
$$;
create function public._design_point_compatible(a jsonb,b jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare pair_ text; field text; value_ numeric;
begin
 foreach field in array array['local_inner_diameter_mm','local_thickness_mm'] loop
  if a->field is not null and a->field<>'null'::jsonb then perform public._design_require_numbers(a,array[field]); if (a->>field)::numeric<0 then raise exception 'INVALID_CONNECTION_DIMENSION'; end if; end if;
  if b->field is not null and b->field<>'null'::jsonb then perform public._design_require_numbers(b,array[field]); if (b->>field)::numeric<0 then raise exception 'INVALID_CONNECTION_DIMENSION'; end if; end if;
 end loop;
 pair_ := case when a->>'type'<b->>'type' then (a->>'type')||':'||(b->>'type') else (b->>'type')||':'||(a->>'type') end;
 if pair_='hole:pin_end' then return false; end if;
 if pair_ is null or pair_ not in ('loop:ring','ring:ring','hook:loop','chain_end:clasp') then return true; end if;
 if a->>'local_inner_diameter_mm' is not null and b->>'local_thickness_mm' is not null and (a->>'local_inner_diameter_mm')::double precision<(b->>'local_thickness_mm')::double precision+.05 then return false; end if;
 if b->>'local_inner_diameter_mm' is not null and a->>'local_thickness_mm' is not null and (b->>'local_inner_diameter_mm')::double precision<(a->>'local_thickness_mm')::double precision+.05 then return false; end if;
 return true;
end; $$;
create function public._validate_design_geometry(payload jsonb) returns void
language plpgsql set search_path = '' as $$
declare section text; item jsonb; field text; entity_id text; part_id_ uuid; node_id_ text; path_id_ text;
 ids text[] := '{}'; bindings text[] := '{}'; pairs text[] := '{}'; pair_ text;
 nodes_ jsonb := '{}'; paths_ jsonb := '{}'; parts_ jsonb := '{}'; geometries jsonb := '{}'; intervals jsonb := '{}'; flips jsonb := '{}'; cfg jsonb;
 n jsonb; nb jsonb; part_ jsonb; material jsonb; spec jsonb; cp jsonb; cpb jsonb; hole jsonb; path_ jsonb; expected jsonb; sample jsonb; point_ jsonb; point_b jsonb; occupied jsonb;
 flip_ boolean; flip_b boolean; count_ integer; maximum_ double precision; distance_ double precision; direction_ double precision; direction_b double precision;
 diameter_ double precision; material_diameter double precision; physical_ double precision;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if jsonb_typeof(payload) is distinct from 'object' then raise exception 'INVALID_SNAPSHOT'; end if;
 foreach section in array array['nodes','paths','point_attachments','through_attachments','path_attachments','mirror_links'] loop
  if jsonb_typeof(payload->section) is distinct from 'array' then raise exception 'INCOMPLETE_SNAPSHOT'; end if;
  for item in select value from jsonb_array_elements(payload->section) loop
   if jsonb_typeof(item) is distinct from 'object' or item->>'id' is null then raise exception 'INVALID_ENTITY'; end if;
   entity_id := (item->>'id')::uuid::text;
   if entity_id=any(ids) then raise exception 'DUPLICATE_ENTITY_ID'; end if; ids:=array_append(ids,entity_id);
  end loop;
 end loop;
 for item in select value from jsonb_array_elements(payload->'nodes') loop
  perform public._design_require_numbers(item,array['x_mm','y_mm','rotation_deg','scale_x','scale_y','z_index']);
  if (item->>'scale_x')::numeric<=0 or (item->>'scale_y')::numeric<=0 or (item->>'z_index')::numeric<>trunc((item->>'z_index')::numeric) or jsonb_typeof(item->'locked') is distinct from 'boolean' then raise exception 'INVALID_NODE'; end if;
  part_id_ := (item->>'part_id')::uuid;
  select to_jsonb(p) into part_ from public.parts p where p.id=part_id_ and p.user_id=auth.uid();
  if part_ is null or part_->>'geometry_kind'<>'node' then raise exception 'NODE_PART_NOT_OWNED'; end if;
  perform public._design_require_numbers(part_,array['width_mm','height_mm']);if (part_->>'width_mm')::numeric<=0 or (part_->>'height_mm')::numeric<=0 then raise exception 'INVALID_NODE_DIMENSIONS'; end if;
  nodes_:=nodes_||jsonb_build_object((item->>'id')::uuid::text,item);parts_:=parts_||jsonb_build_object(part_id_::text,part_);
 end loop;
 for item in select value from jsonb_array_elements(payload->'paths') loop
  perform public._design_require_numbers(item,array['z_index']);
  if (item->>'z_index')::numeric<>trunc((item->>'z_index')::numeric) or jsonb_typeof(item->'locked') is distinct from 'boolean' then raise exception 'INVALID_PATH'; end if;
  part_id_:=(item->>'part_id')::uuid;
  select to_jsonb(p) into part_ from public.parts p where p.id=part_id_ and p.user_id=auth.uid();
  select to_jsonb(s) into spec from public.part_path_specs s where s.part_id=part_id_;
  if part_ is null or part_->>'geometry_kind'<>'path' or spec is null then raise exception 'PATH_PART_NOT_OWNED'; end if;
  paths_:=paths_||jsonb_build_object((item->>'id')::uuid::text,item);parts_:=parts_||jsonb_build_object(part_id_::text,part_||jsonb_build_object('path_spec',spec));
  geometries:=geometries||jsonb_build_object((item->>'id')::uuid::text,public._design_path_geometry(item));
 end loop;
 cfg:=payload->'design'->'editor_config'->'mirror';
 if cfg is not null then
  if jsonb_typeof(cfg) is distinct from 'object' or cfg->'version' is distinct from '1'::jsonb or jsonb_typeof(cfg->'nodeFlipX') is distinct from 'object' or jsonb_typeof(cfg->'groups') is distinct from 'object' then raise exception 'INVALID_MIRROR_CONFIG'; end if;
  for entity_id,item in select key,value from jsonb_each(cfg->'nodeFlipX') loop
   if not(nodes_?entity_id) or jsonb_typeof(item) is distinct from 'boolean' then raise exception 'INVALID_NODE_FLIP'; end if;
  end loop;flips:=cfg->'nodeFlipX';
 end if;
 for item in select value from jsonb_array_elements(payload->'point_attachments') loop
  perform public._design_require_numbers(item,array['relative_rotation_deg']);
  if item->>'orientation_mode' is null or item->>'orientation_mode' not in ('align_opposite','keep_rotation','manual') then raise exception 'INVALID_POINT_ORIENTATION'; end if;
  node_id_:=(item->>'node_a_id')::uuid::text;n:=nodes_->node_id_;nb:=nodes_->((item->>'node_b_id')::uuid::text);
  if n is null or nb is null or (item->>'node_a_id')::uuid=(item->>'node_b_id')::uuid then raise exception 'INVALID_POINT_NODES'; end if;
  select to_jsonb(c) into cp from public.part_connection_points c where c.id=(item->>'point_a_id')::uuid and c.part_id=(n->>'part_id')::uuid;
  select to_jsonb(c) into cpb from public.part_connection_points c where c.id=(item->>'point_b_id')::uuid and c.part_id=(nb->>'part_id')::uuid;
  if cp is null or cpb is null then raise exception 'POINT_NOT_IN_PART'; end if;
  perform public._design_require_numbers(cp,array['x_norm','y_norm','direction_deg','max_connections']);perform public._design_require_numbers(cpb,array['x_norm','y_norm','direction_deg','max_connections']);
  pair_ := least(node_id_||':'||(cp->>'id'),(nb->>'id')::uuid::text||':'||(cpb->>'id'))||'|'||greatest(node_id_||':'||(cp->>'id'),(nb->>'id')::uuid::text||':'||(cpb->>'id'));
  if pair_=any(pairs) then raise exception 'DUPLICATE_POINT_ATTACHMENT'; end if;pairs:=array_append(pairs,pair_);
  if not public._design_point_compatible(cp,cpb) then raise exception 'INCOMPATIBLE_POINT'; end if;
  flip_:=coalesce((flips->>node_id_)::boolean,false);flip_b:=coalesce((flips->>((nb->>'id')::uuid::text))::boolean,false);
  point_:=public._design_node_point(n,parts_->((n->>'part_id')::uuid::text),(cp->>'x_norm')::double precision,(cp->>'y_norm')::double precision,flip_);
  point_b:=public._design_node_point(nb,parts_->((nb->>'part_id')::uuid::text),(cpb->>'x_norm')::double precision,(cpb->>'y_norm')::double precision,flip_b);
  if abs((point_->>'x')::double precision-(point_b->>'x')::double precision)>1e-5 or abs((point_->>'y')::double precision-(point_b->>'y')::double precision)>1e-5 then raise exception 'POINT_POSITION_MISMATCH'; end if;
  if item->>'orientation_mode'='align_opposite' then
   direction_:=(n->>'rotation_deg')::double precision+case when flip_ then 180-(cp->>'direction_deg')::double precision else (cp->>'direction_deg')::double precision end;
   direction_b:=(nb->>'rotation_deg')::double precision+case when flip_b then 180-(cpb->>'direction_deg')::double precision else (cpb->>'direction_deg')::double precision end;
   if abs(public._design_angle(direction_b-direction_-180-(item->>'relative_rotation_deg')::double precision+180)-180)>1e-5 then raise exception 'POINT_DIRECTION_MISMATCH'; end if;
  end if;
 end loop;
 for item in select value from jsonb_array_elements(payload->'through_attachments') loop
  perform public._design_require_numbers(item,array['distance_mm','order_index']);
  if (item->>'order_index')::numeric<>trunc((item->>'order_index')::numeric) or jsonb_typeof(item->'flip_180') is distinct from 'boolean' or jsonb_typeof(item->'locked_to_neighbors') is distinct from 'boolean' then raise exception 'INVALID_THROUGH_ATTACHMENT'; end if;
  node_id_:=(item->>'node_id')::uuid::text;path_id_:=(item->>'path_id')::uuid::text;n:=nodes_->node_id_;path_:=paths_->path_id_;
  if n is null or path_ is null or node_id_=any(bindings) then raise exception 'INVALID_OR_DUPLICATE_PATH_BINDING'; end if;bindings:=array_append(bindings,node_id_);
  part_:=parts_->((n->>'part_id')::uuid::text);material:=parts_->((path_->>'part_id')::uuid::text);
  select to_jsonb(h) into hole from public.part_through_holes h where h.id=(item->>'hole_id')::uuid and h.part_id=(n->>'part_id')::uuid;
  if hole is null then raise exception 'HOLE_NOT_IN_PART'; end if;
  if hole->>'diameter_mm' is not null then perform public._design_require_numbers(hole,array['diameter_mm']); end if;
  if part_->>'hole_diameter_mm' is not null then perform public._design_require_numbers(part_,array['hole_diameter_mm']); end if;
  if material->>'wire_diameter_mm' is not null then perform public._design_require_numbers(material,array['wire_diameter_mm']); end if;
  if material->'path_spec'->>'nominal_diameter_mm' is not null then perform public._design_require_numbers(material->'path_spec',array['nominal_diameter_mm']); end if;
  diameter_:=coalesce((hole->>'diameter_mm')::double precision,(part_->>'hole_diameter_mm')::double precision);material_diameter:=coalesce((material->>'wire_diameter_mm')::double precision,(material->'path_spec'->>'nominal_diameter_mm')::double precision);
  if diameter_<0 or material_diameter<0 then raise exception 'INVALID_THROUGH_DIMENSION'; end if;
  if diameter_ is not null and material_diameter is not null and diameter_<material_diameter+.05 then raise exception 'INCOMPATIBLE_THROUGH'; end if;
  distance_:=(item->>'distance_mm')::double precision;physical_:=(path_->>'physical_length_mm')::double precision;
  if distance_<0 or distance_>physical_ then raise exception 'PATH_DISTANCE_OUT_OF_RANGE'; end if;
  sample:=public._design_path_sample(geometries->path_id_,distance_,physical_);flip_:=coalesce((flips->>node_id_)::boolean,false);
  expected:=public._design_through_pose(n,part_,hole,sample,flip_,(item->>'flip_180')::boolean);
  if not public._design_pose_matches(n,expected) then raise exception 'THROUGH_POSE_MISMATCH'; end if;
  occupied:=public._design_through_interval(n,part_,hole,sample,distance_,flip_);
  if (occupied->>'start_mm')::double precision < -1e-7 or (occupied->>'end_mm')::double precision>physical_+1e-7 then raise exception 'THROUGH_OUT_OF_PATH'; end if;
  intervals:=jsonb_set(intervals,array[path_id_],coalesce(intervals->path_id_,'[]'::jsonb)||jsonb_build_array(occupied));
 end loop;
 for path_id_,item in select key,value from jsonb_each(intervals) loop
  maximum_:='-Infinity';for occupied in select value from jsonb_array_elements(item) order by (value->>'start_mm')::double precision loop
   if maximum_-(occupied->>'start_mm')::double precision>1e-7 then raise exception 'THROUGH_OVERLAP'; end if;maximum_:=greatest(maximum_,(occupied->>'end_mm')::double precision);
  end loop;
 end loop;
 for item in select value from jsonb_array_elements(payload->'path_attachments') loop
  perform public._design_require_numbers(item,array['normal_offset_mm','rotation_offset_deg']);
  node_id_:=(item->>'node_id')::uuid::text;path_id_:=(item->>'path_id')::uuid::text;n:=nodes_->node_id_;path_:=paths_->path_id_;
  if n is null or path_ is null or node_id_=any(bindings) then raise exception 'INVALID_OR_DUPLICATE_PATH_BINDING'; end if;bindings:=array_append(bindings,node_id_);
  part_:=parts_->((n->>'part_id')::uuid::text);material:=parts_->((path_->>'part_id')::uuid::text);spec:=material->'path_spec';
  select to_jsonb(c) into cp from public.part_connection_points c where c.id=(item->>'point_id')::uuid and c.part_id=(n->>'part_id')::uuid;
  if cp is null then raise exception 'POINT_NOT_IN_PART'; end if;
  perform public._design_require_numbers(cp,array['x_norm','y_norm','direction_deg','max_connections']);
  physical_:=(path_->>'physical_length_mm')::double precision;
  if item->>'anchor_kind'='position' then perform public._design_require_numbers(item,array['distance_mm']);distance_:=(item->>'distance_mm')::double precision;
  elsif item->>'anchor_kind' in ('start','end') then
   if item->>'distance_mm' is not null then raise exception 'ENDPOINT_DISTANCE_MUST_BE_NULL'; end if;
   distance_:=case when item->>'anchor_kind'='start' then 0 else physical_ end;
   select count(*) into count_ from jsonb_array_elements(payload->'path_attachments') a where (a->>'path_id')::uuid=path_id_::uuid and a->>'anchor_kind'=item->>'anchor_kind';
   if count_>(spec->>(case when item->>'anchor_kind'='start' then 'start_max_connections' else 'end_max_connections' end))::integer then raise exception 'PATH_PORT_CAPACITY_EXCEEDED'; end if;
   cpb:=jsonb_build_object('type',spec->(case when item->>'anchor_kind'='start' then 'start_port_type' else 'end_port_type' end),'local_inner_diameter_mm',material->'inner_diameter_mm','local_thickness_mm',material->'thickness_mm');
   if not public._design_point_compatible(cp,cpb) then raise exception 'INCOMPATIBLE_PATH_PORT'; end if;
  else raise exception 'INVALID_ANCHOR_KIND'; end if;
  if distance_<0 or distance_>physical_ then raise exception 'PATH_DISTANCE_OUT_OF_RANGE'; end if;
  sample:=public._design_path_sample(geometries->path_id_,distance_,physical_);flip_:=coalesce((flips->>node_id_)::boolean,false);
  expected:=public._design_anchor_pose(n,part_,cp,sample,item,flip_);if not public._design_pose_matches(n,expected) then raise exception 'ANCHOR_POSE_MISMATCH'; end if;
 end loop;
 for node_id_,n in select key,value from jsonb_each(nodes_) loop
  for cp in select to_jsonb(c) from public.part_connection_points c where c.part_id=(n->>'part_id')::uuid loop
   select count(*) into count_ from (
    select 1 from jsonb_array_elements(payload->'point_attachments') a where ((a->>'node_a_id')::uuid=node_id_::uuid and (a->>'point_a_id')::uuid=(cp->>'id')::uuid) or ((a->>'node_b_id')::uuid=node_id_::uuid and (a->>'point_b_id')::uuid=(cp->>'id')::uuid)
    union all select 1 from jsonb_array_elements(payload->'path_attachments') a where (a->>'node_id')::uuid=node_id_::uuid and (a->>'point_id')::uuid=(cp->>'id')::uuid
   ) uses_;
   if count_>(cp->>'max_connections')::integer then raise exception 'POINT_CAPACITY_EXCEEDED'; end if;
  end loop;
 end loop;
end; $$;
revoke all on function public._design_require_numbers(jsonb,text[]) from public,anon,authenticated;
revoke all on function public._design_pose_matches(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public._design_point_compatible(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public._validate_design_geometry(jsonb) from public,anon,authenticated;
