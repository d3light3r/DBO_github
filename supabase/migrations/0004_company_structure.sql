-- =====================================================================
-- 4-р шат: группийн бүтэц  Компани → Алба хэлтэс → Салбар
--   * branches хүснэгт = "Координат" (ирц бүртгэх цэг) хэвээр
--   * units хүснэгт    = "Салбар" (байгууллагын нэгж). is_station = ШТС
--   * Утас шаардах тохиргоо ажилтан бүр дээр
-- Supabase SQL Editor дээр бүхэлд нь нэг удаа ажиллуулна.
-- =====================================================================

-- ---------- Компани ----------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- ---------- Алба хэлтэс → компанид харьяалагдана ----------
alter table departments add column if not exists company_id uuid references companies(id) on delete restrict;

-- ---------- Салбар ----------
create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete restrict,
  name text not null,
  is_station boolean not null default false,       -- ШТС бол ажилтнууд нь ШТС апп-д орно
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists units_department on units (department_id);

-- ---------- Ажилтан ----------
alter table employees add column if not exists company_id uuid references companies(id) on delete set null;
alter table employees add column if not exists unit_id uuid references units(id) on delete set null;
alter table employees add column if not exists require_device boolean not null default true;

-- Өмнөх байгууллагын түвшний тохиргоог ажилтан бүрт хуулна
update employees e set require_device = o.require_device from organizations o where o.id = e.organization_id;

-- ---------- Одоо байгаа өгөгдлийг шинэ бүтэц рүү ----------
-- Компанигүй байгууллагад байгууллагын нэрээр анхны компани үүсгэнэ
insert into companies (organization_id, name)
select o.id, o.name from organizations o
where not exists (select 1 from companies c where c.organization_id = o.id);

update departments d set company_id = c.id
from companies c
where d.company_id is null and c.organization_id = d.organization_id
  and c.id = (select id from companies c2 where c2.organization_id = d.organization_id order by created_at limit 1);

update employees e set company_id = c.id
from companies c
where e.company_id is null and c.organization_id = e.organization_id
  and c.id = (select id from companies c2 where c2.organization_id = e.organization_id order by created_at limit 1);

-- Ажилтны хэлтэс нь өөр компанийнх байвал засна
update employees e set company_id = d.company_id from departments d where e.department_id = d.id and d.company_id is not null;

-- ШТС-1, ШТС-2 салбарыг "ШТС" алба хэлтэс дотор үүсгэнэ (салбар огт байхгүй үед)
do $$
declare o record; c_id uuid; d_id uuid;
begin
  for o in select id from organizations loop
    if not exists (select 1 from units where organization_id = o.id) then
      select id into c_id from companies where organization_id = o.id order by created_at limit 1;
      insert into departments (organization_id, company_id, name) values (o.id, c_id, 'ШТС') returning id into d_id;
      insert into units (organization_id, department_id, name, is_station) values
        (o.id, d_id, 'ШТС-1', true),
        (o.id, d_id, 'ШТС-2', true);
    end if;
  end loop;
end $$;

-- ---------- ШТС-ийн хүснэгтүүд: станц = салбар (units) ----------
-- (Энэ үед ШТС-ийн хүснэгтүүд хоосон байгаа тул шууд шилжүүлнэ. Өгөгдөлтэй бол алдаа өгч зогсоно.)
alter table station_tanks     drop constraint if exists station_tanks_branch_id_fkey;
alter table station_nozzles   drop constraint if exists station_nozzles_branch_id_fkey;
alter table station_shifts    drop constraint if exists station_shifts_branch_id_fkey;
alter table fuel_receipts     drop constraint if exists fuel_receipts_branch_id_fkey;
alter table tank_measurements drop constraint if exists tank_measurements_branch_id_fkey;
-- Түүх алдагдахгүйн тулд ШТС салбарыг ээлжийн түүхтэй үед устгахыг хориглоно
alter table station_tanks     add constraint station_tanks_branch_id_fkey     foreign key (branch_id) references units(id) on delete restrict;
alter table station_nozzles   add constraint station_nozzles_branch_id_fkey   foreign key (branch_id) references units(id) on delete restrict;
alter table station_shifts    add constraint station_shifts_branch_id_fkey    foreign key (branch_id) references units(id) on delete restrict;
alter table fuel_receipts     add constraint fuel_receipts_branch_id_fkey     foreign key (branch_id) references units(id) on delete restrict;
alter table tank_measurements add constraint tank_measurements_branch_id_fkey foreign key (branch_id) references units(id) on delete restrict;

-- Координат дээр түр үүсгэсэн станцуудыг устгаж, "станц" тэмдгийг координатаас хасна
delete from branches b where b.is_station = true
  and not exists (select 1 from employees e where e.branch_id = b.id);
alter table branches drop column if exists is_station;

-- ---------- Эрх ----------
alter table companies enable row level security;
alter table units     enable row level security;
drop policy if exists company_read on companies;
create policy company_read on companies for select using (organization_id = my_org());
drop policy if exists unit_read on units;
create policy unit_read on units for select using (organization_id = my_org());

-- ШТС-ийн уншилтын эрх: ажилтны салбар (unit_id)-аар
drop policy if exists shift_read on station_shifts;
create policy shift_read on station_shifts for select
  using (organization_id = my_org() and (is_staff_admin() or branch_id = (my_employee()).unit_id));
drop policy if exists reading_read on shift_readings;
create policy reading_read on shift_readings for select
  using (exists (select 1 from station_shifts s where s.id = shift_id and s.organization_id = my_org()
                 and (is_staff_admin() or s.branch_id = (my_employee()).unit_id)));
drop policy if exists receipt_read on fuel_receipts;
create policy receipt_read on fuel_receipts for select
  using (organization_id = my_org() and (is_staff_admin() or branch_id = (my_employee()).unit_id));
drop policy if exists measure_read on tank_measurements;
create policy measure_read on tank_measurements for select
  using (organization_id = my_org() and (is_staff_admin() or branch_id = (my_employee()).unit_id));
