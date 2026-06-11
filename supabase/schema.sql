-- ============================================
-- PRODE VAMO ARRIBA - Mundial 2026
-- Schema SQL para Supabase
-- ============================================

-- Perfiles de usuarios (se crea automáticamente al registrarse)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  total_points integer default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Perfiles visibles para todos" on public.profiles
  for select using (true);

create policy "Usuarios pueden editar su perfil" on public.profiles
  for update using (auth.uid() = id);

create policy "Usuarios pueden insertar su perfil" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Jugador'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grupos del mundial
create table public.groups (
  id text primary key, -- 'A', 'B', ..., 'L'
  name text not null   -- 'Grupo A', 'Grupo B', etc.
);

alter table public.groups enable row level security;
create policy "Grupos visibles para todos" on public.groups for select using (true);

-- Equipos
create table public.teams (
  id serial primary key,
  name text not null,
  code text not null unique,    -- código ISO o FIFA (ARG, BRA, etc.)
  flag_emoji text,              -- emoji de bandera
  group_id text references public.groups(id)
);

alter table public.teams enable row level security;
create policy "Equipos visibles para todos" on public.teams for select using (true);

-- Partidos
create table public.matches (
  id serial primary key,
  home_team_id integer references public.teams(id),
  away_team_id integer references public.teams(id),
  group_id text references public.groups(id),
  phase text not null default 'group', -- 'group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'
  match_date timestamptz,
  venue text,
  city text,
  home_score integer,  -- resultado real (null hasta que se juegue)
  away_score integer,
  status text default 'scheduled', -- 'scheduled', 'live', 'finished'
  round text, -- "Group Stage - 1", "Round of 16", etc.
  elapsed integer, -- minuto del partido en vivo
  extra integer -- tiempo agregado (45+4)
);

alter table public.matches enable row level security;

-- Habilitar Realtime para matches
alter publication supabase_realtime add table public.matches;

create policy "Partidos visibles para todos" on public.matches for select using (true);
create policy "Solo admins actualizan partidos" on public.matches
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and display_name = 'admin')
  );

-- Predicciones de usuarios
create table public.predictions (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id integer references public.matches(id) on delete cascade not null,
  home_score integer not null,
  away_score integer not null,
  points integer, -- null hasta que se calcule
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;

create policy "Usuarios ven todas las predicciones" on public.predictions
  for select using (true);

create policy "Usuarios crean sus predicciones" on public.predictions
  for insert with check (auth.uid() = user_id);

create policy "Usuarios actualizan sus predicciones" on public.predictions
  for update using (auth.uid() = user_id);

create policy "Usuarios borran sus predicciones" on public.predictions
  for delete using (auth.uid() = user_id);

-- Habilitar Realtime para predictions
alter publication supabase_realtime add table public.predictions;

-- Función para calcular puntos
create or replace function public.calculate_points(
  pred_home integer, pred_away integer,
  real_home integer, real_away integer
) returns integer as $$
begin
  -- Resultado exacto = 3 puntos
  if pred_home = real_home and pred_away = real_away then
    return 3;
  end if;

  -- Acertó ganador o empate = 1 punto
  if (pred_home > pred_away and real_home > real_away) or
     (pred_home < pred_away and real_home < real_away) or
     (pred_home = pred_away and real_home = real_away) then
    return 1;
  end if;

  return 0;
end;
$$ language plpgsql immutable;

-- Función para actualizar puntos cuando se carga un resultado
create or replace function public.update_predictions_points()
returns trigger as $$
begin
  if new.home_score is not null and new.away_score is not null then
    -- Actualizar puntos de todas las predicciones de este partido
    update public.predictions
    set points = public.calculate_points(home_score, away_score, new.home_score, new.away_score)
    where match_id = new.id;

    -- Recalcular total de puntos de cada usuario
    update public.profiles
    set total_points = coalesce((
      select sum(coalesce(points, 0))
      from public.predictions
      where user_id = profiles.id
    ), 0)
    where id in (
      select user_id from public.predictions where match_id = new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_result_updated
  after update of home_score, away_score on public.matches
  for each row execute function public.update_predictions_points();

-- ============================================
-- DATOS: Grupos y equipos del Mundial 2026
-- ============================================

insert into public.groups (id, name) values
  ('A', 'Grupo A'), ('B', 'Grupo B'), ('C', 'Grupo C'), ('D', 'Grupo D'),
  ('E', 'Grupo E'), ('F', 'Grupo F'), ('G', 'Grupo G'), ('H', 'Grupo H'),
  ('I', 'Grupo I'), ('J', 'Grupo J'), ('K', 'Grupo K'), ('L', 'Grupo L');

insert into public.teams (name, code, flag_emoji, group_id) values
  -- Grupo A
  ('Marruecos', 'MAR', '🇲🇦', 'A'),
  ('Perú', 'PER', '🇵🇪', 'A'),
  ('Canadá', 'CAN', '🇨🇦', 'A'),
  ('Australia', 'AUS', '🇦🇺', 'A'),
  -- Grupo B
  ('España', 'ESP', '🇪🇸', 'B'),
  ('Japón', 'JPN', '🇯🇵', 'B'),
  ('Ecuador', 'ECU', '🇪🇨', 'B'),
  ('Nueva Zelanda', 'NZL', '🇳🇿', 'B'),
  -- Grupo C
  ('México', 'MEX', '🇲🇽', 'C'),
  ('Indonesia', 'IDN', '🇮🇩', 'C'),
  ('Colombia', 'COL', '🇨🇴', 'C'),
  ('Camerún', 'CMR', '🇨🇲', 'C'),
  -- Grupo D
  ('Italia', 'ITA', '🇮🇹', 'D'),
  ('Costa de Marfil', 'CIV', '🇨🇮', 'D'),
  ('Panamá', 'PAN', '🇵🇦', 'D'),
  ('Trinidad y Tobago', 'TTO', '🇹🇹', 'D'),
  -- Grupo E
  ('Argentina', 'ARG', '🇦🇷', 'E'),
  ('Nigeria', 'NGA', '🇳🇬', 'E'),
  ('Chile', 'CHI', '🇨🇱', 'E'),
  ('Uzbekistán', 'UZB', '🇺🇿', 'E'),
  -- Grupo F
  ('Francia', 'FRA', '🇫🇷', 'F'),
  ('Corea del Sur', 'KOR', '🇰🇷', 'F'),
  ('Arabia Saudita', 'KSA', '🇸🇦', 'F'),
  ('Honduras', 'HON', '🇭🇳', 'F'),
  -- Grupo G
  ('Brasil', 'BRA', '🇧🇷', 'G'),
  ('Senegal', 'SEN', '🇸🇳', 'G'),
  ('Serbia', 'SRB', '🇷🇸', 'G'),
  ('Bolivia', 'BOL', '🇧🇴', 'G'),
  -- Grupo H
  ('Portugal', 'POR', '🇵🇹', 'H'),
  ('Irán', 'IRN', '🇮🇷', 'H'),
  ('Paraguay', 'PAR', '🇵🇾', 'H'),
  ('Escocia', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'H'),
  -- Grupo I
  ('Países Bajos', 'NED', '🇳🇱', 'I'),
  ('Turquía', 'TUR', '🇹🇷', 'I'),
  ('Ghana', 'GHA', '🇬🇭', 'I'),
  ('Guatemala', 'GUA', '🇬🇹', 'I'),
  -- Grupo J
  ('Alemania', 'GER', '🇩🇪', 'J'),
  ('Uruguay', 'URU', '🇺🇾', 'J'),
  ('Corea del Norte', 'PRK', '🇰🇵', 'J'),
  ('Sudáfrica', 'RSA', '🇿🇦', 'J'),
  -- Grupo K
  ('Estados Unidos', 'USA', '🇺🇸', 'K'),
  ('Gales', 'WAL', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'K'),
  ('Egipto', 'EGY', '🇪🇬', 'K'),
  ('República Checa', 'CZE', '🇨🇿', 'K'),
  -- Grupo L
  ('Inglaterra', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
  ('Dinamarca', 'DEN', '🇩🇰', 'L'),
  ('Croacia', 'CRO', '🇭🇷', 'L'),
  ('Albania', 'ALB', '🇦🇱', 'L');

-- ============================================
-- DATOS: Partidos fase de grupos (fixture oficial)
-- Las fechas son aproximadas basadas en el calendario oficial
-- ============================================

-- Jornada 1 - 11-13 Junio 2026
insert into public.matches (home_team_id, away_team_id, group_id, phase, match_date, venue, city) values
  -- Grupo A
  ((select id from teams where code='MAR'), (select id from teams where code='PER'), 'A', 'group', '2026-06-11 18:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='CAN'), (select id from teams where code='AUS'), 'A', 'group', '2026-06-11 21:00:00+00', 'BC Place', 'Vancouver'),
  -- Grupo B
  ((select id from teams where code='ESP'), (select id from teams where code='NZL'), 'B', 'group', '2026-06-11 15:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='JPN'), (select id from teams where code='ECU'), 'B', 'group', '2026-06-12 00:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  -- Grupo C
  ((select id from teams where code='MEX'), (select id from teams where code='CMR'), 'C', 'group', '2026-06-12 18:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='COL'), (select id from teams where code='IDN'), 'C', 'group', '2026-06-12 21:00:00+00', 'MetLife Stadium', 'Nueva York'),
  -- Grupo D
  ((select id from teams where code='ITA'), (select id from teams where code='TTO'), 'D', 'group', '2026-06-12 15:00:00+00', 'AT&T Stadium', 'Dallas'),
  ((select id from teams where code='CIV'), (select id from teams where code='PAN'), 'D', 'group', '2026-06-13 00:00:00+00', 'NRG Stadium', 'Houston'),
  -- Grupo E
  ((select id from teams where code='ARG'), (select id from teams where code='UZB'), 'E', 'group', '2026-06-13 18:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='NGA'), (select id from teams where code='CHI'), 'E', 'group', '2026-06-13 21:00:00+00', 'MetLife Stadium', 'Nueva York'),
  -- Grupo F
  ((select id from teams where code='FRA'), (select id from teams where code='HON'), 'F', 'group', '2026-06-13 15:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='KOR'), (select id from teams where code='KSA'), 'F', 'group', '2026-06-14 00:00:00+00', 'Lumen Field', 'Seattle');

-- Jornada 1 - 14-15 Junio 2026
insert into public.matches (home_team_id, away_team_id, group_id, phase, match_date, venue, city) values
  -- Grupo G
  ((select id from teams where code='BRA'), (select id from teams where code='BOL'), 'G', 'group', '2026-06-14 18:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='SEN'), (select id from teams where code='SRB'), 'G', 'group', '2026-06-14 21:00:00+00', 'Lincoln Financial Field', 'Filadelfia'),
  -- Grupo H
  ((select id from teams where code='POR'), (select id from teams where code='SCO'), 'H', 'group', '2026-06-14 15:00:00+00', 'MetLife Stadium', 'Nueva York'),
  ((select id from teams where code='IRN'), (select id from teams where code='PAR'), 'H', 'group', '2026-06-15 00:00:00+00', 'Estadio BBVA', 'Monterrey'),
  -- Grupo I
  ((select id from teams where code='NED'), (select id from teams where code='GUA'), 'I', 'group', '2026-06-15 18:00:00+00', 'AT&T Stadium', 'Dallas'),
  ((select id from teams where code='TUR'), (select id from teams where code='GHA'), 'I', 'group', '2026-06-15 21:00:00+00', 'NRG Stadium', 'Houston'),
  -- Grupo J
  ((select id from teams where code='GER'), (select id from teams where code='RSA'), 'J', 'group', '2026-06-15 15:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='URU'), (select id from teams where code='PRK'), 'J', 'group', '2026-06-16 00:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  -- Grupo K
  ((select id from teams where code='USA'), (select id from teams where code='CZE'), 'K', 'group', '2026-06-16 18:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='WAL'), (select id from teams where code='EGY'), 'K', 'group', '2026-06-16 21:00:00+00', 'Lumen Field', 'Seattle'),
  -- Grupo L
  ((select id from teams where code='ENG'), (select id from teams where code='ALB'), 'L', 'group', '2026-06-16 15:00:00+00', 'Lincoln Financial Field', 'Filadelfia'),
  ((select id from teams where code='DEN'), (select id from teams where code='CRO'), 'L', 'group', '2026-06-16 21:00:00+00', 'BC Place', 'Vancouver');

-- Jornada 2 - 17-20 Junio 2026
insert into public.matches (home_team_id, away_team_id, group_id, phase, match_date, venue, city) values
  ((select id from teams where code='PER'), (select id from teams where code='CAN'), 'A', 'group', '2026-06-17 18:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='MAR'), (select id from teams where code='AUS'), 'A', 'group', '2026-06-17 21:00:00+00', 'BC Place', 'Vancouver'),
  ((select id from teams where code='NZL'), (select id from teams where code='JPN'), 'B', 'group', '2026-06-17 15:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='ESP'), (select id from teams where code='ECU'), 'B', 'group', '2026-06-18 00:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='CMR'), (select id from teams where code='COL'), 'C', 'group', '2026-06-18 18:00:00+00', 'MetLife Stadium', 'Nueva York'),
  ((select id from teams where code='MEX'), (select id from teams where code='IDN'), 'C', 'group', '2026-06-18 21:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='TTO'), (select id from teams where code='CIV'), 'D', 'group', '2026-06-18 15:00:00+00', 'NRG Stadium', 'Houston'),
  ((select id from teams where code='ITA'), (select id from teams where code='PAN'), 'D', 'group', '2026-06-19 00:00:00+00', 'AT&T Stadium', 'Dallas'),
  ((select id from teams where code='UZB'), (select id from teams where code='NGA'), 'E', 'group', '2026-06-19 18:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='ARG'), (select id from teams where code='CHI'), 'E', 'group', '2026-06-19 21:00:00+00', 'MetLife Stadium', 'Nueva York'),
  ((select id from teams where code='HON'), (select id from teams where code='KOR'), 'F', 'group', '2026-06-19 15:00:00+00', 'Lumen Field', 'Seattle'),
  ((select id from teams where code='FRA'), (select id from teams where code='KSA'), 'F', 'group', '2026-06-20 00:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='BOL'), (select id from teams where code='SEN'), 'G', 'group', '2026-06-20 18:00:00+00', 'Lincoln Financial Field', 'Filadelfia'),
  ((select id from teams where code='BRA'), (select id from teams where code='SRB'), 'G', 'group', '2026-06-20 21:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='SCO'), (select id from teams where code='IRN'), 'H', 'group', '2026-06-20 15:00:00+00', 'Estadio BBVA', 'Monterrey'),
  ((select id from teams where code='POR'), (select id from teams where code='PAR'), 'H', 'group', '2026-06-21 00:00:00+00', 'MetLife Stadium', 'Nueva York'),
  ((select id from teams where code='GUA'), (select id from teams where code='TUR'), 'I', 'group', '2026-06-21 18:00:00+00', 'NRG Stadium', 'Houston'),
  ((select id from teams where code='NED'), (select id from teams where code='GHA'), 'I', 'group', '2026-06-21 21:00:00+00', 'AT&T Stadium', 'Dallas'),
  ((select id from teams where code='RSA'), (select id from teams where code='URU'), 'J', 'group', '2026-06-21 15:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='GER'), (select id from teams where code='PRK'), 'J', 'group', '2026-06-22 00:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='CZE'), (select id from teams where code='WAL'), 'K', 'group', '2026-06-22 18:00:00+00', 'Lumen Field', 'Seattle'),
  ((select id from teams where code='USA'), (select id from teams where code='EGY'), 'K', 'group', '2026-06-22 21:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='ALB'), (select id from teams where code='DEN'), 'L', 'group', '2026-06-22 15:00:00+00', 'BC Place', 'Vancouver'),
  ((select id from teams where code='ENG'), (select id from teams where code='CRO'), 'L', 'group', '2026-06-22 21:00:00+00', 'Lincoln Financial Field', 'Filadelfia');

-- Jornada 3 - 23-26 Junio 2026
insert into public.matches (home_team_id, away_team_id, group_id, phase, match_date, venue, city) values
  ((select id from teams where code='AUS'), (select id from teams where code='PER'), 'A', 'group', '2026-06-23 21:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='CAN'), (select id from teams where code='MAR'), 'A', 'group', '2026-06-23 21:00:00+00', 'BC Place', 'Vancouver'),
  ((select id from teams where code='ECU'), (select id from teams where code='NZL'), 'B', 'group', '2026-06-23 18:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='JPN'), (select id from teams where code='ESP'), 'B', 'group', '2026-06-23 18:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='IDN'), (select id from teams where code='CMR'), 'C', 'group', '2026-06-24 21:00:00+00', 'MetLife Stadium', 'Nueva York'),
  ((select id from teams where code='COL'), (select id from teams where code='MEX'), 'C', 'group', '2026-06-24 21:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='PAN'), (select id from teams where code='TTO'), 'D', 'group', '2026-06-24 18:00:00+00', 'NRG Stadium', 'Houston'),
  ((select id from teams where code='CIV'), (select id from teams where code='ITA'), 'D', 'group', '2026-06-24 18:00:00+00', 'AT&T Stadium', 'Dallas'),
  ((select id from teams where code='CHI'), (select id from teams where code='UZB'), 'E', 'group', '2026-06-25 21:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='NGA'), (select id from teams where code='ARG'), 'E', 'group', '2026-06-25 21:00:00+00', 'MetLife Stadium', 'Nueva York'),
  ((select id from teams where code='KSA'), (select id from teams where code='HON'), 'F', 'group', '2026-06-25 18:00:00+00', 'Lumen Field', 'Seattle'),
  ((select id from teams where code='KOR'), (select id from teams where code='FRA'), 'F', 'group', '2026-06-25 18:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='SRB'), (select id from teams where code='BOL'), 'G', 'group', '2026-06-26 21:00:00+00', 'Lincoln Financial Field', 'Filadelfia'),
  ((select id from teams where code='SEN'), (select id from teams where code='BRA'), 'G', 'group', '2026-06-26 21:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='PAR'), (select id from teams where code='SCO'), 'H', 'group', '2026-06-26 18:00:00+00', 'Estadio BBVA', 'Monterrey'),
  ((select id from teams where code='IRN'), (select id from teams where code='POR'), 'H', 'group', '2026-06-26 18:00:00+00', 'MetLife Stadium', 'Nueva York'),
  ((select id from teams where code='GHA'), (select id from teams where code='GUA'), 'I', 'group', '2026-06-27 21:00:00+00', 'NRG Stadium', 'Houston'),
  ((select id from teams where code='TUR'), (select id from teams where code='NED'), 'I', 'group', '2026-06-27 21:00:00+00', 'AT&T Stadium', 'Dallas'),
  ((select id from teams where code='PRK'), (select id from teams where code='RSA'), 'J', 'group', '2026-06-27 18:00:00+00', 'Estadio Azteca', 'Ciudad de México'),
  ((select id from teams where code='URU'), (select id from teams where code='GER'), 'J', 'group', '2026-06-27 18:00:00+00', 'Hard Rock Stadium', 'Miami'),
  ((select id from teams where code='EGY'), (select id from teams where code='CZE'), 'K', 'group', '2026-06-28 21:00:00+00', 'Lumen Field', 'Seattle'),
  ((select id from teams where code='WAL'), (select id from teams where code='USA'), 'K', 'group', '2026-06-28 21:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
  ((select id from teams where code='CRO'), (select id from teams where code='ALB'), 'L', 'group', '2026-06-28 18:00:00+00', 'BC Place', 'Vancouver'),
  ((select id from teams where code='DEN'), (select id from teams where code='ENG'), 'L', 'group', '2026-06-28 18:00:00+00', 'Lincoln Financial Field', 'Filadelfia');
