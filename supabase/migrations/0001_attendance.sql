-- =====================================================================
-- Цаг бүртгэлийн систем: 1-р үе шат (MVP)
-- Supabase SQL Editor дээр бүхэлд нь нэг удаа ажиллуулна.
-- ERP болж томрох тул бүх хүснэгт organization_id-тэй.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Байгууллага ----------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Ulaanbaatar',
  created_at timestamptz not null default now()
);

-- ---------- Салбар / байршил ----------
create table branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,                         -- Төв оффис, ШТС-1, Агуулах ...
  latitude numeric(10,8) not null,
  longitude numeric(11,8) not null,
  radius_meters int not null default 100,
  allowed_ips text[] not null default '{}',   -- Wi-Fi-ийн public IP (хоосон бол зөвхөн GPS)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Хэлтэс ----------
create table departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- Ажлын хуваарь ----------
-- fixed: долоо хоногийн тогтмол цаг (жнь 09:00-18:00, Да-Ба)
-- cycle: ээлжийн мөчлөг (жнь 24/48 => work_days_in_cycle=1, cycle_length_days=3, shift_hours=24)
create table schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('fixed','cycle')),
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  break_minutes int not null default 60,
  work_weekdays int[] not null default '{1,2,3,4,5}',  -- 1=Даваа ... 7=Ням (fixed)
  cycle_length_days int,                               -- cycle
  work_days_in_cycle int,                              -- cycle
  shift_hours int,                                     -- cycle (жнь 24)
  late_grace_minutes int not null default 5,
  created_at timestamptz not null default now()
);

-- ---------- Ажилтан ----------
create table employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  emp_code text not null,
  full_name text not null,
  phone text not null unique,
  role text not null default 'employee' check (role in ('admin','manager','employee')),
  department_id uuid references departments(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  schedule_id uuid references schedules(id) on delete set null,
  cycle_anchor_date date,          -- ээлжийн мөчлөгийн эхний ажлын өдөр
  allow_trip boolean not null default false,   -- томилолтоор сельфигээр бүртгүүлэх эрх
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, emp_code)
);

-- ---------- Ирцийн бүртгэл ----------
create table attendance_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  work_date date not null,                 -- ээлж эхэлсэн өдөр (УБ цагаар)
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  in_lat numeric(10,8), in_lng numeric(11,8), in_accuracy int, in_distance int, in_ip text,
  out_lat numeric(10,8), out_lng numeric(11,8), out_accuracy int, out_distance int, out_ip text,
  verify_method text not null check (verify_method in ('GPS','WIFI','TRIP')),
  in_selfie_path text,
  out_selfie_path text,
  worked_minutes int,
  late_minutes int not null default 0,
  overtime_minutes int not null default 0,
  status text not null default 'working' check (status in ('working','completed')),
  review_status text not null default 'auto' check (review_status in ('auto','pending','approved','rejected')),
  note text,
  reviewed_by uuid references employees(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on attendance_logs (organization_id, work_date);
create index on attendance_logs (employee_id, work_date);
-- Нэг ажилтан нэг зэрэг зөвхөн нэг нээлттэй ирцтэй байна
create unique index attendance_one_open on attendance_logs (employee_id) where status = 'working';

-- ---------- Хүсэлт (чөлөө, илүү цаг, ...) ----------
create table requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null check (type in ('paid_leave','unpaid_leave','sick_leave','overtime','outside_work','forgot_checkin')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  total_hours numeric(6,2) not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references employees(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index on requests (organization_id, status);

-- ---------- Баярын өдөр ----------
create table holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  date date not null,
  name text not null,
  unique (organization_id, date)
);

-- =====================================================================
-- Эрхийн хамгаалалт (Row Level Security)
-- Ирц бичих, ажилтан үүсгэх зэрэг үйлдлийг зөвхөн сервер (service role) хийнэ.
-- Хэрэглэгч өөрийн мэдээллийг, админ/менежер байгууллагынхаа мэдээллийг уншина.
-- =====================================================================

create or replace function public.my_employee() returns employees
language sql stable security definer set search_path = public as $$
  select * from employees where user_id = auth.uid() and is_active limit 1
$$;

create or replace function public.my_org() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from employees where user_id = auth.uid() and is_active limit 1
$$;

create or replace function public.is_staff_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from employees where user_id = auth.uid() and is_active and role in ('admin','manager'))
$$;

alter table organizations   enable row level security;
alter table branches        enable row level security;
alter table departments     enable row level security;
alter table schedules       enable row level security;
alter table employees       enable row level security;
alter table attendance_logs enable row level security;
alter table requests        enable row level security;
alter table holidays        enable row level security;

create policy org_read on organizations for select using (id = my_org());
create policy branch_read on branches for select using (organization_id = my_org());
create policy dept_read on departments for select using (organization_id = my_org());
create policy sched_read on schedules for select using (organization_id = my_org());
create policy hol_read on holidays for select using (organization_id = my_org());

create policy emp_read on employees for select
  using (user_id = auth.uid() or (organization_id = my_org() and is_staff_admin()));

create policy att_read on attendance_logs for select
  using (employee_id = (my_employee()).id or (organization_id = my_org() and is_staff_admin()));

create policy req_read on requests for select
  using (employee_id = (my_employee()).id or (organization_id = my_org() and is_staff_admin()));

-- ---------- Сельфи зургийн хадгалалт (хувийн bucket) ----------
insert into storage.buckets (id, name, public) values ('selfies', 'selfies', false)
  on conflict (id) do nothing;
