import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/mail";
import { getReminderHtml } from "@/lib/email-templates";

// El cron pega cada 1 min; con las pasadas extra en background el
// muestreo efectivo de la API baja a ~20s durante partidos en vivo.
export const maxDuration = 60;

const EXTRA_POLLS = 2;
const POLL_INTERVAL_MS = 20_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    status: {
      short: string;
      long: string;
      elapsed: number | null;
      extra: number | null;
    };
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
    case "HT":
      return "halftime";
    case "1H":
    case "2H":
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
      `status.eq.live,status.eq.halftime,and(match_date.gte.${recentEnd.toISOString()},match_date.lte.${soon.toISOString()})`
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

// teams.code guarda el ID de equipo de API-Football
async function findTeamByApiId(apiTeamId: number) {
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, code")
    .eq("code", String(apiTeamId))
    .maybeSingle();
  return team;
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
      `id, match_date, home_score, away_score, status, elapsed, extra,
      home_team:teams!matches_home_team_id_fkey(id, name, code),
      away_team:teams!matches_away_team_id_fkey(id, name, code)`
    )
    .gte("match_date", dayStart.toISOString())
    .lte("match_date", dayEnd.toISOString());

  if (!matches || matches.length === 0) return null;

  // teams.code guarda el ID de equipo de API-Football
  const homeIdApi = String(fixture.teams.home.id);
  const awayIdApi = String(fixture.teams.away.id);

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

    if (homeTeam.code === homeIdApi && awayTeam.code === awayIdApi) {
      return match;
    }
  }

  return null;
}

// Crear un partido nuevo de eliminatorias que no existe en nuestra DB
async function createKnockoutMatch(fixture: ApiFixture) {
  const homeTeam = await findTeamByApiId(fixture.teams.home.id);
  const awayTeam = await findTeamByApiId(fixture.teams.away.id);

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
        status === "live" || status === "halftime" || status === "finished"
          ? fixture.goals.home
          : null,
      away_score:
        status === "live" || status === "halftime" || status === "finished"
          ? fixture.goals.away
          : null,
      status,
      elapsed: fixture.fixture.status.elapsed,
      extra: fixture.fixture.status.extra ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating knockout match:", error);
    return null;
  }
  return data;
}

// Una pasada de sync: trae los fixtures del día y actualiza la DB
async function syncLiveFixtures(): Promise<{
  updated: number;
  created: number;
  anyLive: boolean;
}> {
  let updated = 0;
  let created = 0;
  let anyLive = false;

  const fixtures = await fetchFixtures();

  for (const fixture of fixtures) {
    const status = mapStatus(fixture.fixture.status.short);
    if (status === "live" || status === "halftime") anyLive = true;
    const match = await findMatchingMatch(fixture);

    if (match) {
      // Update existing match
      if (
        (status === "live" ||
          status === "halftime" ||
          status === "finished") &&
        fixture.goals.home !== null &&
        fixture.goals.away !== null &&
        (match.home_score !== fixture.goals.home ||
          match.away_score !== fixture.goals.away ||
          match.status !== status ||
          match.elapsed !== fixture.fixture.status.elapsed ||
          match.extra !== (fixture.fixture.status.extra ?? null))
      ) {
        await supabase
          .from("matches")
          .update({
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            status,
            elapsed: fixture.fixture.status.elapsed,
            extra: fixture.fixture.status.extra ?? null,
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

  return { updated, created, anyLive };
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
    let anyLive = false;

    // Sync today's fixtures (live scores)
    if (active || forceSync) {
      const result = await syncLiveFixtures();
      updated = result.updated;
      created = result.created;
      anyLive = result.anyLive;
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

    // Send reminders for matches starting in ~10 minutes
    let reminders_sent = 0;
    try {
      reminders_sent = await sendReminders();
    } catch (e) {
      console.error("Reminder error:", e);
    }

    // Mientras haya partido en vivo, 2 pasadas más en background cada
    // 20s: el cron pega cada 1 min → muestreo efectivo de ~20s
    if (anyLive) {
      after(async () => {
        for (let i = 0; i < EXTRA_POLLS; i++) {
          await sleep(POLL_INTERVAL_MS);
          try {
            await syncLiveFixtures();
          } catch (e) {
            console.error("Background poll error:", e);
          }
        }
      });
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      matches_updated: updated,
      matches_created: created,
      reminders_sent,
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

// ============================================
// REMINDERS: mail 10 min antes del partido (Gmail)
// ============================================

async function sendReminders(): Promise<number> {

  const now = new Date();
  const in9min = new Date(now.getTime() + 9 * 60 * 1000);
  const in11min = new Date(now.getTime() + 11 * 60 * 1000);

  // Find matches starting in ~10 minutes (window of 9-11 min to catch exactly once)
  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select(
      `id, match_date, status,
      home_team:teams!matches_home_team_id_fkey(name, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(name, flag_emoji)`
    )
    .eq("status", "scheduled")
    .gte("match_date", in9min.toISOString())
    .lte("match_date", in11min.toISOString());

  if (!upcomingMatches || upcomingMatches.length === 0) return 0;

  // Get all users
  const { data: users } = await supabase.auth.admin.listUsers();
  if (!users?.users) return 0;

  let sent = 0;

  for (const match of upcomingMatches) {
    const homeTeam = match.home_team as unknown as { name: string; flag_emoji: string };
    const awayTeam = match.away_team as unknown as { name: string; flag_emoji: string };
    if (!homeTeam || !awayTeam) continue;

    // Get users who already predicted this match
    const { data: predictions } = await supabase
      .from("predictions")
      .select("user_id")
      .eq("match_id", match.id);

    const predictedUserIds = new Set(predictions?.map((p) => p.user_id) ?? []);

    // Send to users who haven't predicted — en paralelo para no
    // exceder el timeout de la función cuando son muchos
    const recipients = users.users.filter(
      (user) => !predictedUserIds.has(user.id) && user.email
    );

    const results = await Promise.allSettled(
      recipients.map((user) =>
        sendEmail({
          to: user.email!,
          subject: `⚽ ${homeTeam.name} vs ${awayTeam.name} arranca en 10 minutos!`,
          html: getReminderHtml(homeTeam, awayTeam),
        })
      )
    );

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sent++;
      } else {
        console.error("Email error for", recipients[i].email, r.reason);
      }
    });
  }

  return sent;
}
