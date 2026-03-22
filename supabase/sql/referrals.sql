create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'super_admin'
  );
$$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
add column if not exists referral_code text;

alter table public.profiles
add column if not exists referred_by_user_id uuid;

alter table public.profiles
add column if not exists referred_at timestamptz;

create unique index if not exists profiles_referral_code_key
on public.profiles (referral_code)
where referral_code is not null;

create index if not exists profiles_referred_by_user_id_idx
on public.profiles (referred_by_user_id);

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  loop
    v_code := lower(translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/=', 'xyz'));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function public.set_profile_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is null or new.referral_code = '' then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code
before insert on public.profiles
for each row
execute function public.set_profile_referral_code();

create or replace function public.handle_new_user_default_free_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_plan_id uuid;
  v_full_name text;
  v_ref_code text;
  v_referrer_id uuid;
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
    v_ref_code := nullif(new.raw_user_meta_data->>'ref', '');
    if v_ref_code is null then
      v_ref_code := nullif(new.raw_user_meta_data->>'referral_code', '');
    end if;

    insert into public.profiles (user_id, full_name, email, created_at, updated_at)
    values (new.id, v_full_name, new.email, now(), now())
    on conflict (user_id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = excluded.updated_at;

    if v_ref_code is not null then
      select user_id
        into v_referrer_id
      from public.profiles
      where referral_code = v_ref_code
      limit 1;

      if v_referrer_id is not null and v_referrer_id <> new.id then
        update public.profiles
        set referred_by_user_id = coalesce(referred_by_user_id, v_referrer_id),
            referred_at = coalesce(referred_at, now())
        where user_id = new.id;
      end if;
    end if;
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

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null,
  referred_user_id uuid not null,
  invoice_id uuid not null,
  percent numeric not null,
  base_amount_cents integer not null,
  amount_cents integer not null,
  currency text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists referral_commissions_invoice_id_key
on public.referral_commissions (invoice_id);

create index if not exists referral_commissions_referrer_created_at_idx
on public.referral_commissions (referrer_user_id, created_at desc);

alter table public.referral_commissions enable row level security;

drop policy if exists referral_commissions_select_referrer on public.referral_commissions;
create policy referral_commissions_select_referrer
on public.referral_commissions
for select
to authenticated
using (referrer_user_id = auth.uid() or public.is_super_admin());

create or replace function public.create_referral_commission_from_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_percent numeric := 40;
  v_commission_cents integer;
begin
  if new.status <> 'paid' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'paid' then
    return new;
  end if;

  select referred_by_user_id
    into v_referrer_id
  from public.profiles
  where user_id = new.user_id;

  if v_referrer_id is null or v_referrer_id = new.user_id then
    return new;
  end if;

  v_commission_cents := round((new.amount_cents * v_percent) / 100.0);

  insert into public.referral_commissions (
    referrer_user_id,
    referred_user_id,
    invoice_id,
    percent,
    base_amount_cents,
    amount_cents,
    currency,
    created_at
  )
  values (
    v_referrer_id,
    new.user_id,
    new.id,
    v_percent,
    new.amount_cents,
    v_commission_cents,
    new.currency,
    now()
  )
  on conflict (invoice_id) do nothing;

  return new;
end;
$$;

drop trigger if exists invoices_create_referral_commission on public.invoices;
create trigger invoices_create_referral_commission
after insert or update of status on public.invoices
for each row
when (new.status = 'paid')
execute function public.create_referral_commission_from_invoice();

create index if not exists invoices_user_status_paid_at_idx
on public.invoices (user_id, status, paid_at desc);

create or replace function public.get_my_referral_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_total int;
  v_active int;
  v_pending int;
  v_monthly bigint;
  v_total_earn bigint;
  v_rows jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select referral_code
    into v_code
  from public.profiles
  where user_id = v_uid;

  if v_code is null then
    update public.profiles
    set referral_code = public.generate_referral_code()
    where user_id = v_uid and (referral_code is null or referral_code = '');

    select referral_code
      into v_code
    from public.profiles
    where user_id = v_uid;
  end if;

  select count(*)::int
    into v_total
  from public.profiles
  where referred_by_user_id = v_uid;

  select count(*)::int
    into v_active
  from public.profiles p
  join public.user_subscriptions s on s.user_id = p.user_id
  where p.referred_by_user_id = v_uid
    and s.status = 'active';

  select count(*)::int
    into v_pending
  from public.profiles p
  left join public.user_subscriptions s on s.user_id = p.user_id
  where p.referred_by_user_id = v_uid
    and coalesce(s.status, '') <> 'active';

  select coalesce(sum(amount_cents), 0)::bigint
    into v_monthly
  from public.referral_commissions
  where referrer_user_id = v_uid
    and date_trunc('month', created_at) = date_trunc('month', now());

  select coalesce(sum(amount_cents), 0)::bigint
    into v_total_earn
  from public.referral_commissions
  where referrer_user_id = v_uid;

  v_rows := (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    from (
      select
        p.user_id,
        coalesce(nullif(p.full_name, ''), p.email, 'Usuário') as name,
        coalesce(pl.name, '—') as plan,
        case
          when s.status = 'active' then 'ativo'
          when s.status = 'canceled' then 'cancelado'
          else 'pendente'
        end as status,
        coalesce(sum(rc.amount_cents), 0)::bigint as commission_cents,
        max(rc.created_at) as last_commission_at,
        p.created_at as joined_at
      from public.profiles p
      left join public.user_subscriptions s on s.user_id = p.user_id
      left join public.plans pl on pl.id = s.plan_id
      left join public.referral_commissions rc
        on rc.referred_user_id = p.user_id
       and rc.referrer_user_id = v_uid
      where p.referred_by_user_id = v_uid
      group by p.user_id, p.full_name, p.email, pl.name, s.status, p.created_at
      order by max(rc.created_at) desc nulls last, p.created_at desc
    ) t
  );

  return jsonb_build_object(
    'referral_code', v_code,
    'total_referred', v_total,
    'active_referred', v_active,
    'pending_referred', v_pending,
    'monthly_earnings_cents', v_monthly,
    'total_earnings_cents', v_total_earn,
    'rows', v_rows
  );
end;
$$;

grant execute on function public.get_my_referral_dashboard() to authenticated;

create or replace function public.admin_referral_metrics(p_from timestamptz default (now() - interval '30 days'))
returns table (
  user_id uuid,
  full_name text,
  email text,
  referral_code text,
  total_referred int,
  active_referred int,
  total_earnings_cents bigint,
  earnings_since_from_cents bigint,
  referred_revenue_total_cents bigint,
  referred_revenue_since_from_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() and auth.role() <> 'service_role' then
    raise exception 'not allowed';
  end if;

  return query
  select
    u.user_id,
    u.full_name,
    u.email,
    u.referral_code,
    (select count(*) from public.profiles p where p.referred_by_user_id = u.user_id)::int as total_referred,
    (
      select count(*)
      from public.profiles p
      join public.user_subscriptions s on s.user_id = p.user_id
      where p.referred_by_user_id = u.user_id
        and s.status = 'active'
    )::int as active_referred,
    coalesce((select sum(amount_cents) from public.referral_commissions rc where rc.referrer_user_id = u.user_id), 0)::bigint as total_earnings_cents,
    coalesce((select sum(amount_cents) from public.referral_commissions rc where rc.referrer_user_id = u.user_id and rc.created_at >= p_from), 0)::bigint as earnings_since_from_cents,
    coalesce(
      (
        select sum(i.amount_cents)
        from public.invoices i
        join public.profiles p on p.user_id = i.user_id
        where p.referred_by_user_id = u.user_id
          and i.status = 'paid'
      ),
      0
    )::bigint as referred_revenue_total_cents,
    coalesce(
      (
        select sum(i.amount_cents)
        from public.invoices i
        join public.profiles p on p.user_id = i.user_id
        where p.referred_by_user_id = u.user_id
          and i.status = 'paid'
          and i.paid_at >= p_from
      ),
      0
    )::bigint as referred_revenue_since_from_cents
  from public.profiles u
  where u.referral_code is not null
  order by earnings_since_from_cents desc, total_earnings_cents desc;
end;
$$;

grant execute on function public.admin_referral_metrics(timestamptz) to authenticated;
