create or replace function public.handle_new_user_default_free_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_plan_id uuid;
  v_full_name text;
begin
  select id
    into v_free_plan_id
  from public.plans
  where lower(name) = 'gratuito' or coalesce(price_cents, 0) = 0
  order by coalesce(price_cents, 0) asc, created_at asc
  limit 1;

  if v_free_plan_id is not null then
    insert into public.user_subscriptions (user_id, plan_id, status, current_period_end, updated_at)
    values (new.id, v_free_plan_id, 'active', now() + interval '10 days', now())
    on conflict (user_id) do update
    set plan_id = excluded.plan_id,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at;
  end if;

  begin
    v_full_name := nullif(new.raw_user_meta_data->>'full_name', '');
    insert into public.profiles (user_id, full_name, email, created_at, updated_at)
    values (new.id, v_full_name, new.email, now(), now())
    on conflict (user_id) do nothing;
  exception
    when undefined_table or undefined_column then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_default_free_plan();

