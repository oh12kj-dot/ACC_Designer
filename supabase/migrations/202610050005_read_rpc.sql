-- One statement snapshot avoids mixing rows from two revisions during Load.
create function public.get_design_aggregate(design_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'design',to_jsonb(d),
    'nodes',coalesce((select jsonb_agg(to_jsonb(n) order by n.z_index,n.id) from public.design_nodes n where n.design_id=d.id),'[]'::jsonb),
    'paths',coalesce((select jsonb_agg(to_jsonb(p) order by p.z_index,p.id) from public.design_paths p where p.design_id=d.id),'[]'::jsonb),
    'point_attachments',coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.design_point_attachments a where a.design_id=d.id),'[]'::jsonb),
    'through_attachments',coalesce((select jsonb_agg(to_jsonb(a) order by a.order_index,a.id) from public.design_through_attachments a where a.design_id=d.id),'[]'::jsonb),
    'path_attachments',coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.design_path_attachments a where a.design_id=d.id),'[]'::jsonb),
    'mirror_links',coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from public.design_mirror_links m where m.design_id=d.id),'[]'::jsonb)
  ) from public.designs d where d.id = design_id and d.user_id = auth.uid();
$$;

create function public.get_part_aggregate(part_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'part',to_jsonb(p),
    'purchase_spec',(select to_jsonb(s) from public.part_purchase_specs s where s.part_id=p.id),
    'path_spec',(select to_jsonb(s) from public.part_path_specs s where s.part_id=p.id),
    'connection_points',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.part_connection_points s where s.part_id=p.id),'[]'::jsonb),
    'through_holes',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.part_through_holes s where s.part_id=p.id),'[]'::jsonb)
  ) from public.parts p where p.id = part_id and p.user_id = auth.uid();
$$;

revoke all on function public.get_design_aggregate(uuid), public.get_part_aggregate(uuid) from public, anon, authenticated;
grant execute on function public.get_design_aggregate(uuid), public.get_part_aggregate(uuid) to authenticated;
