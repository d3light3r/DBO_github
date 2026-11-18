-- =====================================================================
-- 2-р шат: утас бүртгэл, нэмэлт ажлын өдөр
-- Supabase SQL Editor дээр бүхэлд нь нэг удаа ажиллуулна.
-- =====================================================================

-- ---------- Байгууллагын тохиргоо ----------
-- true бол ажилтан зөвхөн админ баталсан утаснаасаа цаг бүртгүүлнэ
alter table organizations add column if not exists require_device boolean not null default true;

-- ---------- Бүртгэлтэй утас ----------
-- Утас бүрт хөтчийн cookie-д санамсаргүй түлхүүр хадгалж, түүний hash-ийг энд хадгална.
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  token_hash text not null unique,             -- нэг утас нэг л ажилтанд
  label text,                                  -- "iPhone · Safari" гэх мэт
  status text not null default 'pending' check (status in ('pending','approved')),
  approved_by uuid references employees(id) on delete set null,
  approved_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists devices_org_status on devices (organization_id, status);
-- Нэг ажилтан нэг л батлагдсан утастай
create unique index if not exists devices_one_approved on devices (employee_id) where status = 'approved';

-- ---------- Нэмэлт ажлын өдөр ----------
-- Тогтмол хуваарьтай ажилтнуудад амралтын өдөр байсан ч ажлын өдөрт тооцно (нөхөж ажиллах өдөр г.м.)
create table if not exists work_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  date date not null,
  name text not null,
  unique (organization_id, date)
);

alter table devices   enable row level security;
alter table work_days enable row level security;

drop policy if exists device_read on devices;
create policy device_read on devices for select
  using (employee_id = (my_employee()).id or (organization_id = my_org() and is_staff_admin()));
drop policy if exists workday_read on work_days;
create policy workday_read on work_days for select using (organization_id = my_org());
