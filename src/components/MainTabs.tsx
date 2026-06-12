"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Match, Prediction, Team, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import MatchCard from "./MatchCard";
import Leaderboard from "./Leaderboard";
import OthersPredictions from "./OthersPredictions";
import GroupStandings from "./GroupStandings";
import GoalCelebration from "./GoalCelebration";

interface MainTabsProps {
  matches: Match[];
  teams: Team[];
  predictions: Prediction[];
  profiles: Profile[];
  userId: string;
  leagueId?: string;
}

type Tab = "leaderboard" | "predictions" | "resto" | "grupos";

const phaseLabels: Record<string, string> = {
  round_of_32: "16avos de final",
  round_of_16: "8vos de final",
  quarter: "Cuartos de final",
  semi: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
};

const phaseOrder = [
  "group_1",
  "group_2",
  "group_3",
  "round_of_32",
  "round_of_16",
  "quarter",
  "semi",
  "third_place",
  "final",
];

interface RoundSection {
  key: string;
  label: string;
  emoji: string;
  matches: Match[];
}

function getRoundInfo(match: Match): { key: string; label: string; emoji: string } {
  if (match.phase === "group" && match.round) {
    const num = match.round.match(/(\d+)$/)?.[1] || "1";
    return {
      key: `group_${num}`,
      label: `Fecha ${num} - Fase de grupos`,
      emoji: num === "1" ? "1️⃣" : num === "2" ? "2️⃣" : "3️⃣",
    };
  }

  if (match.phase !== "group") {
    return {
      key: match.phase,
      label: phaseLabels[match.phase] ?? match.phase,
      emoji:
        match.phase === "final"
          ? "🏆"
          : match.phase === "semi"
            ? "🔥"
            : match.phase === "third_place"
              ? "🥉"
              : "⚔️",
    };
  }

  return { key: "group_1", label: "Fecha 1 - Fase de grupos", emoji: "1️⃣" };
}

function groupMatchesByRound(matches: Match[]): RoundSection[] {
  const sections = new Map<string, RoundSection>();

  for (const match of matches) {
    const { key, label, emoji } = getRoundInfo(match);

    if (!sections.has(key)) {
      sections.set(key, { key, label, emoji, matches: [] });
    }
    sections.get(key)!.matches.push(match);
  }

  // Sort matches within each section by date
  for (const section of sections.values()) {
    section.matches.sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );
  }

  // Add placeholder sections for knockout phases that don't have matches yet
  const knockoutPlaceholders = [
    { key: "round_of_32", label: "16avos de final", emoji: "⚔️" },
    { key: "round_of_16", label: "8vos de final", emoji: "⚔️" },
    { key: "quarter", label: "Cuartos de final", emoji: "⚔️" },
    { key: "semi", label: "Semifinales", emoji: "🔥" },
    { key: "third_place", label: "Tercer puesto", emoji: "🥉" },
    { key: "final", label: "Final", emoji: "🏆" },
  ];

  for (const placeholder of knockoutPlaceholders) {
    if (!sections.has(placeholder.key)) {
      sections.set(placeholder.key, { ...placeholder, matches: [] });
    }
  }

  // Sort sections by phase order
  return [...sections.values()].sort(
    (a, b) => phaseOrder.indexOf(a.key) - phaseOrder.indexOf(b.key)
  );
}

export default function MainTabs({
  matches: initialMatches,
  teams,
  predictions: initialPredictions,
  profiles: initialProfiles,
  userId,
  leagueId,
}: MainTabsProps) {
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [matches, setMatches] = useState(initialMatches);
  const [predictions, setPredictions] = useState(initialPredictions);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [celebratingGoal, setCelebratingGoal] = useState<{
    teamName: string;
    flagEmoji?: string;
    scoreline?: string;
  } | null>(null);
  const lastGoalRef = useRef<string | null>(null);
  const endGoalCelebration = useCallback(() => setCelebratingGoal(null), []);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));
  const predictionsMap = new Map(predictions.map((p) => [p.match_id, p]));

  const now = new Date();
  const hasLiveMatches = matches.some((m) => m.status === "live" || m.status === "halftime");

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient();

    const matchesChannel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const updated = payload.new as Match;
          setMatches((prev) => {
            const old = prev.find((m) => m.id === updated.id);
            const homeScored =
              old && (updated.home_score ?? 0) > (old.home_score ?? 0);
            const awayScored =
              old && (updated.away_score ?? 0) > (old.away_score ?? 0);
            if (homeScored || awayScored) {
              const goalKey = `${updated.id}-${updated.home_score}-${updated.away_score}`;
              if (lastGoalRef.current !== goalKey) {
                lastGoalRef.current = goalKey;
                const scorer = teamsMap.get(
                  homeScored ? updated.home_team_id : updated.away_team_id
                );
                const home = teamsMap.get(updated.home_team_id);
                const away = teamsMap.get(updated.away_team_id);
                setTimeout(
                  () =>
                    setCelebratingGoal({
                      teamName: scorer?.name ?? "tu equipo",
                      flagEmoji: scorer?.flag_emoji ?? undefined,
                      scoreline:
                        home && away
                          ? `${home.name} ${updated.home_score} - ${updated.away_score} ${away.name}`
                          : undefined,
                    }),
                  0
                );
              }
            }
            return prev.map((m) =>
              m.id === updated.id ? { ...m, ...updated } : m
            );
          });
        }
      )
      .subscribe();

    const predictionsChannel = supabase
      .channel("predictions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "predictions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removed = payload.old as { id: number };
            setPredictions((prev) => prev.filter((p) => p.id !== removed.id));
            return;
          }
          const updated = payload.new as Prediction;
          setPredictions((prev) => {
            const existing = prev.findIndex(
              (p) => p.match_id === updated.match_id
            );
            if (existing >= 0) {
              const copy = [...prev];
              copy[existing] = updated;
              return copy;
            }
            return [...prev, updated];
          });
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Profile;
          setProfiles((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(predictionsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [userId]);

  const relevantMatches =
    matches;

  const sections = groupMatchesByRound(relevantMatches);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "leaderboard", label: "Posiciones", icon: "🏆" },
    { id: "predictions", label: "Pronósticos", icon: "🎯" },
    { id: "resto", label: "Resto", icon: "👀" },
    { id: "grupos", label: "Grupos", icon: "🏟️" },
  ];

  return (
    <div>
      {celebratingGoal && (
        <GoalCelebration {...celebratingGoal} onDone={endGoalCelebration} />
      )}

      {/* Live indicator */}
      {hasLiveMatches && (
        <div className="flex items-center gap-2 mb-3 sm:mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-xs sm:text-sm font-medium text-red-400">
            Partidos en vivo — se actualizan automáticamente
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? "bg-accent text-background"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "leaderboard" ? (
        <Leaderboard
          profiles={profiles}
          leagueId={leagueId}
          matches={matches}
          teams={teams}
        />
      ) : tab === "grupos" ? (
        <GroupStandings matches={matches} teams={teams} leagueId={leagueId} />
      ) : tab === "resto" ? (
        <OthersPredictions
          matches={matches}
          teams={teams}
          profiles={profiles}
          userId={userId}
        />
      ) : (
        <div className="space-y-2">
          {sections.length === 0 ? (
            <p className="text-center text-muted py-8 text-sm">
              No hay partidos para mostrar
            </p>
          ) : (
            sections.map((section) => {
              const isOpen = openSections.has(section.key);
              const predictedCount = section.matches.filter((m) =>
                predictionsMap.has(m.id)
              ).length;
              const totalCount = section.matches.length;
              const hasLive = section.matches.some(
                (m) => m.status === "live" || m.status === "halftime"
              );

              return (
                <div key={section.key}>
                  {/* Accordion header */}
                  <button
                    onClick={() => toggleSection(section.key)}
                    className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                      isOpen
                        ? "bg-card border border-accent/30"
                        : "bg-card border border-card-border hover:border-card-border/80"
                    } ${hasLive ? "border-red-500/50" : ""}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-base sm:text-lg">
                        {section.emoji}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm sm:text-base font-semibold block truncate">
                          {section.label}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted">
                          {totalCount} partidos
                          {tab === "predictions" &&
                            ` · ${predictedCount}/${totalCount} cargados`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                      {hasLive && (
                        <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-red-400 shrink-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          EN VIVO
                        </span>
                      )}
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

                  {/* Accordion content */}
                  {isOpen && (
                    <div className="mt-2 space-y-2 sm:space-y-3">
                      {section.matches.length === 0 ? (
                        <div className="bg-card border border-card-border rounded-xl p-6 text-center">
                          <p className="text-base sm:text-lg mb-1">
                            {leagueId === "las-pibas" ? "💁‍♀️" : "🤷"}
                          </p>
                          <p className="text-sm sm:text-base text-muted font-medium">
                            A quién querés votar {leagueId === "las-pibas" ? "piba" : "pibe"}?
                          </p>
                          <p className="text-xs sm:text-sm text-muted/70 mt-1">
                            Si todavía no sabemos quién va a jugarla
                          </p>
                        </div>
                      ) : (
                        section.matches.map((match) => {
                          const homeTeam = teamsMap.get(match.home_team_id);
                          const awayTeam = teamsMap.get(match.away_team_id);
                          if (!homeTeam || !awayTeam) return null;

                          const matchTime = new Date(match.match_date);
                          const locked = matchTime <= now;

                          return (
                            <MatchCard
                              key={match.id}
                              match={match}
                              homeTeam={homeTeam}
                              awayTeam={awayTeam}
                              prediction={predictionsMap.get(match.id)}
                              userId={userId}
                              locked={locked}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
