-- ============================================
-- FIXES DE SEGURIDAD - 2026-06-12
-- Correr en el SQL Editor de Supabase (producción)
-- ============================================

-- ============================================
-- 1) Lock server-side: no se pueden crear/editar/borrar
--    pronósticos de partidos que ya arrancaron
-- ============================================

create or replace function public.match_is_open(p_match_id integer)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.matches
    where id = p_match_id
      and status = 'scheduled'
      and match_date > now()
  );
$$;

drop policy "Usuarios crean sus predicciones" on public.predictions;
create policy "Usuarios crean sus predicciones" on public.predictions
  for insert with check (
    auth.uid() = user_id and public.match_is_open(match_id)
  );

drop policy "Usuarios actualizan sus predicciones" on public.predictions;
create policy "Usuarios actualizan sus predicciones" on public.predictions
  for update
  using (auth.uid() = user_id and public.match_is_open(match_id))
  with check (auth.uid() = user_id and public.match_is_open(match_id));

drop policy "Usuarios borran sus predicciones" on public.predictions;
create policy "Usuarios borran sus predicciones" on public.predictions
  for delete using (
    auth.uid() = user_id and public.match_is_open(match_id)
  );

-- ============================================
-- 2) Grants por columna: los usuarios no pueden tocar
--    predictions.points ni profiles.total_points/is_admin
--    (el trigger de puntos y el sync usan service role, no los afecta)
-- ============================================

revoke insert, update on table public.predictions from anon, authenticated;
grant insert (user_id, match_id, home_score, away_score, updated_at)
  on table public.predictions to authenticated;
grant update (home_score, away_score, updated_at)
  on table public.predictions to authenticated;

revoke insert, update on table public.profiles from anon, authenticated;
grant insert (id, display_name, avatar_url)
  on table public.profiles to authenticated;
grant update (display_name, avatar_url)
  on table public.profiles to authenticated;

-- ============================================
-- 3) Admin por flag, no por display_name
--    (cualquiera podía renombrarse "admin" y editar partidos)
-- ============================================

alter table public.profiles add column if not exists is_admin boolean not null default false;

drop policy "Solo admins actualizan partidos" on public.matches;
create policy "Solo admins actualizan partidos" on public.matches
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- Para asignarte admin (buscá tu user id en Authentication > Users):
-- update public.profiles set is_admin = true where id = '<tu-user-id>';
