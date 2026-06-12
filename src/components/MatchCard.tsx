"use client";

import { useState, useEffect } from "react";
import { Match, Prediction, Team } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface MatchCardProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  prediction?: Prediction;
  userId: string;
  locked: boolean;
}

export default function MatchCard({
  match,
  homeTeam,
  awayTeam,
  prediction,
  userId,
  locked,
}: MatchCardProps) {
  const [homeScore, setHomeScore] = useState<string>(
    prediction?.home_score?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState<string>(
    prediction?.away_score?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!prediction);
  const [deleting, setDeleting] = useState(false);

  const matchDate = new Date(match.match_date);
  const isFinished = match.status === "finished";
  const isHalftime = match.status === "halftime";
  const isLive = match.status === "live" || isHalftime;

  // Segundos interpolados: el sync trae el minuto cada ~1 min,
  // este contador arranca de cero con cada update del minuto.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!isLive || isHalftime || !match.elapsed) return;
    setSeconds(0);
    const timer = setInterval(
      () => setSeconds((s) => Math.min(s + 1, 59)),
      1000
    );
    return () => clearInterval(timer);
  }, [match.elapsed, match.extra, isLive, isHalftime]);

  const liveClock = match.elapsed
    ? `${match.elapsed}${match.extra ? "+" + match.extra : ""}' ${String(seconds).padStart(2, "0")}"`
    : "En vivo";

  const handleSave = async () => {
    if (homeScore === "" || awayScore === "") return;
    setSaving(true);

    const supabase = createClient();
    const data = {
      user_id: userId,
      match_id: match.id,
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore),
      updated_at: new Date().toISOString(),
    };

    if (prediction) {
      await supabase
        .from("predictions")
        .update(data)
        .eq("id", prediction.id);
    } else {
      await supabase.from("predictions").insert(data);
    }

    setSaving(false);
    setSaved(true);
  };

  const handleDelete = async () => {
    if (!prediction) return;
    setDeleting(true);

    const supabase = createClient();
    await supabase.from("predictions").delete().eq("id", prediction.id);

    setHomeScore("");
    setAwayScore("");
    setSaved(false);
    setDeleting(false);
  };

  const pointsBadge = () => {
    if (prediction?.points === null || prediction?.points === undefined)
      return null;
    const pts = prediction.points;
    if (pts === 3)
      return (
        <span className="bg-accent/20 text-accent text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
          +3 EXACTO
        </span>
      );
    if (pts === 1)
      return (
        <span className="bg-gold/20 text-gold text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
          +1 GANADOR
        </span>
      );
    return (
      <span className="bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
        +0
      </span>
    );
  };

  return (
    <div
      className={`bg-card border rounded-xl p-3 sm:p-4 ${isLive ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : isFinished ? "border-foreground/30" : "border-card-border"}`}
    >
      {/* Match info */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs text-muted truncate mr-2">
          {match.group_id
            ? `Grupo ${match.group_id}`
            : match.phase === "round_of_32"
              ? "16avos de final"
              : match.phase === "round_of_16"
                ? "8vos de final"
                : match.phase === "quarter"
                  ? "Cuartos de final"
                  : match.phase === "semi"
                    ? "Semifinal"
                    : match.phase === "third_place"
                      ? "Tercer puesto"
                      : match.phase === "final"
                        ? "FINAL"
                        : match.phase}{" "}
          · {match.city}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-red-400 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            EN VIVO
          </span>
        ) : isFinished ? (
          <span className="text-[10px] sm:text-xs font-bold text-foreground/70 shrink-0">
            FINALIZADO
          </span>
        ) : (
          <span className="text-[10px] sm:text-xs text-muted shrink-0">
            {matchDate.toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
            })}{" "}
            {matchDate.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Teams and scores */}
      {locked || isLive || isFinished ? (
        <div>
          {/* Prediction row: teams aligned with score */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 text-right min-w-0">
              <span className="text-xs sm:text-sm font-medium">
                <span className="hidden sm:inline">{homeTeam.flag_emoji} </span>
                <span className="truncate">{homeTeam.name}</span>
                <span className="sm:hidden"> {homeTeam.flag_emoji}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-card-border font-bold text-base sm:text-lg rounded-lg">
                {prediction ? prediction.home_score : "-"}
              </span>
              <span className="text-muted text-[10px]">-</span>
              <span className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-card-border font-bold text-base sm:text-lg rounded-lg">
                {prediction ? prediction.away_score : "-"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-medium">
                <span className="sm:hidden">{awayTeam.flag_emoji} </span>
                <span className="truncate">{awayTeam.name}</span>
                <span className="hidden sm:inline"> {awayTeam.flag_emoji}</span>
              </span>
            </div>
          </div>
          {/* Live/final score below */}
          {(isLive || isFinished) &&
            match.home_score !== null &&
            match.away_score !== null && (
              <p
                className={`text-center text-[10px] sm:text-xs font-bold mt-1.5 ${isLive ? "text-red-400" : "text-foreground/70"}`}
              >
                {isLive
                  ? `⏱ ${isHalftime ? "Entretiempo" : liveClock} — ${match.home_score} - ${match.away_score}`
                  : `Finalizado ${match.home_score} - ${match.away_score}`}
              </p>
            )}
        </div>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 text-right min-w-0">
            <span className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">{homeTeam.flag_emoji} </span>
              <span className="truncate">{homeTeam.name}</span>
              <span className="sm:hidden"> {homeTeam.flag_emoji}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min="0"
              max="20"
              value={homeScore}
              onChange={(e) => {
                setHomeScore(e.target.value);
                setSaved(false);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 text-center bg-background border border-card-border rounded-lg font-bold text-base sm:text-lg focus:border-accent focus:outline-none"
              placeholder="-"
            />
            <span className="text-muted text-[10px]">-</span>
            <input
              type="number"
              min="0"
              max="20"
              value={awayScore}
              onChange={(e) => {
                setAwayScore(e.target.value);
                setSaved(false);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 text-center bg-background border border-card-border rounded-lg font-bold text-base sm:text-lg focus:border-accent focus:outline-none"
              placeholder="-"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs sm:text-sm font-medium">
              <span className="sm:hidden">{awayTeam.flag_emoji} </span>
              <span className="truncate">{awayTeam.name}</span>
              <span className="hidden sm:inline"> {awayTeam.flag_emoji}</span>
            </span>
          </div>
        </div>
      )}

      {/* Locked message */}
      {(locked || isLive || isFinished) && !prediction && (
        <p className="text-[10px] sm:text-xs text-muted/70 mt-2 text-center italic">
          Ya arrancó este partido, no se puede votar
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-2 sm:mt-3">
        <div>{pointsBadge()}</div>
        {!locked && !isFinished && !isLive && (
          <div className="flex items-center gap-2">
            {prediction && (
              <button
                onClick={handleDelete}
                disabled={deleting || saving}
                className="text-[10px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors cursor-pointer bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || saved || homeScore === "" || awayScore === ""}
              className={`text-[10px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors cursor-pointer ${
                saved
                  ? "bg-accent/20 text-accent"
                  : "bg-accent text-background hover:bg-accent-hover"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
