-- =====================================================================
-- 3-р шат: ШТС (шатахуун түгээх станц) — борлуулалт, ээлж
-- Supabase SQL Editor дээр бүхэлд нь нэг удаа ажиллуулна.
-- Салбар = станц. Ажилтны оноогдсон салбар ШТС бол апп-д нь "ШТС" хэсэг гарна.
-- =====================================================================

alter table branches add column if not exists is_station boolean not null default false;

-- ---------- Шатахууны төрөл, үнэ ----------
create table if not exists fuel_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,                              -- АИ-92, АИ-95, Дизель
  price numeric(12,2) not null check (price >= 0), -- 1 литрийн үнэ (₮)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- ---------- Сав ----------
create table if not exists station_tanks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  fuel_type_id uuid not null references fuel_types(id),
  name text not null,                              -- Сав-1
  capacity_liters numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Хошуу (тоолуур) ----------
create table if not exists station_nozzles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  tank_id uuid not null references station_tanks(id),
  name text not null,                              -- Колонк 1-А
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Ээлж ----------
create table if not exists station_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed')),
  opened_by uuid not null references employees(id),
  opened_at timestamptz not null default now(),
  -- Өмнөх ээлжээс хүлээн авсан бэлэн мөнгө: шилжүүлсэн гэж бүртгэгдсэн ба бодитоор тоолсон
  handover_expected numeric(14,2) not null default 0,
  handover_received numeric(14,2) not null default 0,
  closed_by uuid references employees(id),
  closed_at timestamptz,
  -- Хаах үеийн тооцоо
  sales_liters numeric(14,3),
  sales_amount numeric(14,2),                      -- тоолуураар тооцсон борлуулалт
  pay_cash numeric(14,2),
  pay_card numeric(14,2),
  pay_coupon numeric(14,2),                        -- талон
  pay_credit numeric(14,2),                        -- зээл
  difference numeric(14,2),                        -- төлбөр − борлуулалт (хасах бол дутагдал)
  handover_cash numeric(14,2),                     -- дараагийн ээлжид шилжүүлсэн бэлэн мөнгө
  note text
);
create index if not exists station_shifts_branch on station_shifts (branch_id, opened_at desc);
-- Нэг станцад нэг зэрэг нэг л нээлттэй ээлж
create unique index if not exists station_one_open_shift on station_shifts (branch_id) where status = 'open';

-- ---------- Хошуу бүрийн тоолуурын заалт ----------
create table if not exists shift_readings (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references station_shifts(id) on delete cascade,
  nozzle_id uuid not null references station_nozzles(id),
  start_reading numeric(14,3) not null,
  end_reading numeric(14,3),
  price numeric(12,2),                             -- хаах үеийн үнэ (түүхэнд хадгална)
  liters numeric(14,3),
  amount numeric(14,2),
  unique (shift_id, nozzle_id)
);

-- ---------- Түлш хүлээн авалт ----------
create table if not exists fuel_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  tank_id uuid not null references station_tanks(id),
  shift_id uuid references station_shifts(id) on delete set null,
  liters numeric(14,3) not null check (liters > 0),
  doc_no text,                                     -- падааны дугаар
  supplier text,
  received_by uuid not null references employees(id),
  received_at timestamptz not null default now()
);

-- ---------- Савны хэмжилт (бодит үлдэгдэл) ----------
create table if not exists tank_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  tank_id uuid not null references station_tanks(id),
  shift_id uuid references station_shifts(id) on delete set null,
  liters numeric(14,3) not null check (liters >= 0),
  book_liters numeric(14,3),                       -- дансны үлдэгдэл (хэмжих үеийн тооцоо)
  measured_by uuid not null references employees(id),
  measured_at timestamptz not null default now()
);
create index if not exists tank_measurements_tank on tank_measurements (tank_id, measured_at desc);

-- ---------- Эрх (бүх бичилтийг сервер service role-оор хийнэ) ----------
alter table fuel_types        enable row level security;
alter table station_tanks     enable row level security;
alter table station_nozzles   enable row level security;
alter table station_shifts    enable row level security;
alter table shift_readings    enable row level security;
alter table fuel_receipts     enable row level security;
alter table tank_measurements enable row level security;

drop policy if exists fuel_read on fuel_types;
create policy fuel_read on fuel_types for select using (organization_id = my_org());
drop policy if exists tank_read on station_tanks;
create policy tank_read on station_tanks for select using (organization_id = my_org());
drop policy if exists nozzle_read on station_nozzles;
create policy nozzle_read on station_nozzles for select using (organization_id = my_org());
drop policy if exists shift_read on station_shifts;
create policy shift_read on station_shifts for select
  using (organization_id = my_org() and (is_staff_admin() or branch_id = (my_employee()).branch_id));
drop policy if exists reading_read on shift_readings;
create policy reading_read on shift_readings for select
  using (exists (select 1 from station_shifts s where s.id = shift_id and s.organization_id = my_org()
                 and (is_staff_admin() or s.branch_id = (my_employee()).branch_id)));
drop policy if exists receipt_read on fuel_receipts;
create policy receipt_read on fuel_receipts for select
  using (organization_id = my_org() and (is_staff_admin() or branch_id = (my_employee()).branch_id));
drop policy if exists measure_read on tank_measurements;
create policy measure_read on tank_measurements for select
  using (organization_id = my_org() and (is_staff_admin() or branch_id = (my_employee()).branch_id));
