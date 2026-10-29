-- Lock Part before modifying its definitions or adding design references.
-- This serializes reference creation against Part mutation within PostgreSQL.
create function public.guard_part_definition() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.parts; key uuid;
begin
  key := case when tg_op = 'DELETE' then old.part_id else new.part_id end;
  if tg_op = 'UPDATE' and new.part_id <> old.part_id then raise exception 'PART_REPARENT_FORBIDDEN'; end if;
  select * into p from public.parts where id = key for update;
  if found and (exists(select 1 from public.design_nodes where part_id = key) or exists(select 1 from public.design_paths where part_id = key)) then
    raise exception 'REFERENCED_PART_IMMUTABLE';
  end if;
  if tg_table_name = 'part_path_specs' and tg_op <> 'DELETE' then
    if p.geometry_kind <> 'path' then raise exception 'PATH_SPEC_REQUIRES_PATH_PART'; end if;
    if new.segment_asset_id is not null and not exists(select 1 from public.part_image_assets where id = new.segment_asset_id and user_id = p.user_id and asset_kind = 'path_segment') then
      raise exception 'SEGMENT_ASSET_INVALID';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function public.guard_part() returns trigger
language plpgsql security definer set search_path = '' as $$
declare referenced boolean;
begin
  if tg_op in ('UPDATE','DELETE') then
    referenced := exists(select 1 from public.design_nodes where part_id = old.id) or exists(select 1 from public.design_paths where part_id = old.id);
    if tg_op = 'DELETE' and referenced then raise exception 'REFERENCED_PART_IMMUTABLE'; end if;
    if tg_op = 'UPDATE' then
      if new.id <> old.id or new.user_id <> old.user_id then raise exception 'PART_IDENTITY_IMMUTABLE'; end if;
      if referenced and (to_jsonb(new) - 'is_archived' - 'updated_at') <> (to_jsonb(old) - 'is_archived' - 'updated_at') then
        raise exception 'REFERENCED_PART_IMMUTABLE';
      end if;
    end if;
  end if;
  if tg_op <> 'DELETE' and not exists(select 1 from public.part_image_assets where id = new.image_asset_id and user_id = new.user_id and asset_kind = 'part_main') then
    raise exception 'MAIN_ASSET_INVALID';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function public.guard_asset() returns trigger
language plpgsql security definer set search_path = '' as $$
declare prefix text; image_path text;
begin
  if tg_op = 'UPDATE' then raise exception 'ASSET_IMMUTABLE'; end if;
  if tg_op = 'DELETE' then
    if exists(select 1 from public.parts where image_asset_id = old.id) or exists(select 1 from public.part_path_specs where segment_asset_id = old.id) then raise exception 'REFERENCED_ASSET_IMMUTABLE'; end if;
    return old;
  end if;
  prefix := 'users/' || new.user_id::text || '/parts/' || new.id::text || '/';
  foreach image_path in array array[new.original_path,new.normalized_high_path,new.normalized_medium_path,new.thumbnail_path] loop
    if left(image_path,length(prefix)) <> prefix or image_path like '%..%' then raise exception 'ASSET_PATH_INVALID'; end if;
  end loop;
  if (select count(distinct item) from unnest(array[new.original_path,new.normalized_high_path,new.normalized_medium_path,new.thumbnail_path]) item) <> 4 then raise exception 'ASSET_PATH_DUPLICATE'; end if;
  return new;
end;
$$;

create function public.guard_design_part_reference() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.parts; owner uuid;
begin
  select * into p from public.parts where id = new.part_id for update;
  select user_id into owner from public.designs where id = new.design_id;
  if p.id is null or owner is null or p.user_id <> owner then raise exception 'PART_OWNER_MISMATCH'; end if;
  if (tg_table_name = 'design_nodes' and p.geometry_kind <> 'node') or (tg_table_name = 'design_paths' and p.geometry_kind <> 'path') then raise exception 'PART_GEOMETRY_MISMATCH'; end if;
  if tg_table_name = 'design_paths' and not exists(select 1 from public.part_path_specs where part_id = p.id) then raise exception 'PATH_SPEC_REQUIRED'; end if;
  return new;
end;
$$;

create trigger parts_guard before insert or update or delete on public.parts for each row execute function public.guard_part();
create trigger assets_guard before insert or update or delete on public.part_image_assets for each row execute function public.guard_asset();
do $$
declare name text;
begin
  foreach name in array array['part_purchase_specs','part_path_specs','part_connection_points','part_through_holes'] loop
    execute format('create trigger definitions_guard before insert or update or delete on public.%I for each row execute function public.guard_part_definition()',name);
  end loop;
  foreach name in array array['design_nodes','design_paths'] loop
    execute format('create trigger reference_guard before insert or update on public.%I for each row execute function public.guard_design_part_reference()',name);
  end loop;
end;
$$;

-- No direct write grants: mutation goes through bounded RPCs only.
do $$
declare name text;
begin
  foreach name in array array['parts','part_purchase_specs','part_image_assets','part_path_specs','part_user_state','part_source_snapshots','part_connection_points','part_through_holes','designs','design_nodes','design_paths','design_point_attachments','design_through_attachments','design_path_attachments','design_mirror_links'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from public, anon, authenticated',name);
    execute format('grant select on public.%I to authenticated',name);
    if name in ('parts','part_image_assets','part_user_state','designs') then
      execute format('create policy owner_read on public.%I for select to authenticated using (user_id = (select auth.uid()))',name);
    elsif name like 'part_%' then
      execute format('create policy owner_read on public.%I for select to authenticated using (exists(select 1 from public.parts p where p.id = part_id and p.user_id = (select auth.uid())))',name);
    else
      execute format('create policy owner_read on public.%I for select to authenticated using (exists(select 1 from public.designs d where d.id = design_id and d.user_id = (select auth.uid())))',name);
    end if;
  end loop;
end;
$$;

revoke all on function public.guard_part_definition(), public.guard_part(), public.guard_asset(), public.guard_design_part_reference() from public, anon, authenticated;
