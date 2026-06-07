-- =============================================================================
-- HSI-parity: loyalty points + tiers, payment tracking, order ratings,
-- customer portal support.
-- =============================================================================

-- Loyalty points on the customer profile
alter table public.profiles add column if not exists loyalty_points int not null default 0;

-- Payment status + rating on orders
alter table public.orders add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'paid'));
alter table public.orders add column if not exists rating int check (rating between 1 and 5);
alter table public.orders add column if not exists rated_at timestamptz;

-- ----------------------------------------------------------------------------
-- Award loyalty points (1 point per RM of order total) when an order completes
-- ----------------------------------------------------------------------------
create or replace function public.award_loyalty()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed'
     and new.customer_id is not null then
    update public.profiles
      set loyalty_points = loyalty_points + floor(new.total)::int
      where id = new.customer_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_award_loyalty on public.orders;
create trigger trg_award_loyalty after update on public.orders
  for each row execute function public.award_loyalty();

-- ----------------------------------------------------------------------------
-- Let a customer rate their own completed order (column-safe via RPC)
-- ----------------------------------------------------------------------------
create or replace function public.rate_order(p_order_id bigint, p_rating int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1-5'; end if;
  update public.orders set rating = p_rating, rated_at = now()
    where id = p_order_id and customer_id = auth.uid() and status = 'completed';
end;
$$;
grant execute on function public.rate_order(bigint, int) to authenticated;

-- Allow admins to update profiles (e.g. adjust loyalty points)
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());
