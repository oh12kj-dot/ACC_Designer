-- Refresh evidence can be recorded without updating Part or creating a successor.
create function public.record_part_source_snapshot(part_id uuid,snapshot jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare key uuid := gen_random_uuid();p public.parts;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into p from public.parts where id=part_id and user_id=auth.uid() for update;
  if not found then raise exception 'PART_NOT_FOUND'; end if;
  if snapshot is null or jsonb_typeof(snapshot)<>'object' or snapshot ?| array['id','part_id'] then raise exception 'INVALID_SNAPSHOT'; end if;
  insert into public.part_source_snapshots select (jsonb_populate_record(null::public.part_source_snapshots,snapshot || jsonb_build_object('id',key,'part_id',p.id))).*;
  return key;
end;
$$;
revoke all on function public.record_part_source_snapshot(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_part_source_snapshot(uuid,jsonb) to authenticated;
