-- =====================================================================
-- 10-р шат: ШТС талон импорт — зарсан огнооноос өмнөх огноог түр зөвшөөрөх
-- Supabase SQL Editor дээр бүхэлд нь нэг удаа ажиллуулна.
-- Тохиргоо → ШТС апп → «Зарсан огнооноос өмнө оруулах» эрхтэй ажилтан импортын
-- формд тусгайлан чагтлаад импортлоход шалгалт алгасагдана. Бусад шалгалт хэвээр.
-- =====================================================================

drop function if exists talon_redeem_import(uuid, uuid, uuid, text[], date[]);

create or replace function talon_redeem_import(
  p_org uuid, p_branch uuid, p_by uuid, p_serials text[], p_dates date[], p_allow_before_sale boolean default false
) returns int language plpgsql as $$
declare v_today date := (now() at time zone 'Asia/Ulaanbaatar')::date; v_cnt int; v_list text; v_n int;
begin
  if not exists (select 1 from units where id = p_branch and organization_id = p_org and is_station) then
    raise exception 'TALON_BRANCH';
  end if;
  if coalesce(array_length(p_serials, 1), 0) = 0 or array_length(p_serials, 1) <> array_length(p_dates, 1) then
    raise exception 'TALON_FORMAT';
  end if;

  create temp table _imp on commit drop as
    select distinct on (s) s as serial, d as rdate from unnest(p_serials, p_dates) as u(s, d) order by s, d;

  if exists (select 1 from _imp where serial !~ '^A[ABC][0-9]{7}$' or rdate is null) then raise exception 'TALON_FORMAT'; end if;

  select count(*), string_agg(serial, ', ' order by serial) filter (where rn <= 10) into v_cnt, v_list
    from (select serial, row_number() over (order by serial) rn from _imp where rdate > v_today) x;
  if v_cnt > 0 then raise exception 'TALON_FUTURE' using detail = v_cnt || '|' || v_list; end if;

  -- Давхар оруулахаас сэргийлж мөрүүдийг түгжинэ
  perform 1 from talons t join _imp i on i.serial = t.serial where t.organization_id = p_org for update of t;

  select count(*), string_agg(serial, ', ' order by serial) filter (where rn <= 10) into v_cnt, v_list
    from (select i.serial, row_number() over (order by i.serial) rn from _imp i
           where not exists (select 1 from talons t where t.organization_id = p_org and t.serial = i.serial)) x;
  if v_cnt > 0 then raise exception 'TALON_NOT_SOLD' using detail = v_cnt || '|' || v_list; end if;

  select count(*), string_agg(info, ', ' order by serial) filter (where rn <= 10) into v_cnt, v_list
    from (select t.serial, t.serial || ' (' || coalesce(b.name, '?') || ', ' || to_char(t.redeemed_date, 'YYYY.MM.DD') || ')' info,
                 row_number() over (order by t.serial) rn
            from talons t join _imp i on i.serial = t.serial left join units b on b.id = t.redeemed_branch_id
           where t.organization_id = p_org and t.redeemed_date is not null) x;
  if v_cnt > 0 then raise exception 'TALON_USED' using detail = v_cnt || '|' || v_list; end if;

  -- «Зарсан огнооноос өмнө оруулах» эрхтэй, тусгайлан зөвшөөрсөн үед алгасна
  select count(*), string_agg(serial, ', ' order by serial) filter (where rn <= 10) into v_cnt, v_list
    from (select t.serial, row_number() over (order by t.serial) rn
            from talons t join _imp i on i.serial = t.serial
           where t.organization_id = p_org and t.sold_date > i.rdate) x;
  if v_cnt > 0 and not coalesce(p_allow_before_sale, false) then raise exception 'TALON_BEFORE_SALE' using detail = v_cnt || '|' || v_list; end if;

  update talons t
     set redeemed_date = i.rdate, redeemed_branch_id = p_branch, redeemed_by = p_by, redeemed_recorded_at = now(), shift_id = null
    from _imp i
   where t.organization_id = p_org and t.serial = i.serial;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function talon_redeem_import(uuid, uuid, uuid, text[], date[], boolean) from public, anon, authenticated;
grant execute on function talon_redeem_import(uuid, uuid, uuid, text[], date[], boolean) to service_role;
