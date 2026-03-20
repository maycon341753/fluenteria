create or replace function public.confirm_asaas_payment(p_provider_payment_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
  v_billing_cycle text;
  v_payment_method text;
  v_cycle_days int;
begin
  v_role := auth.role();

  if not public.is_super_admin() and v_role <> 'service_role' then
    raise exception 'not allowed';
  end if;

  select user_id, plan_id, invoice_id, billing_cycle
    into v_user_id, v_plan_id, v_invoice_id, v_billing_cycle
  from public.pix_payments
  where provider_payment_id = p_provider_payment_id;

  if v_invoice_id is not null then
    v_payment_method := 'pix';
  else
    select user_id, plan_id, id, billing_cycle, payment_method
      into v_user_id, v_plan_id, v_invoice_id, v_billing_cycle, v_payment_method
    from public.invoices
    where provider_payment_id = p_provider_payment_id;
  end if;

  if v_invoice_id is null then
    raise exception 'payment not found';
  end if;

  if exists (select 1 from public.invoices where id = v_invoice_id and status = 'paid') then
    return;
  end if;

  v_billing_cycle := coalesce(v_billing_cycle, 'month');
  v_payment_method := coalesce(v_payment_method, 'pix');
  v_cycle_days := case when v_billing_cycle = 'year' then 365 else 30 end;

  if v_plan_id is null then
    raise exception 'plan_id missing for invoice';
  end if;

  update public.invoices
  set status = 'paid',
      paid_at = now(),
      due_date = now() + make_interval(days => v_cycle_days),
      billing_cycle = v_billing_cycle,
      payment_method = v_payment_method,
      provider = 'asaas',
      provider_payment_id = p_provider_payment_id
  where id = v_invoice_id;

  update public.pix_payments
  set status = 'paid',
      paid_at = now(),
      updated_at = now()
  where provider_payment_id = p_provider_payment_id;

  insert into public.user_subscriptions (user_id, plan_id, status, current_period_end, billing_cycle, updated_at)
  values (v_user_id, v_plan_id, 'active', now() + make_interval(days => v_cycle_days), v_billing_cycle, now())
  on conflict (user_id) do update
  set plan_id = excluded.plan_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      billing_cycle = excluded.billing_cycle,
      updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.confirm_asaas_payment(text) to authenticated;

