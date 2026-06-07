-- =============================================================================
-- Admin modules: announcements, coupons, promotions, sale pricing, analytics
-- =============================================================================

-- Per-item sale price (manual discount on a product)
alter table public.products add column if not exists sale_price numeric(10,2);

-- Coupon + discount captured on each order
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount numeric(10,2) not null default 0;

-- ----------------------------------------------------------------------------
-- Announcements (promo banner on storefront)
-- ----------------------------------------------------------------------------
create table if not exists public.announcements (
  id         bigint generated always as identity primary key,
  title      text not null,
  body       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Coupons (discount codes entered at checkout)
-- ----------------------------------------------------------------------------
create table if not exists public.coupons (
  id             bigint generated always as identity primary key,
  code           text not null unique,
  discount_type  text not null default 'percent' check (discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null default 0,
  min_subtotal   numeric(10,2) not null default 0,
  active         boolean not null default true,
  expires_at     date,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Promotions (sale pricing on all items / a category / a product)
-- ----------------------------------------------------------------------------
create table if not exists public.promotions (
  id          bigint generated always as identity primary key,
  name        text not null,
  scope       text not null default 'all' check (scope in ('all','category','product')),
  category_id bigint references public.categories(id) on delete cascade,
  product_id  bigint references public.products(id) on delete cascade,
  percent_off int not null default 0 check (percent_off between 0 and 100),
  active      boolean not null default true,
  ends_at     date,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.announcements enable row level security;
alter table public.coupons       enable row level security;
alter table public.promotions    enable row level security;

drop policy if exists "ann public read"  on public.announcements;
drop policy if exists "ann admin write"  on public.announcements;
create policy "ann public read" on public.announcements for select using (true);
create policy "ann admin write" on public.announcements for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "coupon public read" on public.coupons;
drop policy if exists "coupon admin write" on public.coupons;
create policy "coupon public read" on public.coupons for select using (true);
create policy "coupon admin write" on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "promo public read" on public.promotions;
drop policy if exists "promo admin write" on public.promotions;
create policy "promo public read" on public.promotions for select using (true);
create policy "promo admin write" on public.promotions for all
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Seed: a friendly launch announcement (edit/delete in the admin dashboard)
-- =============================================================================
insert into public.announcements (title, body, active)
select '🎉 Now ordering online!', 'Pickup & delivery across Miri — order ahead and skip the queue.', true
where not exists (select 1 from public.announcements);
