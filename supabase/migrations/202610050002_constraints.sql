-- Scalar and referential invariants. Geometry semantics are enforced by the save RPC gate.
create function public.finite_number(value numeric) returns boolean
language sql immutable strict set search_path = '' as $$
  select value::text not in ('NaN', 'Infinity', '-Infinity');
$$;

alter table public.parts
  add unique (id, user_id),
  add foreign key (user_id) references auth.users(id) on delete restrict,
  add foreign key (supersedes_part_id, user_id) references public.parts(id, user_id) on delete restrict,
  add check (length(trim(name)) > 0),
  add check (geometry_kind in ('node', 'path')),
  add check (geometry_kind <> 'node' or (width_mm is not null and width_mm > 0 and height_mm is not null and height_mm > 0)),
  add check (category in ('chain','wire','string','cord','thread','bead','pearl','gem','charm','connector','jump_ring','clasp','earring_hook','earring_post','eye_pin','head_pin','spacer','cap','pendant','other')),
  add check (mirror_policy in ('keep_orientation','mirror_image','manual')),
  add check (import_source in ('manual','kiwa_url')),
  add check (import_status in ('manual','imported','partial'));

alter table public.part_image_assets
  add unique (id, user_id),
  add foreign key (user_id) references auth.users(id) on delete restrict,
  add check (asset_kind in ('part_main','path_segment')),
  add check (length(content_hash) > 0),
  add check (pixel_width > 0 and pixel_height > 0 and calibration_mm_per_px > 0),
  add check (original_path <> normalized_high_path and normalized_high_path <> normalized_medium_path and normalized_medium_path <> thumbnail_path);
alter table public.parts add foreign key (image_asset_id, user_id) references public.part_image_assets(id, user_id) on delete restrict;

alter table public.part_purchase_specs
  add unique (part_id),
  add foreign key (part_id) references public.parts(id) on delete cascade,
  add check (sale_mode in ('piece','pack','length')),
  add check (sale_mode <> 'pack' or (pack_quantity is not null and pack_quantity > 0)),
  add check (sale_mode <> 'length' or (sale_length_mm is not null and sale_length_mm > 0)),
  add check (minimum_units >= 1 and minimum_units = trunc(minimum_units)),
  add check (currency = 'JPY'),
  add check (weight_basis in ('per_piece','per_sale_length')),
  add check (weight_basis <> 'per_sale_length' or (weight_basis_length_mm is not null and weight_basis_length_mm > 0));

alter table public.part_path_specs
  add unique (part_id),
  add foreign key (part_id) references public.parts(id) on delete cascade,
  add foreign key (segment_asset_id) references public.part_image_assets(id) on delete restrict,
  add check (render_mode in ('segment_texture','stroke_texture','solid_stroke')),
  add check (render_mode <> 'segment_texture' or (segment_asset_id is not null and segment_physical_length_mm is not null and segment_physical_length_mm > 0)),
  add check (render_mode <> 'stroke_texture' or (segment_asset_id is not null and nominal_diameter_mm is not null and nominal_diameter_mm > 0)),
  add check (render_mode <> 'solid_stroke' or (nominal_diameter_mm is not null and nominal_diameter_mm > 0)),
  add check (opacity between 0 and 1),
  add check (start_max_connections >= 0 and end_max_connections >= 0),
  add check (start_max_connections = 0 or start_port_type is not null),
  add check (end_max_connections = 0 or end_port_type is not null);

alter table public.part_user_state
  add foreign key (user_id) references auth.users(id) on delete restrict,
  add foreign key (part_id, user_id) references public.parts(id, user_id) on delete cascade,
  add check (use_count >= 0);
alter table public.part_source_snapshots
  add foreign key (part_id) references public.parts(id) on delete cascade,
  add check (status in ('success','partial','failed'));
alter table public.part_connection_points
  add unique (id, part_id),
  add foreign key (part_id) references public.parts(id) on delete cascade,
  add check (x_norm between 0 and 1 and y_norm between 0 and 1),
  add check (max_connections >= 0);
alter table public.part_through_holes
  add unique (id, part_id),
  add foreign key (part_id) references public.parts(id) on delete cascade,
  add check (entry_x_norm between 0 and 1 and entry_y_norm between 0 and 1 and exit_x_norm between 0 and 1 and exit_y_norm between 0 and 1);

alter table public.designs
  add unique (id, user_id),
  add foreign key (user_id) references auth.users(id) on delete restrict,
  add check (length(trim(name)) > 0),
  add check (type in ('necklace','earrings')),
  add check (revision >= 0);
alter table public.design_nodes
  add unique (id, design_id),
  add foreign key (design_id) references public.designs(id) on delete cascade,
  add foreign key (part_id) references public.parts(id) on delete restrict,
  add check (scale_x > 0 and scale_y > 0);
alter table public.design_paths
  add unique (id, design_id),
  add foreign key (design_id) references public.designs(id) on delete cascade,
  add foreign key (part_id) references public.parts(id) on delete restrict,
  add check (physical_length_mm > 0),
  add check (shape in ('u','v','straight')),
  add check (shape = 'straight' or (bend_side is not null and bend_side in (-1,1))),
  add check (sqrt(power(end_x_mm-start_x_mm,2) + power(end_y_mm-start_y_mm,2)) <= physical_length_mm),
  add check (shape <> 'straight' or abs(sqrt(power(end_x_mm-start_x_mm,2) + power(end_y_mm-start_y_mm,2))-physical_length_mm) <= greatest(0.5, physical_length_mm*0.005));
alter table public.design_point_attachments
  add foreign key (design_id) references public.designs(id) on delete cascade,
  add foreign key (node_a_id, design_id) references public.design_nodes(id, design_id) on delete cascade,
  add foreign key (node_b_id, design_id) references public.design_nodes(id, design_id) on delete cascade,
  add foreign key (point_a_id) references public.part_connection_points(id) on delete restrict,
  add foreign key (point_b_id) references public.part_connection_points(id) on delete restrict,
  add check (node_a_id <> node_b_id),
  add check (orientation_mode in ('align_opposite','keep_rotation','manual'));
alter table public.design_through_attachments
  add unique (node_id, hole_id, path_id),
  add foreign key (design_id) references public.designs(id) on delete cascade,
  add foreign key (node_id, design_id) references public.design_nodes(id, design_id) on delete cascade,
  add foreign key (path_id, design_id) references public.design_paths(id, design_id) on delete cascade,
  add foreign key (hole_id) references public.part_through_holes(id) on delete restrict,
  add check (distance_mm >= 0 and order_index >= 0);
alter table public.design_path_attachments
  add foreign key (design_id) references public.designs(id) on delete cascade,
  add foreign key (node_id, design_id) references public.design_nodes(id, design_id) on delete cascade,
  add foreign key (path_id, design_id) references public.design_paths(id, design_id) on delete cascade,
  add foreign key (point_id) references public.part_connection_points(id) on delete restrict,
  add check (anchor_kind in ('start','end','position')),
  add check ((anchor_kind = 'position' and distance_mm is not null and distance_mm >= 0) or (anchor_kind in ('start','end') and distance_mm is null)),
  add check (orientation_mode in ('world_down','path_normal','path_tangent','keep_rotation'));
alter table public.design_mirror_links
  add foreign key (design_id) references public.designs(id) on delete cascade,
  add unique (design_id, entity_type, left_entity_id),
  add unique (design_id, entity_type, right_entity_id),
  add check (left_entity_id <> right_entity_id),
  add check (entity_type in ('node','path','point_attachment','through_attachment','path_attachment')),
  add check (manual_mirror_policy in ('keep_orientation','mirror_image'));

-- Apply finite numeric checks to every numeric field, and nonnegative checks to physical data.
do $$
declare c record;
begin
  for c in select table_name, column_name from information_schema.columns where table_schema = 'public' and data_type = 'numeric' loop
    execute format('alter table public.%I add check (%I is null or public.finite_number(%I))', c.table_name, c.column_name, c.column_name);
    if c.table_name like 'part%' and c.column_name not in ('direction_deg','axis_deg') then
      execute format('alter table public.%I add check (%I is null or %I >= 0)', c.table_name, c.column_name, c.column_name);
    end if;
  end loop;
end;
$$;

create index design_nodes_part_idx on public.design_nodes(part_id);
create index design_paths_part_idx on public.design_paths(part_id);
create index parts_user_idx on public.parts(user_id);
create index designs_user_idx on public.designs(user_id);
