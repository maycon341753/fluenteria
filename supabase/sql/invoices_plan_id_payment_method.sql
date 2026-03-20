alter table public.invoices
add column if not exists plan_id uuid;

alter table public.invoices
add column if not exists payment_method text not null default 'pix';

alter table public.invoices
drop constraint if exists invoices_payment_method_check;

alter table public.invoices
add constraint invoices_payment_method_check
check (payment_method in ('pix', 'credit_card'));

