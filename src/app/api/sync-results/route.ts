import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!;
const API_FOOTBALL_HOST = "v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed: number | null };
    venue?: { name: string; city: string };
  };
  league: {
    round: string; // "Group A - 1", "Round of 32", "Round of 16", "Quarter-finals", etc.
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
}

function mapStatus(apiStatus: string): string {
  switch (apiStatus) {
    case "NS":
    case "TBD":
      return "scheduled";
    case "1H":
    case "2H":
    case "HT":
    case "ET":
    case "BT":
    case "P":
    case "LIVE":
      return "live";
    case "FT":
    case "AET":
    case "PEN":
      return "finished";
    default:
      return "scheduled";
  }
}

function mapRoundToPhase(round: string): string {
  const r = round.toLowerCase();
  if (r.includes("group")) return "group";
  if (r.includes("round of 32")) return "round_of_32";
  if (r.includes("round of 16")) return "round_of_16";
  if (r.includes("quarter")) return "quarter";
  if (r.includes("semi")) return "semi";
  if (r.includes("3rd") || r.includes("third")) return "third_place";
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter"))
    return "final";
  return "group";
}

function mapRoundToGroupId(round: string): string | null {
  const match = round.match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

async function hasActiveMatches(): Promise<boolean> {
  const now = new Date();
  const soon = new Date(now.getTime() + 15 * 60 * 1000);
  const recentEnd = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_date, status")
    .or(
      `status.eq.live,and(match_date.gte.${recentEnd.toISOString()},match_date.lte.${soon.toISOString()})`
    )
    .limit(1);

  return (matches?.length ?? 0) > 0;
}

// Also check if there are upcoming knockout matches we haven't imported yet
async function hasUpcomingUnimportedFixtures(): Promise<boolean> {
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  // Check if we should do a periodic sync for new knockout fixtures
  // Only check once every 6 hours by looking at whether we have matches for upcoming days
  const { data } = await supabase
    .from("matches")
    .select("id")
    .gte("match_date", now.toISOString())
    .lte("match_date", twoDaysFromNow.toISOString())
    .limit(1);

  // If no upcoming matches in next 2 days, maybe we need to fetch knockout fixtures
  return (data?.length ?? 0) === 0;
}

async function fetchFixtures(date?: string): Promise<ApiFixture[]> {
  const dateParam = date ?? new Date().toISOString().split("T")[0];
  const res = await fetch(
    `https://${API_FOOTBALL_HOST}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}&date=${dateParam}`,
    {
      headers: { "x-apisports-key": API_FOOTBALL_KEY },
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  const data = await res.json();
  return data.response ?? [];
}

// Fetch all upcoming fixtures (for discovering knockout matches)
async function fetchAllUpcomingFixtures(): Promise<ApiFixture[]> {
  const res = await fetch(
    `https://${API_FOOTBALL_HOST}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}&status=NS`,
    {
      headers: { "x-apisports-key": API_FOOTBALL_KEY },
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  const data = await res.json();
  return data.response ?? [];
}

async function findTeamByName(name: string) {
  const nameLower = name.toLowerCase();
  const { data: teams } = await supabase.from("teams").select("id, name, code");
  if (!teams) return null;

  for (const team of teams) {
    const dbName = team.name.toLowerCase();
    if (
      nameLower.includes(dbName) ||
      dbName.includes(nameLower) ||
      nameLower.includes(team.code.toLowerCase())
    ) {
      return team;
    }
  }
  return null;
}

async function findMatchingMatch(fixture: ApiFixture) {
  const fixtureDate = new Date(fixture.fixture.date);
  const dayStart = new Date(fixtureDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(fixtureDate);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `id, match_date, home_score, away_score, status,
      home_team:teams!matches_home_team_id_fkey(id, name, code),
      away_team:teams!matches_away_team_id_fkey(id, name, code)`
    )
    .gte("match_date", dayStart.toISOString())
    .lte("match_date", dayEnd.toISOString());

  if (!matches || matches.length === 0) return null;

  const homeNameApi = fixture.teams.home.name.toLowerCase();
  const awayNameApi = fixture.teams.away.name.toLowerCase();

  for (const match of matches) {
    const homeTeam = match.home_team as unknown as {
      id: number;
      name: string;
      code: string;
    };
    const awayTeam = match.away_team as unknown as {
      id: number;
      name: string;
      code: string;
    };
    if (!homeTeam || !awayTeam) continue;

    const homeNameDb = homeTeam.name.toLowerCase();
    const awayNameDb = awayTeam.name.toLowerCase();

    if (
      (homeNameApi.includes(homeNameDb) ||
        homeNameDb.includes(homeNameApi) ||
        homeNameApi.includes(homeTeam.code.toLowerCase())) &&
      (awayNameApi.includes(awayNameDb) ||
        awayNameDb.includes(awayNameApi) ||
        awayNameApi.includes(awayTeam.code.toLowerCase()))
    ) {
      return match;
    }
  }

  return null;
}

// Crear un partido nuevo de eliminatorias que no existe en nuestra DB
async function createKnockoutMatch(fixture: ApiFixture) {
  const homeTeam = await findTeamByName(fixture.teams.home.name);
  const awayTeam = await findTeamByName(fixture.teams.away.name);

  if (!homeTeam || !awayTeam) return null;

  const phase = mapRoundToPhase(fixture.league.round);
  if (phase === "group") return null; // Grupos ya están cargados

  const status = mapStatus(fixture.fixture.status.short);

  const { data, error } = await supabase
    .from("matches")
    .insert({
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      group_id: null,
      phase,
      match_date: fixture.fixture.date,
      venue: fixture.fixture.venue?.name ?? null,
      city: fixture.fixture.venue?.city ?? null,
      home_score:
        status === "live" || status === "finished"
          ? fixture.goals.home
          : null,
      away_score:
        status === "live" || status === "finished"
          ? fixture.goals.away
          : null,
      status,
      elapsed: fixture.fixture.status.elapsed,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating knockout match:", error);
    return null;
  }
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const forceSync = searchParams.get("force") === "true";

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const active = await hasActiveMatches();
    const needsKnockoutSync = await hasUpcomingUnimportedFixtures();

    if (!active && !needsKnockoutSync && !forceSync) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "No hay partidos en curso ni próximos",
        timestamp: new Date().toISOString(),
      });
    }

    let updated = 0;
    let created = 0;

    // Sync today's fixtures (live scores)
    if (active || forceSync) {
      const fixtures = await fetchFixtures();

      for (const fixture of fixtures) {
        const status = mapStatus(fixture.fixture.status.short);
        const match = await findMatchingMatch(fixture);

        if (match) {
          // Update existing match
          if (
            (status === "live" || status === "finished") &&
            fixture.goals.home !== null &&
            fixture.goals.away !== null &&
            (match.home_score !== fixture.goals.home ||
              match.away_score !== fixture.goals.away ||
              match.status !== status)
          ) {
            await supabase
              .from("matches")
              .update({
                home_score: fixture.goals.home,
                away_score: fixture.goals.away,
                status,
                elapsed: fixture.fixture.status.elapsed,
              })
              .eq("id", match.id);
            updated++;
          }
        } else {
          // New match (probably knockout) — create it
          const result = await createKnockoutMatch(fixture);
          if (result) created++;
        }
      }
    }

    // Sync upcoming knockout fixtures (uses 1 extra API call)
    if (needsKnockoutSync || forceSync) {
      const upcomingFixtures = await fetchAllUpcomingFixtures();

      for (const fixture of upcomingFixtures) {
        const phase = mapRoundToPhase(fixture.league.round);
        if (phase === "group") continue;

        const existingMatch = await findMatchingMatch(fixture);
        if (!existingMatch) {
          const result = await createKnockoutMatch(fixture);
          if (result) created++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      matches_updated: updated,
      matches_created: created,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync results" },
      { status: 500 }
    );
  }
}
