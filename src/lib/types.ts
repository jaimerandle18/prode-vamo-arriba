export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string | null;
  group_id: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  group_id: string | null;
  phase: string;
  match_date: string;
  venue: string | null;
  city: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  round: string | null;
  elapsed: number | null;
  home_team?: Team;
  away_team?: Team;
}

export interface Prediction {
  id: number;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  points: number | null;
  created_at: string;
  updated_at: string;
}

export interface League {
  id: string;
  name: string;
  emoji: string | null;
}

export interface LeagueMember {
  id: number;
  user_id: string;
  league_id: string;
  joined_at: string;
}
