alter table public.invoices
add column if not exists billing_cycle text not null default 'month';

alter table public.invoices
drop constraint if exists invoices_billing_cycle_check;

alter table public.invoices
add constraint invoices_billing_cycle_check
check (billing_cycle in ('month', 'year'));

alter table public.pix_payments
add column if not exists billing_cycle text not null default 'month';

alter table public.pix_payments
drop constraint if exists pix_payments_billing_cycle_check;

alter table public.pix_payments
add constraint pix_payments_billing_cycle_check
check (billing_cycle in ('month', 'year'));

alter table public.user_subscriptions
add column if not exists billing_cycle text not null default 'month';

alter table public.user_subscriptions
drop constraint if exists user_subscriptions_billing_cycle_check;

alter table public.user_subscriptions
add constraint user_subscriptions_billing_cycle_check
check (billing_cycle in ('month', 'year'));

