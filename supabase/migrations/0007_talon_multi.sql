-- =====================================================================
-- 7-р шат: Талоныг AA / AB / AC олон мөрөөр нэг дор бүртгэх
-- 0006_talons.sql-ийн дараа Supabase SQL Editor дээр бүхэлд нь ажиллуулна.
-- Мөр бүрийг өмнөх функцээр шалгана; аль нэг нь алдаатай бол бүгд буцна.
-- =====================================================================

create or replace function talon_sell_multi(
  p_org uuid, p_from text[], p_to text[], p_customer uuid, p_sold_date date, p_by uuid
) returns int language plpgsql as $$
declare i int; v_n int := 0;
begin
  if coalesce(array_length(p_from, 1), 0) = 0 or array_length(p_from, 1) <> array_length(p_to, 1) then
    raise exception 'TALON_FORMAT';
  end if;
  for i in 1 .. array_length(p_from, 1) loop
    v_n := v_n + talon_sell(p_org, p_from[i], p_to[i], p_customer, p_sold_date, p_by);
  end loop;
  return v_n;
end $$;

create or replace function talon_redeem_multi(
  p_org uuid, p_from text[], p_to text[], p_branch uuid, p_by uuid, p_date date
) returns int language plpgsql as $$
declare i int; v_n int := 0;
begin
  if coalesce(array_length(p_from, 1), 0) = 0 or array_length(p_from, 1) <> array_length(p_to, 1) then
    raise exception 'TALON_FORMAT';
  end if;
  for i in 1 .. array_length(p_from, 1) loop
    v_n := v_n + talon_redeem(p_org, p_from[i], p_to[i], p_branch, p_by, p_date);
  end loop;
  return v_n;
end $$;

create or replace function talon_undo_multi(p_org uuid, p_from text[], p_to text[], p_mode text)
returns int language plpgsql as $$
declare i int; v_n int := 0;
begin
  if coalesce(array_length(p_from, 1), 0) = 0 or array_length(p_from, 1) <> array_length(p_to, 1) then
    raise exception 'TALON_FORMAT';
  end if;
  for i in 1 .. array_length(p_from, 1) loop
    v_n := v_n + talon_undo(p_org, p_from[i], p_to[i], p_mode);
  end loop;
  return v_n;
end $$;

revoke all on function talon_sell_multi(uuid, text[], text[], uuid, date, uuid) from public, anon, authenticated;
revoke all on function talon_redeem_multi(uuid, text[], text[], uuid, uuid, date) from public, anon, authenticated;
revoke all on function talon_undo_multi(uuid, text[], text[], text) from public, anon, authenticated;
grant execute on function talon_sell_multi(uuid, text[], text[], uuid, date, uuid) to service_role;
grant execute on function talon_redeem_multi(uuid, text[], text[], uuid, uuid, date) to service_role;
grant execute on function talon_undo_multi(uuid, text[], text[], text) to service_role;
