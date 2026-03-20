alter table public.plans
add column if not exists is_active boolean not null default true;

