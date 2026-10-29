-- v1.4 domain tables. Requires Supabase auth schema.

create table public.parts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  sku text,
  source_name text,
  source_url text,
  category text not null,
  geometry_kind text not null,
  sub_category text,
  color text,
  material text,
  width_mm numeric,
  height_mm numeric,
  depth_mm numeric,
  weight_g numeric,
  hole_diameter_mm numeric,
  wire_diameter_mm numeric,
  pin_diameter_mm numeric,
  inner_diameter_mm numeric,
  outer_diameter_mm numeric,
  opening_width_mm numeric,
  thickness_mm numeric,
  image_asset_id uuid not null,
  mirror_policy text not null,
  tags text[] not null default '{}'::text[],
  notes text,
  is_archived boolean not null default false,
  supersedes_part_id uuid,
  source_checked_at timestamptz,
  import_source text,
  import_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

create table public.part_purchase_specs (
  id uuid not null default gen_random_uuid(),
  part_id uuid not null,
  sale_mode text not null,
  pack_quantity numeric,
  sale_length_mm numeric,
  minimum_units numeric not null,
  unit_price numeric,
  currency text not null,
  weight_basis text,
  weight_basis_length_mm numeric,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.part_image_assets (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  asset_kind text not null,
  content_hash text not null,
  original_path text not null,
  normalized_high_path text not null,
  normalized_medium_path text not null,
  thumbnail_path text not null,
  pixel_width integer not null,
  pixel_height integer not null,
  calibration_mm_per_px numeric not null,
  source_transform jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (id)
);

create table public.part_path_specs (
  id uuid not null default gen_random_uuid(),
  part_id uuid not null,
  render_mode text not null,
  segment_asset_id uuid,
  segment_physical_length_mm numeric,
  nominal_diameter_mm numeric,
  stroke_color text,
  opacity numeric not null,
  texture_overlap_mm numeric not null,
  start_port_type text,
  end_port_type text,
  start_max_connections integer not null,
  end_max_connections integer not null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.part_user_state (
  user_id uuid not null,
  part_id uuid not null,
  favorite boolean not null default false,
  last_used_at timestamptz,
  use_count bigint not null default 0,
  primary key (user_id, part_id)
);

create table public.part_source_snapshots (
  id uuid not null default gen_random_uuid(),
  part_id uuid not null,
  source_url text not null,
  fetched_at timestamptz not null,
  parser_version text not null,
  raw_fields jsonb not null default '{}'::jsonb,
  status text not null,
  error_code text,
  primary key (id)
);

create table public.part_connection_points (
  id uuid not null default gen_random_uuid(),
  part_id uuid not null,
  name text not null,
  type text not null,
  x_norm numeric not null,
  y_norm numeric not null,
  direction_deg numeric not null,
  max_connections integer not null,
  local_inner_diameter_mm numeric,
  local_thickness_mm numeric,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.part_through_holes (
  id uuid not null default gen_random_uuid(),
  part_id uuid not null,
  name text not null,
  entry_x_norm numeric not null,
  entry_y_norm numeric not null,
  exit_x_norm numeric not null,
  exit_y_norm numeric not null,
  diameter_mm numeric,
  axis_deg numeric not null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.designs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type text not null,
  canvas_config jsonb not null default '{}'::jsonb,
  editor_config jsonb not null default '{}'::jsonb,
  thumbnail_path text,
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

create table public.design_nodes (
  id uuid not null default gen_random_uuid(),
  design_id uuid not null,
  part_id uuid not null,
  instance_name text,
  x_mm numeric not null,
  y_mm numeric not null,
  rotation_deg numeric not null,
  scale_x numeric not null,
  scale_y numeric not null,
  z_index integer not null,
  locked boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.design_paths (
  id uuid not null default gen_random_uuid(),
  design_id uuid not null,
  part_id uuid not null,
  physical_length_mm numeric not null,
  shape text not null,
  start_x_mm numeric not null,
  start_y_mm numeric not null,
  end_x_mm numeric not null,
  end_y_mm numeric not null,
  bend_side smallint,
  derived_geometry jsonb default '{}'::jsonb,
  z_index integer not null,
  locked boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.design_point_attachments (
  id uuid not null default gen_random_uuid(),
  design_id uuid not null,
  node_a_id uuid not null,
  point_a_id uuid not null,
  node_b_id uuid not null,
  point_b_id uuid not null,
  orientation_mode text not null,
  relative_rotation_deg numeric not null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.design_through_attachments (
  id uuid not null default gen_random_uuid(),
  design_id uuid not null,
  node_id uuid not null,
  hole_id uuid not null,
  path_id uuid not null,
  distance_mm numeric not null,
  order_index integer not null,
  locked_to_neighbors boolean not null default false,
  flip_180 boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.design_path_attachments (
  id uuid not null default gen_random_uuid(),
  design_id uuid not null,
  node_id uuid not null,
  point_id uuid not null,
  path_id uuid not null,
  anchor_kind text not null,
  distance_mm numeric,
  normal_offset_mm numeric not null,
  orientation_mode text not null,
  rotation_offset_deg numeric not null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);

create table public.design_mirror_links (
  id uuid not null default gen_random_uuid(),
  design_id uuid not null,
  mirror_group_id uuid not null,
  entity_type text not null,
  left_entity_id uuid not null,
  right_entity_id uuid not null,
  manual_mirror_policy text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id)
);
