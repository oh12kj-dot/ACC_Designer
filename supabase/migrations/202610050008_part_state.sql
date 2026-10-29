create function public.set_part_user_state(part_id uuid,is_favorite boolean default null,mark_used boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 perform 1 from public.parts p where p.id=part_id and p.user_id=auth.uid() and not p.is_archived for update;
 if not found then raise exception 'PART_NOT_FOUND'; end if;
 insert into public.part_user_state(user_id,part_id,favorite,last_used_at,use_count) values(auth.uid(),part_id,coalesce(is_favorite,false),case when mark_used then now() end,case when mark_used then 1 else 0 end)
 on conflict on constraint part_user_state_pkey do update set favorite=coalesce(is_favorite,part_user_state.favorite),last_used_at=case when mark_used then now() else part_user_state.last_used_at end,use_count=part_user_state.use_count+case when mark_used then 1 else 0 end;
end; $$;
revoke all on function public.set_part_user_state(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.set_part_user_state(uuid,boolean,boolean) to authenticated;
