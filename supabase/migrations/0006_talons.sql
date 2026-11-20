-- =====================================================================
-- 6-р шат: Талоны бүртгэл (шатахууны талон)
-- Supabase SQL Editor дээр бүхэлд нь нэг удаа ажиллуулна.
--
-- Сериал: 2 үсэг + 7 оронтой тоо. Үсэг нь талоны төрлийг заана:
--   AA = 20 000₮,  AB = 50 000₮,  AC = 10 000₮
-- Урсгал: Админ/менежер харилцагчид ЗАРНА -> ШТС салбарын (units) ажилтан
-- ОРУУЛНА (харилцагч талоноор бүтээгдэхүүн авсан). Зараагүй эсвэл аль хэдийн
-- оруулсан талоныг оруулахыг өгөгдлийн сангийн түвшинд хориглоно.
-- Тухайн өдрөөр оруулахад станцын нээлттэй ээлжтэй холбогдож, ээлж хаахад
-- "Талон" орлого автоматаар бөглөгдөнө.
-- =====================================================================

-- ---------- Харилцагч ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  register text,                 -- регистр / ААН-ийн регистр
  phone text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on customers (organization_id, name);

-- ---------- Талоны тохиргоо ----------
-- backdate_days: хэдэн өдрөөр нөхөж оруулахыг зөвшөөрөх. NULL эсвэл 0 бол зөвхөн тухайн өдөр.
create table talon_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  backdate_days int check (backdate_days between 0 and 365),
  updated_by uuid references employees(id),
  updated_at timestamptz not null default now()
);

-- ---------- Талон ----------
create table talons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  serial text not null check (serial ~ '^A[ABC][0-9]{7}$'),
  denomination int generated always as (
    case left(serial, 2) when 'AA' then 20000 when 'AB' then 50000 when 'AC' then 10000 end
  ) stored,
  customer_id uuid not null references customers(id),
  sold_date date not null,                       -- зарсан огноо
  sold_by uuid references employees(id),
  sold_recorded_at timestamptz not null default now(),
  redeemed_date date,                            -- салбарт оруулсан (ашигласан) огноо
  redeemed_branch_id uuid references units(id) on delete restrict,   -- ШТС салбар
  redeemed_by uuid references employees(id),
  redeemed_recorded_at timestamptz,              -- системд бүртгэсэн цаг
  shift_id uuid references station_shifts(id) on delete set null,    -- оруулах үеийн нээлттэй ээлж
  unique (organization_id, serial),
  check ((redeemed_date is null) = (redeemed_recorded_at is null))
);
create index on talons (organization_id, redeemed_date);
create index on talons (organization_id, sold_date);
create index on talons (organization_id, customer_id);
create index on talons (redeemed_branch_id, redeemed_date);
create index on talons (shift_id);

alter table customers      enable row level security;
alter table talon_settings enable row level security;
alter table talons         enable row level security;

create policy cust_read on customers for select using (organization_id = my_org() and is_staff_admin());
create policy tset_read on talon_settings for select using (organization_id = my_org());
create policy talon_read on talons for select
  using (organization_id = my_org() and (is_staff_admin() or redeemed_branch_id = (my_employee()).unit_id));

-- =====================================================================
-- Олноор нь бүртгэх функцууд (нэг гүйлгээнд бүгд эсвэл юу ч биш)
-- Зөвхөн сервер (service role) дуудна.
-- =====================================================================

create or replace function talon_range(p_from text, p_to text)
returns table (prefix text, n_from int, n_to int)
language plpgsql immutable as $$
begin
  if p_from !~ '^A[ABC][0-9]{7}$' or p_to !~ '^A[ABC][0-9]{7}$' then
    raise exception 'TALON_FORMAT';
  end if;
  if left(p_from, 2) <> left(p_to, 2) then raise exception 'TALON_PREFIX'; end if;
  if p_to < p_from then raise exception 'TALON_ORDER'; end if;
  if substr(p_to, 3)::int - substr(p_from, 3)::int + 1 > 10000 then raise exception 'TALON_TOO_MANY'; end if;
  return query select left(p_from, 2), substr(p_from, 3)::int, substr(p_to, 3)::int;
end $$;

-- Зарах
create or replace function talon_sell(
  p_org uuid, p_from text, p_to text, p_customer uuid, p_sold_date date, p_by uuid
) returns int language plpgsql as $$
declare r record; v_list text; v_cnt int; v_n int;
begin
  select * into r from talon_range(p_from, p_to);
  if not exists (select 1 from customers where id = p_customer and organization_id = p_org) then
    raise exception 'TALON_CUSTOMER';
  end if;
  if p_sold_date > (now() at time zone 'Asia/Ulaanbaatar')::date then raise exception 'TALON_FUTURE'; end if;

  select count(*), string_agg(serial, ', ' order by serial) filter (where rn <= 10)
    into v_cnt, v_list
    from (select serial, row_number() over (order by serial) rn from talons
          where organization_id = p_org and serial between p_from and p_to) x;
  if v_cnt > 0 then
    raise exception 'TALON_EXISTS' using detail = v_cnt || '|' || v_list;
  end if;

  insert into talons (organization_id, serial, customer_id, sold_date, sold_by)
  select p_org, r.prefix || lpad(g::text, 7, '0'), p_customer, p_sold_date, p_by
    from generate_series(r.n_from, r.n_to) g;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Салбарт оруулах (харилцагч талоноор худалдан авалт хийсэн)
create or replace function talon_redeem(
  p_org uuid, p_from text, p_to text, p_branch uuid, p_by uuid, p_date date
) returns int language plpgsql as $$
declare r record; v_list text; v_cnt int; v_n int; v_today date; v_back int; v_shift uuid;
begin
  select * into r from talon_range(p_from, p_to);
  if p_branch is null or not exists (select 1 from units where id = p_branch and organization_id = p_org and is_station) then
    raise exception 'TALON_BRANCH';
  end if;

  v_today := (now() at time zone 'Asia/Ulaanbaatar')::date;
  select coalesce(backdate_days, 0) into v_back from talon_settings where organization_id = p_org;
  v_back := coalesce(v_back, 0);
  if p_date > v_today or p_date < v_today - v_back then
    raise exception 'TALON_DATE' using detail = (v_today - v_back)::text || '|' || v_today::text;
  end if;

  -- Давхар оруулахаас сэргийлж мөрүүдийг түгжинэ
  perform 1 from talons where organization_id = p_org and serial between p_from and p_to for update;

  -- 1) Зарагдаагүй (бүртгэлгүй)
  select count(*), string_agg(s, ', ' order by s) filter (where rn <= 10) into v_cnt, v_list
    from (select s, row_number() over (order by s) rn
            from (select r.prefix || lpad(g::text, 7, '0') s from generate_series(r.n_from, r.n_to) g) a
           where not exists (select 1 from talons t where t.organization_id = p_org and t.serial = a.s)) x;
  if v_cnt > 0 then raise exception 'TALON_NOT_SOLD' using detail = v_cnt || '|' || v_list; end if;

  -- 2) Аль хэдийн оруулсан
  select count(*), string_agg(info, ', ' order by serial) filter (where rn <= 10) into v_cnt, v_list
    from (select t.serial, t.serial || ' (' || coalesce(b.name, '?') || ', ' || to_char(t.redeemed_date, 'YYYY.MM.DD') || ')' info,
                 row_number() over (order by t.serial) rn
            from talons t left join units b on b.id = t.redeemed_branch_id
           where t.organization_id = p_org and t.serial between p_from and p_to and t.redeemed_date is not null) x;
  if v_cnt > 0 then raise exception 'TALON_USED' using detail = v_cnt || '|' || v_list; end if;

  -- 3) Зарсан огнооноос өмнө оруулах боломжгүй
  select count(*), string_agg(serial, ', ' order by serial) filter (where rn <= 10) into v_cnt, v_list
    from (select serial, row_number() over (order by serial) rn from talons
           where organization_id = p_org and serial between p_from and p_to and sold_date > p_date) x;
  if v_cnt > 0 then raise exception 'TALON_BEFORE_SALE' using detail = v_cnt || '|' || v_list; end if;

  -- Өнөөдрөөр оруулбал станцын нээлттэй ээлжтэй холбоно
  if p_date = v_today then
    select id into v_shift from station_shifts where branch_id = p_branch and status = 'open' limit 1;
  end if;

  update talons
     set redeemed_date = p_date, redeemed_branch_id = p_branch, redeemed_by = p_by, redeemed_recorded_at = now(), shift_id = v_shift
   where organization_id = p_org and serial between p_from and p_to;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Алдаа засах (зөвхөн админ): 'redeem' = оруулалтыг цуцлах, 'sale' = зараагүй талоны борлуулалтыг устгах
create or replace function talon_undo(p_org uuid, p_from text, p_to text, p_mode text)
returns int language plpgsql as $$
declare r record; v_list text; v_cnt int; v_n int;
begin
  select * into r from talon_range(p_from, p_to);
  if p_mode = 'redeem' then
    update talons set redeemed_date = null, redeemed_branch_id = null, redeemed_by = null, redeemed_recorded_at = null, shift_id = null
     where organization_id = p_org and serial between p_from and p_to and redeemed_date is not null;
  elsif p_mode = 'sale' then
    select count(*), string_agg(serial, ', ' order by serial) filter (where rn <= 10) into v_cnt, v_list
      from (select serial, row_number() over (order by serial) rn from talons
             where organization_id = p_org and serial between p_from and p_to and redeemed_date is not null) x;
    if v_cnt > 0 then raise exception 'TALON_USED' using detail = v_cnt || '|' || v_list; end if;
    delete from talons where organization_id = p_org and serial between p_from and p_to;
  else
    raise exception 'TALON_MODE';
  end if;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Тайлангийн нэгтгэл (төрөл тус бүрээр)
create or replace function talon_summary(p_org uuid, p_from date, p_to date)
returns table (denomination int, sold_cnt bigint, redeemed_cnt bigint, outstanding_cnt bigint)
language sql stable as $$
  select t.denomination,
         count(*) filter (where t.sold_date between p_from and p_to),
         count(*) filter (where t.redeemed_date between p_from and p_to),
         count(*) filter (where t.redeemed_date is null)
    from talons t where t.organization_id = p_org
   group by t.denomination order by t.denomination desc
$$;

-- Салбар тус бүрийн оруулалт
create or replace function talon_branch_summary(p_org uuid, p_from date, p_to date)
returns table (branch_id uuid, denomination int, cnt bigint)
language sql stable as $$
  select t.redeemed_branch_id, t.denomination, count(*)
    from talons t
   where t.organization_id = p_org and t.redeemed_date between p_from and p_to
   group by 1, 2
$$;

-- Харилцагч тус бүрийн талон
create or replace function talon_customer_summary(p_org uuid)
returns table (customer_id uuid, sold_cnt bigint, redeemed_cnt bigint, sold_amount bigint, outstanding_amount bigint)
language sql stable as $$
  select t.customer_id, count(*), count(t.redeemed_date),
         sum(t.denomination), coalesce(sum(t.denomination) filter (where t.redeemed_date is null), 0)
    from talons t where t.organization_id = p_org
   group by 1
$$;

-- Станцын өнөөдөр оруулсан нийт ба ээлжийн талоны дүн
create or replace function talon_station_totals(p_unit uuid, p_shift uuid)
returns table (today_cnt bigint, today_amount bigint, shift_cnt bigint, shift_amount bigint)
language sql stable as $$
  select count(*) filter (where redeemed_date = (now() at time zone 'Asia/Ulaanbaatar')::date),
         coalesce(sum(denomination) filter (where redeemed_date = (now() at time zone 'Asia/Ulaanbaatar')::date), 0),
         count(*) filter (where p_shift is not null and shift_id = p_shift),
         coalesce(sum(denomination) filter (where p_shift is not null and shift_id = p_shift), 0)
    from talons
   where redeemed_branch_id = p_unit
     and (redeemed_date >= (now() at time zone 'Asia/Ulaanbaatar')::date - 2 or shift_id = p_shift)
$$;

revoke all on function talon_customer_summary(uuid) from public, anon, authenticated;
revoke all on function talon_station_totals(uuid, uuid) from public, anon, authenticated;
grant execute on function talon_customer_summary(uuid) to service_role;
grant execute on function talon_station_totals(uuid, uuid) to service_role;
revoke all on function talon_range(text, text) from public, anon, authenticated;
revoke all on function talon_sell(uuid, text, text, uuid, date, uuid) from public, anon, authenticated;
revoke all on function talon_redeem(uuid, text, text, uuid, uuid, date) from public, anon, authenticated;
revoke all on function talon_undo(uuid, text, text, text) from public, anon, authenticated;
revoke all on function talon_summary(uuid, date, date) from public, anon, authenticated;
revoke all on function talon_branch_summary(uuid, date, date) from public, anon, authenticated;
grant execute on function talon_range(text, text) to service_role;
grant execute on function talon_sell(uuid, text, text, uuid, date, uuid) to service_role;
grant execute on function talon_redeem(uuid, text, text, uuid, uuid, date) to service_role;
grant execute on function talon_undo(uuid, text, text, text) to service_role;
grant execute on function talon_summary(uuid, date, date) to service_role;
grant execute on function talon_branch_summary(uuid, date, date) to service_role;
