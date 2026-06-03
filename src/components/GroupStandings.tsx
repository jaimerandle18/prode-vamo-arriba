"use client";

import { useState, useEffect } from "react";
import { Match, Team } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface GroupStandingsProps {
  matches: Match[];
  teams: Team[];
}

interface TeamStanding {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

function calculateStandings(
  teams: Team[],
  matches: Match[],
  groupId: string
): TeamStanding[] {
  const groupTeams = teams.filter((t) => t.group_id === groupId);
  const groupMatches = matches.filter(
    (m) => m.group_id === groupId && m.status === "finished"
  );

  const standings: TeamStanding[] = groupTeams.map((team) => ({
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  }));

  const standingsMap = new Map(standings.map((s) => [s.team.id, s]));

  for (const match of groupMatches) {
    if (match.home_score === null || match.away_score === null) continue;

    const home = standingsMap.get(match.home_team_id);
    const away = standingsMap.get(match.away_team_id);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (match.home_score < match.away_score) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }

    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;
  }

  // Sort: points > goal diff > goals for
  return standings.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor
  );
}

export default function GroupStandings({
  matches: initialMatches,
  teams,
}: GroupStandingsProps) {
  const [matches, setMatches] = useState(initialMatches);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const groups = [...new Set(teams.map((t) => t.group_id).filter(Boolean))].sort();

  // Realtime updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("standings-matches")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const updated = payload.new as Match;
          setMatches((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const hasAnyResults = matches.some((m) => m.status === "finished");

  return (
    <div className="space-y-2">
      {!hasAnyResults && (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">⏳</p>
          <p className="text-sm sm:text-base text-muted font-medium">
            Todavía no se jugó ningún partido pibe, aguante la Scalonetaaaaa
          </p>
          <p className="text-xs sm:text-sm text-muted/70 mt-1">
            Las tablas se van a ir actualizando a medida que se jueguen los
            partidos
          </p>
        </div>
      )}

      {groups.map((groupId) => {
        const isOpen = openGroups.has(groupId);
        const standings = calculateStandings(teams, matches, groupId);
        const groupFinishedMatches = matches.filter(
          (m) => m.group_id === groupId && m.status === "finished"
        ).length;

        return (
          <div key={groupId}>
            <button
              onClick={() => toggleGroup(groupId)}
              className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                isOpen
                  ? "bg-card border border-accent/30"
                  : "bg-card border border-card-border hover:border-card-border/80"
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-base sm:text-lg">🏟️</span>
                <div>
                  <span className="text-sm sm:text-base font-semibold">
                    Grupo {groupId}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted ml-2">
                    {groupFinishedMatches}/6 jugados
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mini flags preview */}
                <div className="flex gap-1">
                  {standings.slice(0, 4).map((s) => (
                    <span key={s.team.id} className="text-sm">
                      {s.team.flag_emoji}
                    </span>
                  ))}
                </div>
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-muted transition-transform shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="mt-2 bg-card border border-card-border rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_repeat(7,_minmax(24px,_1fr))] gap-0 px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] text-muted uppercase tracking-wider border-b border-card-border">
                  <span>Equipo</span>
                  <span className="text-center">PJ</span>
                  <span className="text-center">G</span>
                  <span className="text-center">E</span>
                  <span className="text-center">P</span>
                  <span className="text-center">GF</span>
                  <span className="text-center">GC</span>
                  <span className="text-center font-bold">Pts</span>
                </div>

                {/* Team rows */}
                {standings.map((s, idx) => {
                  const qualifies = idx < 2;
                  const thirdPlace = idx === 2;

                  return (
                    <div
                      key={s.team.id}
                      className={`grid grid-cols-[1fr_repeat(7,_minmax(24px,_1fr))] gap-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm items-center ${
                        idx < standings.length - 1
                          ? "border-b border-card-border/50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-[10px] sm:text-xs text-muted w-3 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm sm:text-base shrink-0">
                          {s.team.flag_emoji}
                        </span>
                        <span className="font-medium truncate text-xs sm:text-sm">
                          {s.team.name}
                        </span>
                      </div>
                      <span className="text-center text-muted">
                        {s.played}
                      </span>
                      <span className="text-center">{s.won}</span>
                      <span className="text-center">{s.drawn}</span>
                      <span className="text-center">{s.lost}</span>
                      <span className="text-center text-muted">
                        {s.goalsFor}
                      </span>
                      <span className="text-center text-muted">
                        {s.goalsAgainst}
                      </span>
                      <span className="text-center font-bold text-accent">
                        {s.points}
                      </span>
                    </div>
                  );
                })}

                {/* Legend */}
                <div className="px-3 sm:px-4 py-2 flex gap-3 text-[9px] sm:text-[10px] text-muted border-t border-card-border">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent/30"></span>
                    Clasifica
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gold/30"></span>
                    Posible 3ro
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
