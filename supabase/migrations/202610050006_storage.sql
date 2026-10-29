-- Upload reservation serializes DB commit against cleanup and object insertion.
create table public.asset_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  state text not null default 'pending' check (state in ('pending','committed','cleaning','cleaned')),
  paths text[] not null,
  created_at timestamptz not null default now()
);
alter table public.asset_uploads enable row level security;
revoke all on public.asset_uploads from public, anon, authenticated;
grant select on public.asset_uploads to authenticated;
create policy owner_read on public.asset_uploads for select to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('part-images','part-images',false,20971520,array['image/png','image/jpeg','image/webp']);

create function public.reserve_asset_upload() returns public.asset_uploads
language plpgsql security definer set search_path = '' as $$
declare reservation public.asset_uploads; root text; key uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  root := 'users/' || auth.uid()::text || '/parts/' || key::text || '/';
  insert into public.asset_uploads(id,user_id,paths) values(key,auth.uid(),array[root||'original',root||'high.png',root||'medium.png',root||'thumbnail.png']) returning * into reservation;
  return reservation;
end;
$$;

create function public.can_insert_part_image(object_name text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare reservation public.asset_uploads;
begin
  select * into reservation from public.asset_uploads where user_id = auth.uid() and object_name = any(paths) for update;
  return found and reservation.state = 'pending';
end;
$$;

create function public.commit_asset_upload() returns trigger
language plpgsql security definer set search_path = '' as $$
declare reservation public.asset_uploads;
begin
  select * into reservation from public.asset_uploads where id = new.id and user_id = new.user_id for update;
  if not found or reservation.state <> 'pending' then raise exception 'UPLOAD_NOT_PENDING'; end if;
  if reservation.paths <> array[new.original_path,new.normalized_high_path,new.normalized_medium_path,new.thumbnail_path] then raise exception 'UPLOAD_PATH_MISMATCH'; end if;
  if (select count(*) from storage.objects where bucket_id='part-images' and name = any(reservation.paths)) <> 4 then raise exception 'UPLOAD_INCOMPLETE'; end if;
  update public.asset_uploads set state='committed' where id=new.id;
  return new;
end;
$$;
create trigger upload_commit before insert on public.part_image_assets for each row execute function public.commit_asset_upload();

create function public.claim_asset_cleanup(asset_id uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare reservation public.asset_uploads;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into reservation from public.asset_uploads where id=asset_id and user_id=auth.uid() for update;
  if not found then raise exception 'UPLOAD_NOT_FOUND'; end if;
  if reservation.state in ('committed','cleaned') then return '{}'::text[]; end if;
  update public.asset_uploads set state='cleaning' where id=asset_id;
  return reservation.paths;
end;
$$;

create function public.finish_asset_cleanup(asset_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare reservation public.asset_uploads;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into reservation from public.asset_uploads where id=asset_id and user_id=auth.uid() for update;
  if not found or reservation.state <> 'cleaning' then raise exception 'CLEANUP_NOT_CLAIMED'; end if;
  if exists(select 1 from storage.objects where bucket_id='part-images' and name = any(reservation.paths)) then raise exception 'CLEANUP_INCOMPLETE'; end if;
  update public.asset_uploads set state='cleaned' where id=asset_id;
end;
$$;

create policy part_images_read on storage.objects for select to authenticated using (
  bucket_id='part-images' and exists(select 1 from public.asset_uploads u where u.user_id=auth.uid() and name = any(u.paths))
);
create policy part_images_insert on storage.objects for insert to authenticated with check (bucket_id='part-images' and public.can_insert_part_image(name));
create policy part_images_delete on storage.objects for delete to authenticated using (
  bucket_id='part-images' and exists(select 1 from public.asset_uploads u where u.user_id=auth.uid() and u.state='cleaning' and name = any(u.paths))
);
-- Restrictive policies also prevent broader preexisting policies from weakening this bucket.
create policy part_images_insert_guard on storage.objects as restrictive for insert to public with check (bucket_id <> 'part-images' or public.can_insert_part_image(name));
create policy part_images_update_guard on storage.objects as restrictive for update to public using (bucket_id <> 'part-images') with check (bucket_id <> 'part-images');
create policy part_images_delete_guard on storage.objects as restrictive for delete to public using (
  bucket_id <> 'part-images' or exists(select 1 from public.asset_uploads u where u.user_id=auth.uid() and u.state='cleaning' and name = any(u.paths))
);
create policy part_images_read_guard on storage.objects as restrictive for select to public using (
  bucket_id <> 'part-images' or exists(select 1 from public.asset_uploads u where u.user_id=auth.uid() and name = any(u.paths))
);
revoke all on function public.reserve_asset_upload(), public.can_insert_part_image(text), public.commit_asset_upload(), public.claim_asset_cleanup(uuid), public.finish_asset_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.reserve_asset_upload(), public.can_insert_part_image(text), public.claim_asset_cleanup(uuid), public.finish_asset_cleanup(uuid) to authenticated;
