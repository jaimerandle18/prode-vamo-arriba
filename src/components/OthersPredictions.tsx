"use client";

import { useState, useEffect } from "react";
import { Match, Prediction, Team, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface OthersPredictionsProps {
  matches: Match[];
  teams: Team[];
  profiles: Profile[];
  userId: string;
}

export default function OthersPredictions({
  matches,
  teams,
  profiles,
  userId,
}: OthersPredictionsProps) {
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMatchId, setOpenMatchId] = useState<number | null>(null);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));
  const profilesMap = new Map(profiles.map((p) => [p.id, p]));
  const now = new Date();

  // Fetch all predictions for started matches
  useEffect(() => {
    const supabase = createClient();

    async function fetchAll() {
      const { data } = await supabase
        .from("predictions")
        .select("*")
        .returns<Prediction[]>();
      setAllPredictions(data ?? []);
      setLoading(false);
    }

    fetchAll();

    // Listen for realtime updates
    const channel = supabase
      .channel("all-predictions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        (payload) => {
          const updated = payload.new as Prediction;
          setAllPredictions((prev) => {
            const idx = prev.findIndex(
              (p) => p.user_id === updated.user_id && p.match_id === updated.match_id
            );
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updated;
              return copy;
            }
            return [...prev, updated];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Only show matches that already started
  const startedMatches = matches
    .filter((m) => {
      const matchTime = new Date(m.match_date);
      return matchTime <= now || m.status === "live" || m.status === "finished";
    })
    .sort(
      (a, b) =>
        new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    );

  if (loading) {
    return (
      <p className="text-center text-muted py-8 text-sm">
        Cargando predicciones...
      </p>
    );
  }

  if (startedMatches.length === 0) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-8 text-center">
        <p className="text-2xl mb-2">👀</p>
        <p className="text-sm sm:text-base text-muted font-medium">
          Todavía no arrancó ningún partido
        </p>
        <p className="text-xs sm:text-sm text-muted/70 mt-1">
          Cuando arranque un partido vas a poder ver qué pusieron los demás
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {startedMatches.map((match) => {
        const homeTeam = teamsMap.get(match.home_team_id);
        const awayTeam = teamsMap.get(match.away_team_id);
        if (!homeTeam || !awayTeam) return null;

        const matchPredictions = allPredictions.filter(
          (p) => p.match_id === match.id
        );
        const isOpen = openMatchId === match.id;
        const isLive = match.status === "live";
        const isFinished = match.status === "finished";
        const matchDate = new Date(match.match_date);

        return (
          <div key={match.id}>
            <button
              onClick={() => setOpenMatchId(isOpen ? null : match.id)}
              className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                isOpen
                  ? "bg-card border border-accent/30"
                  : "bg-card border border-card-border hover:border-card-border/80"
              } ${isLive ? "border-red-500/50" : ""}`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Score or status */}
                <div className="flex items-center gap-1 shrink-0">
                  {isFinished || isLive ? (
                    <span
                      className={`text-sm sm:text-base font-bold ${isLive ? "text-red-400" : "text-accent"}`}
                    >
                      {match.home_score} - {match.away_score}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">vs</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-medium block truncate">
                    {homeTeam.flag_emoji} {homeTeam.name} vs {awayTeam.name}{" "}
                    {awayTeam.flag_emoji}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted">
                    {matchDate.toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                    {" · "}
                    {matchPredictions.length} predicciones
                  </span>
                </div>

                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-red-400 shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    VIVO
                  </span>
                )}
              </div>

              <svg
                className={`w-4 h-4 sm:w-5 sm:h-5 text-muted transition-transform shrink-0 ml-2 ${
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
            </button>

            {isOpen && (
              <div className="mt-2 bg-card border border-card-border rounded-xl overflow-hidden">
                {matchPredictions.length === 0 ? (
                  <p className="text-center text-muted py-4 text-xs sm:text-sm">
                    Nadie cargó pronóstico para este partido
                  </p>
                ) : (
                  <div className="divide-y divide-card-border">
                    {matchPredictions
                      .sort((a, b) => (b.points ?? -1) - (a.points ?? -1))
                      .map((pred) => {
                        const profile = profilesMap.get(pred.user_id);
                        if (!profile) return null;

                        const isMe = pred.user_id === userId;
                        let pointsColor = "text-muted";
                        let pointsLabel = "";
                        if (pred.points === 3) {
                          pointsColor = "text-accent";
                          pointsLabel = "+3";
                        } else if (pred.points === 1) {
                          pointsColor = "text-gold";
                          pointsLabel = "+1";
                        } else if (pred.points === 0) {
                          pointsColor = "text-red-400";
                          pointsLabel = "+0";
                        }

                        return (
                          <div
                            key={pred.id}
                            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 ${
                              isMe ? "bg-accent/5" : ""
                            }`}
                          >
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.display_name}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-card-border flex items-center justify-center text-[10px] sm:text-xs shrink-0">
                                {profile.display_name[0]}
                              </div>
                            )}

                            <span
                              className={`flex-1 text-xs sm:text-sm truncate min-w-0 ${
                                isMe ? "font-semibold" : ""
                              }`}
                            >
                              {profile.display_name}
                              {isMe && (
                                <span className="text-accent ml-1 text-[10px]">
                                  (vos)
                                </span>
                              )}
                            </span>

                            <span className="text-sm sm:text-base font-bold shrink-0">
                              {pred.home_score} - {pred.away_score}
                            </span>

                            {pred.points !== null && (
                              <span
                                className={`text-[10px] sm:text-xs font-bold shrink-0 w-6 text-right ${pointsColor}`}
                              >
                                {pointsLabel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
