"use client";

import { useMemo } from "react";
import { Match, Team } from "@/lib/types";

interface KnockoutBracketProps {
  matches: Match[];
  teams: Team[];
}

const ROUNDS = [
  { key: "round_of_32", label: "16avos", count: 16 },
  { key: "round_of_16", label: "8vos", count: 8 },
  { key: "quarter", label: "Cuartos", count: 4 },
  { key: "semi", label: "Semis", count: 2 },
  { key: "final", label: "Final", count: 1 },
];

const CARD_HEIGHT = 76;
// Alto del slot de un partido de 16avos; cada ronda siguiente lo duplica
// para que los cruces queden centrados respecto de sus dos partidos previos.
const SLOT_HEIGHT = 88;

function byDate(a: Match, b: Match) {
  return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
}

function sharesTeam(a: Match, b: Match): boolean {
  return [a.home_team_id, a.away_team_id].some(
    (t) => t === b.home_team_id || t === b.away_team_id
  );
}

// Ordena cada ronda según qué partido de la ronda siguiente alimenta, así las
// líneas del bracket conectan de verdad. Los cruces cuyo destino todavía no se
// conoce quedan al final, ordenados por fecha.
function buildRounds(knockoutMatches: Match[]): (Match | null)[][] {
  const byPhase = ROUNDS.map((r) =>
    knockoutMatches.filter((m) => m.phase === r.key).sort(byDate)
  );

  for (let r = ROUNDS.length - 2; r >= 0; r--) {
    const next = byPhase[r + 1];
    if (next.length === 0) continue;

    const ordered: Match[] = [];
    const used = new Set<number>();

    for (const nm of next) {
      const feeders = byPhase[r]
        .filter((f) => !used.has(f.id) && sharesTeam(f, nm))
        .sort((a, b) => {
          // El que aporta al local de la ronda siguiente va arriba
          const aFeedsHome =
            a.home_team_id === nm.home_team_id ||
            a.away_team_id === nm.home_team_id;
          const bFeedsHome =
            b.home_team_id === nm.home_team_id ||
            b.away_team_id === nm.home_team_id;
          return Number(bFeedsHome) - Number(aFeedsHome);
        })
        .slice(0, 2);

      for (const f of feeders) {
        ordered.push(f);
        used.add(f.id);
      }
    }

    byPhase[r] = [...ordered, ...byPhase[r].filter((f) => !used.has(f.id))];
  }

  return byPhase.map((roundMatches, r) => {
    const slots: (Match | null)[] = [...roundMatches];
    while (slots.length < ROUNDS[r].count) slots.push(null);
    return slots;
  });
}

// No guardamos penales: si un partido terminado quedó empatado, el que avanzó
// es el que aparece en la ronda siguiente.
function winnerOf(match: Match, nextRound: Match[]): number | null {
  if (
    match.status !== "finished" ||
    match.home_score == null ||
    match.away_score == null
  )
    return null;
  if (match.home_score > match.away_score) return match.home_team_id;
  if (match.away_score > match.home_score) return match.away_team_id;

  const next = nextRound.find((n) => sharesTeam(match, n));
  if (!next) return null;
  return next.home_team_id === match.home_team_id ||
    next.away_team_id === match.home_team_id
    ? match.home_team_id
    : match.away_team_id;
}

function TeamRow({
  team,
  score,
  isWinner,
  isLoser,
}: {
  team: Team | undefined;
  score: number | null;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`text-sm shrink-0 ${isLoser ? "opacity-50" : ""}`}>
        {team?.flag_emoji ?? "⚽"}
      </span>
      <span
        className={`text-xs truncate flex-1 ${
          isLoser ? "text-muted" : "font-medium"
        }`}
      >
        {team?.name ?? "?"}
      </span>
      <span
        className={`text-xs font-bold tabular-nums shrink-0 ${
          isWinner ? "text-accent" : isLoser ? "text-muted" : ""
        }`}
      >
        {score ?? ""}
      </span>
    </div>
  );
}

function BracketCard({
  match,
  teamsMap,
  winnerId,
}: {
  match: Match | null;
  teamsMap: Map<number, Team>;
  winnerId: number | null;
}) {
  if (!match) {
    return (
      <div
        className="w-full bg-card/40 border border-dashed border-card-border rounded-lg flex items-center justify-center"
        style={{ height: CARD_HEIGHT }}
      >
        <span className="text-[10px] text-muted/60">Por definirse</span>
      </div>
    );
  }

  const home = teamsMap.get(match.home_team_id);
  const away = teamsMap.get(match.away_team_id);
  const isLive = match.status === "live" || match.status === "halftime";
  const finished = match.status === "finished";
  const isPenaltyTie =
    finished &&
    match.home_score != null &&
    match.home_score === match.away_score;
  const date = new Date(match.match_date);

  return (
    <div
      className={`w-full bg-card border rounded-lg px-2 py-1.5 flex flex-col justify-between ${
        isLive ? "border-red-500/50" : "border-card-border"
      }`}
      style={{ height: CARD_HEIGHT }}
    >
      <TeamRow
        team={home}
        score={match.home_score}
        isWinner={winnerId === match.home_team_id}
        isLoser={finished && winnerId != null && winnerId !== match.home_team_id}
      />
      <TeamRow
        team={away}
        score={match.away_score}
        isWinner={winnerId === match.away_team_id}
        isLoser={finished && winnerId != null && winnerId !== match.away_team_id}
      />
      <div className="text-[9px] leading-none">
        {isLive ? (
          <span className="flex items-center gap-1 font-bold text-red-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            {match.status === "halftime"
              ? "ENTRETIEMPO"
              : `EN VIVO ${match.elapsed ?? ""}'`}
          </span>
        ) : isPenaltyTie ? (
          <span className="text-gold font-medium">Definido por penales</span>
        ) : (
          <span className="text-muted">
            {date.toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
            })}{" "}
            ·{" "}
            {date.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KnockoutBracket({
  matches,
  teams,
}: KnockoutBracketProps) {
  const teamsMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );

  const { rounds, thirdPlace, champion } = useMemo(() => {
    const knockout = matches.filter(
      (m) => m.phase !== "group" && m.phase !== "third_place"
    );
    const rounds = buildRounds(knockout);
    const thirdPlace =
      matches.filter((m) => m.phase === "third_place").sort(byDate)[0] ?? null;

    const finalMatch = rounds[ROUNDS.length - 1][0];
    const championId = finalMatch ? winnerOf(finalMatch, []) : null;
    const champion = championId ? teamsMap.get(championId) : null;

    return { rounds, thirdPlace, champion };
  }, [matches, teamsMap]);

  return (
    <div>
      {champion && (
        <div className="mb-4 px-4 py-3 bg-gold/10 border border-gold/40 rounded-xl text-center">
          <span className="text-sm sm:text-base font-bold text-gold">
            🏆 Campeón del mundo: {champion.flag_emoji} {champion.name}
          </span>
        </div>
      )}

      <p className="text-[10px] sm:text-xs text-muted mb-3">
        Deslizá hacia la derecha para ver cómo avanza la llave →
      </p>

      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-3">
        <div className="flex gap-6 min-w-max">
          {ROUNDS.map((round, r) => (
            <div key={round.key} className="flex flex-col">
              <div className="h-8 text-center text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest">
                {round.label}
              </div>

              {rounds[r].map((match, i) => (
                <div
                  key={match?.id ?? `tbd-${round.key}-${i}`}
                  className="relative flex items-center w-40 sm:w-44"
                  style={{ height: SLOT_HEIGHT * 2 ** r }}
                >
                  {/* Conector entrante: une los dos cruces de la ronda anterior */}
                  {r > 0 && (
                    <>
                      <div className="absolute -left-3 top-1/4 bottom-1/4 w-px bg-card-border" />
                      <div className="absolute -left-3 top-1/2 w-3 h-px bg-card-border" />
                    </>
                  )}
                  {/* Conector saliente hacia la ronda siguiente */}
                  {r < ROUNDS.length - 1 && (
                    <div className="absolute top-1/2 -right-3 w-3 h-px bg-card-border" />
                  )}

                  <BracketCard
                    match={match}
                    teamsMap={teamsMap}
                    winnerId={
                      match
                        ? winnerOf(
                            match,
                            r < ROUNDS.length - 1
                              ? (rounds[r + 1].filter(Boolean) as Match[])
                              : []
                          )
                        : null
                    }
                  />

                  {/* Tercer puesto, debajo de la final */}
                  {r === ROUNDS.length - 1 && (
                    <div
                      className="absolute w-full"
                      style={{ top: `calc(50% + ${CARD_HEIGHT / 2 + 20}px)` }}
                    >
                      <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest text-center mb-1.5">
                        🥉 3er puesto
                      </p>
                      <BracketCard
                        match={thirdPlace}
                        teamsMap={teamsMap}
                        winnerId={
                          thirdPlace ? winnerOf(thirdPlace, []) : null
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
