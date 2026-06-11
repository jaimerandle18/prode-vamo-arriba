"use client";

import { useState, useEffect } from "react";
import { Match, Prediction, Team } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import MatchCard from "./MatchCard";

interface MatchListProps {
  matches: Match[];
  teams: Team[];
  predictions: Prediction[];
  userId: string;
}

type Tab = "predictions" | "results";
type GroupFilter = "all" | string;

export default function MatchList({
  matches: initialMatches,
  teams,
  predictions: initialPredictions,
  userId,
}: MatchListProps) {
  const [tab, setTab] = useState<Tab>("predictions");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [matches, setMatches] = useState(initialMatches);
  const [predictions, setPredictions] = useState(initialPredictions);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));
  const predictionsMap = new Map(predictions.map((p) => [p.match_id, p]));

  const now = new Date();

  const hasLiveMatches = matches.some((m) => m.status === "live" || m.status === "halftime");

  // Supabase Realtime: escuchar cambios en matches y predictions
  useEffect(() => {
    const supabase = createClient();

    // Escuchar cambios en partidos (resultados en vivo)
    const matchesChannel = supabase
      .channel("matches-realtime")
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

    // Escuchar cambios en predictions (puntos actualizados)
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
          const updated = payload.new as Prediction;
          setPredictions((prev) => {
            const existing = prev.findIndex((p) => p.match_id === updated.match_id);
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

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(predictionsChannel);
    };
  }, [userId]);

  const filteredMatches = matches
    .filter((m) => {
      if (tab === "results") return m.status === "finished";
      return true;
    })
    .filter((m) => {
      if (groupFilter === "all") return true;
      return m.group_id === groupFilter;
    })
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );

  const groups = [...new Set(matches.map((m) => m.group_id).filter(Boolean))].sort();

  // Group matches by date
  const matchesByDate = filteredMatches.reduce(
    (acc, match) => {
      const dateKey = new Date(match.match_date).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(match);
      return acc;
    },
    {} as Record<string, Match[]>
  );

  return (
    <div>
      {/* Live indicator */}
      {hasLiveMatches && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-sm font-medium text-red-400">
            Partidos en vivo — resultados se actualizan automáticamente
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("predictions")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            tab === "predictions"
              ? "bg-accent text-background"
              : "bg-card border border-card-border text-muted hover:text-foreground"
          }`}
        >
          🎯 Pronósticos
        </button>
        <button
          onClick={() => setTab("results")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            tab === "results"
              ? "bg-accent text-background"
              : "bg-card border border-card-border text-muted hover:text-foreground"
          }`}
        >
          🏆 Resultados
        </button>
      </div>

      {/* Group filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setGroupFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            groupFilter === "all"
              ? "bg-accent text-background"
              : "bg-card border border-card-border text-muted hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroupFilter(g!)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              groupFilter === g
                ? "bg-accent text-background"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            Grupo {g}
          </button>
        ))}
      </div>

      {/* Matches */}
      {Object.entries(matchesByDate).length === 0 ? (
        <p className="text-center text-muted py-8">
          {tab === "results"
            ? "Todavía no hay resultados cargados"
            : "No hay partidos para mostrar"}
        </p>
      ) : (
        Object.entries(matchesByDate).map(([date, dateMatches]) => (
          <div key={date} className="mb-6">
            <h3 className="text-sm font-medium text-muted mb-3 capitalize">
              {date}
            </h3>
            <div className="space-y-3">
              {dateMatches.map((match) => {
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
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
