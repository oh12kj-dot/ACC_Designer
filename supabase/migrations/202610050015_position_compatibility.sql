-- Retain the v1.4 ownership/geometry checks; add known impossible chain/ring inequalities.
alter function public._validate_design_snapshot(jsonb) rename to _validate_design_snapshot_v14;
create function public._validate_design_snapshot(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item jsonb; node_ jsonb; path_ jsonb; ring_ public.parts; chain_ public.parts; point_ public.part_connection_points; inner_ double precision; thickness_ double precision;
begin
 perform public._validate_design_snapshot_v14(payload);
 for item in select value from jsonb_array_elements(payload->'path_attachments') where value->>'anchor_kind'='position' loop
  select value into node_ from jsonb_array_elements(payload->'nodes') where (value->>'id')::uuid=(item->>'node_id')::uuid;
  select value into path_ from jsonb_array_elements(payload->'paths') where (value->>'id')::uuid=(item->>'path_id')::uuid;
  select * into ring_ from public.parts where id=(node_->>'part_id')::uuid;
  select * into chain_ from public.parts where id=(path_->>'part_id')::uuid;
  select * into point_ from public.part_connection_points where id=(item->>'point_id')::uuid;
  if chain_.category='chain' and (ring_.category='jump_ring' or point_.type='ring') then
   inner_:=coalesce(point_.local_inner_diameter_mm,ring_.inner_diameter_mm);thickness_:=coalesce(chain_.thickness_mm,chain_.wire_diameter_mm);
   if thickness_ is not null and (inner_<thickness_+.05 or ring_.opening_width_mm<thickness_+.05) then raise exception 'INCOMPATIBLE_PATH_POSITION'; end if;
  end if;
 end loop;
end $$;
revoke all on function public._validate_design_snapshot(jsonb) from public,anon,authenticated;
