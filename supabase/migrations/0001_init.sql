-- =============================================================================
-- Fan Tuan · Taiwanese Rice Roll (Miri) — initial schema
-- Single-shop F&B ordering app. Run this in the Supabase SQL editor.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Profiles (extends auth.users). role = 'customer' | 'admin'
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          coalesce(new.raw_user_meta_data ->> 'phone', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an admin? (security definer avoids RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null,
  name_bm     text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Products (menu items)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id             bigint generated always as identity primary key,
  category_id    bigint references public.categories (id) on delete set null,
  name           text not null,
  name_bm        text,
  description    text,
  description_bm text,
  price          numeric(10,2) not null default 0,
  image_url      text,
  available      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Orders + items
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id               bigint generated always as identity primary key,
  order_number     text not null unique,
  customer_id      uuid references auth.users (id) on delete set null,
  customer_name    text not null,
  customer_phone   text not null,
  fulfillment_type text not null default 'pickup' check (fulfillment_type in ('pickup', 'delivery')),
  address          text,
  notes            text,
  payment_method   text not null default 'cash' check (payment_method in ('cash', 'transfer', 'card')),
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  subtotal         numeric(10,2) not null default 0,
  delivery_fee     numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders (id) on delete cascade,
  product_id   bigint references public.products (id) on delete set null,
  product_name text not null,
  unit_price   numeric(10,2) not null,
  quantity     int not null check (quantity > 0),
  line_total   numeric(10,2) not null
);

create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_products_category on public.products (category_id);

-- Human-readable order number: TRR-YYYYMMDD-#### (sequential per day-ish).
create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number :=
      'TRR-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad(((floor(random() * 900) + 100))::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_number on public.orders;
create trigger trg_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- ----------------------------------------------------------------------------
-- Settings (simple key/value shop config)
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.settings    enable row level security;

-- profiles: users manage their own row; admins can read all
drop policy if exists "profiles self read"  on public.profiles;
drop policy if exists "profiles self upsert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles self upsert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles admin read"  on public.profiles for select using (public.is_admin());

-- categories: public read; admin write
drop policy if exists "categories public read" on public.categories;
drop policy if exists "categories admin write" on public.categories;
create policy "categories public read" on public.categories for select using (true);
create policy "categories admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- products: public read; admin write
drop policy if exists "products public read" on public.products;
drop policy if exists "products admin write" on public.products;
create policy "products public read" on public.products for select using (true);
create policy "products admin write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- orders: anyone (incl. guests via anon key) can create; customers read own; admin all
drop policy if exists "orders insert any"    on public.orders;
drop policy if exists "orders read own"      on public.orders;
drop policy if exists "orders admin manage"  on public.orders;
create policy "orders insert any"   on public.orders for insert with check (true);
create policy "orders read own"     on public.orders for select
  using (auth.uid() is not null and auth.uid() = customer_id);
create policy "orders admin manage" on public.orders for all
  using (public.is_admin()) with check (public.is_admin());

-- order_items: insert with parent; read own via parent; admin all
drop policy if exists "order_items insert any"   on public.order_items;
drop policy if exists "order_items read own"     on public.order_items;
drop policy if exists "order_items admin manage" on public.order_items;
create policy "order_items insert any" on public.order_items for insert with check (true);
create policy "order_items read own"   on public.order_items for select using (
  exists (select 1 from public.orders o
          where o.id = order_id and o.customer_id = auth.uid())
);
create policy "order_items admin manage" on public.order_items for all
  using (public.is_admin()) with check (public.is_admin());

-- settings: public read; admin write
drop policy if exists "settings public read" on public.settings;
drop policy if exists "settings admin write" on public.settings;
create policy "settings public read" on public.settings for select using (true);
create policy "settings admin write" on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Seed data — Taiwan Rice Roll (Jalan Luak, Miri) menu (prices in RM)
-- =============================================================================
insert into public.categories (name, name_bm, sort_order) values
  ('Today''s Special 今日菜单',  'Istimewa Hari Ini', 1),
  ('Rice Rolls 台湾紫米饭团',    'Nasi Gulung',       2),
  ('Vegetarian 素台湾紫米饭团',  'Vegetarian',        3),
  ('Burrito Wrap 墨西哥卷',      'Burrito',           4),
  ('Kefir Yogurt 开菲尔酸奶',    'Yogurt Kefir',      5),
  ('Drinks 饮料',                'Minuman',           6),
  ('Snacks 小吃',                'Snek',              7)
on conflict do nothing;

insert into public.products (category_id, name, name_bm, description, price, available, sort_order)
select c.id, v.name, null, null, v.price, true, v.sort_order
from (values
  -- Today's Special 今日菜单
  ('Today''s Special 今日菜单', 'Sour Vege Duck Rice Roll 酸菜鸭肉紫米饭团',         22.00, 1),
  ('Today''s Special 今日菜单', 'Orleans Chicken Rice Roll 奥尔良鸡排紫米饭团',       19.90, 2),
  -- Rice Rolls 台湾紫米饭团 (non-vegetarian)
  ('Rice Rolls 台湾紫米饭团', 'Dinosaur Rice Roll 恐龙紫米饭团',                     43.90, 1),
  ('Rice Rolls 台湾紫米饭团', 'Big Beef Rice Roll 大牛紫米饭团',                     22.90, 2),
  ('Rice Rolls 台湾紫米饭团', 'Ham Salted Egg Rice Roll 火腿咸蛋黄饭团',             22.90, 3),
  ('Rice Rolls 台湾紫米饭团', 'Chicken Floss Salted Egg 咸蛋肉松紫米饭团',           22.00, 4),
  ('Rice Rolls 台湾紫米饭团', 'Salted Egg Yolk Chicken Rice Roll 咸蛋黄鸡肉紫米饭团', 21.90, 5),
  ('Rice Rolls 台湾紫米饭团', 'Salted Egg Sausage Rice Roll 烤肠+咸蛋黄饭团',         20.90, 6),
  ('Rice Rolls 台湾紫米饭团', 'Sausage Fish Fillet Rice Roll 烤肠鱼柳饭团',           19.90, 7),
  ('Rice Rolls 台湾紫米饭团', 'Smoked Duck Rice Roll 烟熏鸭肉饭团',                   19.90, 8),
  ('Rice Rolls 台湾紫米饭团', 'Chef Decide (No Spicy) 厨师决定 荤-不辣',              19.90, 9),
  ('Rice Rolls 台湾紫米饭团', 'Chef Decide (Spicy) 厨师决定 荤-辣',                   19.90, 10),
  ('Rice Rolls 台湾紫米饭团', 'Grilled Beef Rice Roll 牛肉紫米饭团',                  19.90, 11),
  ('Rice Rolls 台湾紫米饭团', 'Spicy Carrot Fish Rice Roll 辣萝卜鱼柳饭团',           19.90, 12),
  ('Rice Rolls 台湾紫米饭团', 'Fried Chicken Rice Roll 鸡肉紫米饭团',                 19.90, 13),
  ('Rice Rolls 台湾紫米饭团', 'Tomyam Beef Rice Roll 东炎牛肉紫米饭团',               19.90, 14),
  ('Rice Rolls 台湾紫米饭团', 'Salted Egg Chicken Frank Rice Roll 咸蛋烤肠紫米饭团',   19.90, 15),
  ('Rice Rolls 台湾紫米饭团', 'Spicy Carrot Chicken Rice Roll 辣萝卜鸡肉饭团',         19.90, 16),
  ('Rice Rolls 台湾紫米饭团', 'Fish Fillet Egg Rice Roll 鱼柳蛋紫米饭团',             18.90, 17),
  ('Rice Rolls 台湾紫米饭团', 'Spicy Chicken Floss Rice Roll 香辣鸡丝饭团',           18.90, 18),
  ('Rice Rolls 台湾紫米饭团', 'Shaca Chicken Rice Roll 沙茶鸡排饭团',                 18.90, 19),
  ('Rice Rolls 台湾紫米饭团', 'Chicken Ham Rice Roll 火腿紫米饭团',                   18.90, 20),
  ('Rice Rolls 台湾紫米饭团', 'Chicken Sausage Rice Roll 烤肠紫米饭团',               18.90, 21),
  ('Rice Rolls 台湾紫米饭团', 'Spicy Garlic Beef Rice Roll 香辣牛肉饭团',             18.90, 22),
  ('Rice Rolls 台湾紫米饭团', 'Sausage Egg Rice Roll 烤肠蛋蛋饭团',                   18.90, 23),
  ('Rice Rolls 台湾紫米饭团', 'Garlic Beef Rice Roll 蒜香牛肉饭团',                   18.90, 24),
  ('Rice Rolls 台湾紫米饭团', 'Tomyam Chicken Rice Roll 东炎鸡紫米饭团',              17.90, 25),
  ('Rice Rolls 台湾紫米饭团', 'Garlic Fish Fillet Rice Roll 蒜香鱼柳饭团',            17.90, 26),
  ('Rice Rolls 台湾紫米饭团', 'Crab Stick Egg Rice Roll 蟹柳蛋紫米饭团',              17.00, 27),
  -- Vegetarian 素台湾紫米饭团
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Dinosaur 素恐龙紫米饭团',                 43.90, 1),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Spicy Carrot Fish Rice Roll 素辣萝卜鱼柳紫米饭团', 22.90, 2),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Spicy Salad Rice Roll 素辣萝卜沙拉饭团',  19.90, 3),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Meat Rice Roll 素三层肉紫米饭团',         19.90, 4),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Spicy Floss Rice Roll 素香辣肉松饭团',    18.90, 5),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Ham Cheesy Rice Ball 火腿芝士饭团 素',    17.90, 6),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Ham Egg Rice Roll 素火腿蛋饭团',          17.90, 7),
  ('Vegetarian 素台湾紫米饭团', 'Veg Shaca Chicken 素沙茶鸡肉紫米饭团',               17.90, 8),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Healthy Rice Roll 低脂蔬菜饭团',          17.90, 9),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Spicy Ham Egg Rice Roll 香辣素火腿饭团',  17.90, 10),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Spicy Chicken Rice Roll 香辣鸡饭团 素',   17.90, 11),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Chef Decide (Spicy) 厨师决定 素-辣',      16.90, 12),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Chef Decide (No Spicy) 厨师决定 素-不辣', 16.90, 13),
  ('Vegetarian 素台湾紫米饭团', 'Salad Vegetable Rice Roll 沙拉蔬菜饭团',             16.90, 14),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Cheesy Egg Rice Roll 芝士蛋饭团',         16.90, 15),
  ('Vegetarian 素台湾紫米饭团', 'Vegetarian Cheesy Corn Rice Roll 素芝士玉米饭团',    15.90, 16),
  -- Burrito Wrap 墨西哥卷
  ('Burrito Wrap 墨西哥卷', 'Ham Cheesy Burrito 火腿蛋蛋卷',                         19.90, 1),
  ('Burrito Wrap 墨西哥卷', 'Chicken Burrito 鸡肉卷',                                18.90, 2),
  ('Burrito Wrap 墨西哥卷', 'Chicken Floss Burrito 鸡肉松卷',                        18.90, 3),
  ('Burrito Wrap 墨西哥卷', 'Vege Lover Burrito 蔬菜起司卷',                         18.90, 4),
  -- Kefir Yogurt 开菲尔酸奶
  ('Kefir Yogurt 开菲尔酸奶', 'Kefir Yogurt Original 原味开菲尔',                     15.90, 1),
  ('Kefir Yogurt 开菲尔酸奶', 'Mango Kefir 芒果开菲尔',                               15.90, 2),
  ('Kefir Yogurt 开菲尔酸奶', 'Strawberry Kefir 草莓开菲尔',                          15.90, 3),
  ('Kefir Yogurt 开菲尔酸奶', 'Passion Fruit Kefir 百香果开菲尔',                     15.90, 4),
  -- Drinks 饮料
  ('Drinks 饮料', 'Mango Ice Tea 芒果茉莉冰茶',                                       12.90, 1),
  ('Drinks 饮料', 'Passion Fruit Ice Tea 百香果冰茶',                                 12.90, 2),
  ('Drinks 饮料', 'Sakura Pearl Peach Tea 樱花冰茶',                                  12.90, 3),
  ('Drinks 饮料', 'Peach Ice Tea 红桃茉莉冰茶',                                       11.90, 4),
  ('Drinks 饮料', 'Roselle Ice Tea 洛神花冰茶',                                       10.90, 5),
  ('Drinks 饮料', 'Jasmine Ice Tea 茉莉冰茶',                                          9.90, 6),
  -- Snacks 小吃
  ('Snacks 小吃', 'Jasmine Herbal Egg 茉莉花茶叶蛋',                                   5.00, 1)
) as v(cat, name, price, sort_order)
join public.categories c on c.name = v.cat
on conflict do nothing;

insert into public.settings (key, value) values
  ('shop_name',    'Taiwan Rice Roll 台湾紫米饭团'),
  ('shop_tagline', 'Authentic Taiwanese Purple Rice Rolls · Jalan Luak, Miri'),
  ('address',      'Jalan Luak, Miri, Sarawak'),
  ('hours',        'Daily 11:00am – 8:00pm'),
  ('delivery_fee', '5.00'),
  ('free_delivery_over', '50.00')
on conflict (key) do nothing;

-- =============================================================================
-- After signing up your own account, promote it to admin by running:
--   update public.profiles set role = 'admin' where id = '<your-user-uuid>';
-- (find the uuid in Authentication → Users)
-- =============================================================================
