alter table public.plans
add column if not exists annual_discount_percent numeric not null default 0;

alter table public.plans
drop constraint if exists plans_annual_discount_percent_range;

alter table public.plans
add constraint plans_annual_discount_percent_range
check (annual_discount_percent >= 0 and annual_discount_percent <= 100);

alter table public.plans enable row level security;

drop policy if exists plans_select_public on public.plans;
create policy plans_select_public
on public.plans
for select
to anon, authenticated
using (true);

