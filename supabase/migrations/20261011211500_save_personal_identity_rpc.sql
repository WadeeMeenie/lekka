-- Save private personal identity and the display name in one owner-scoped
-- transaction. Clients intentionally have no direct INSERT/UPDATE privilege
-- on public.profiles.
create or replace function public.save_personal_identity(
  p_first_name text,
  p_surname text,
  p_date_of_birth date,
  p_gender text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_first_name text := pg_catalog.btrim(coalesce(p_first_name, ''));
  v_surname text := pg_catalog.btrim(coalesce(p_surname, ''));
  v_gender text := nullif(pg_catalog.btrim(coalesce(p_gender, '')), '');
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if pg_catalog.char_length(v_first_name) < 1 or pg_catalog.char_length(v_first_name) > 80
     or pg_catalog.char_length(v_surname) < 1 or pg_catalog.char_length(v_surname) > 80 then
    raise exception 'First name and surname must be between 1 and 80 characters' using errcode = '22023';
  end if;
  if p_date_of_birth is null
     or p_date_of_birth < date '1900-01-01'
     or p_date_of_birth > (current_date - interval '13 years')::date then
    raise exception 'Lekka accounts are available from age 13' using errcode = '22023';
  end if;
  if v_gender is not null and v_gender not in ('male', 'female', 'prefer_not_to_say') then
    raise exception 'Invalid gender option' using errcode = '22023';
  end if;

  update public.profiles
  set display_name = v_first_name || ' ' || v_surname,
      account_intent = 'personal',
      updated_at = pg_catalog.now()
  where id = v_user_id;

  if not found then
    raise exception 'profile not found';
  end if;

  insert into public.personal_identities(user_id, first_name, surname, date_of_birth, gender, updated_at)
  values (v_user_id, v_first_name, v_surname, p_date_of_birth, v_gender, pg_catalog.now())
  on conflict (user_id) do update
    set first_name = excluded.first_name,
        surname = excluded.surname,
        date_of_birth = excluded.date_of_birth,
        gender = excluded.gender,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_personal_identity(text, text, date, text) from public, anon, authenticated;
grant execute on function public.save_personal_identity(text, text, date, text) to authenticated;
