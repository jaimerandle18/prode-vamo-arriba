"use client";

import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const matchDate = new Date(match.match_date);
  const isFinished = match.status === "finished";
  const isHalftime = match.status === "halftime";
  const isLive = match.status === "live" || isHalftime;

  const liveClock = match.elapsed
    ? `${match.elapsed}${match.extra ? "+" + match.extra : ""}'`
    : "En vivo";

  const hasScore =
    (isLive || isFinished) &&
    match.home_score !== null &&
    match.away_score !== null;

  // Puntos que sumaría el pronóstico con el resultado actual
  const livePoints = (() => {
    if (!prediction || !hasScore) return null;
    const ph = prediction.home_score;
    const pa = prediction.away_score;
    const rh = match.home_score!;
    const ra = match.away_score!;
    if (ph === rh && pa === ra) return 3;
    const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);
    return sign(ph, pa) === sign(rh, ra) ? 1 : 0;
  })();

  const handleSave = async () => {
    if (homeScore === "" || awayScore === "") return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const data = {
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore),
      updated_at: new Date().toISOString(),
    };

    // Con RLS, un update/delete bloqueado no tira error: devuelve 0 filas.
    // Por eso el .select() para confirmar que realmente se escribió.
    let failed: boolean;
    if (prediction) {
      const { data: rows, error } = await supabase
        .from("predictions")
        .update(data)
        .eq("id", prediction.id)
        .select("id");
      failed = !!error || !rows?.length;
    } else {
      const { error } = await supabase
        .from("predictions")
        .insert({ user_id: userId, match_id: match.id, ...data });
      failed = !!error;
    }

    setSaving(false);
    if (failed) {
      setError("No se pudo guardar el pronóstico. Probá de nuevo.");
    } else {
      setSaved(true);
    }
  };

  const handleDelete = async () => {
    if (!prediction) return;
    setDeleting(true);
    setError(null);

    const supabase = createClient();
    const { data: rows, error } = await supabase
      .from("predictions")
      .delete()
      .eq("id", prediction.id)
      .select("id");

    setDeleting(false);
    if (error || !rows?.length) {
      setError("No se pudo eliminar el pronóstico. Probá de nuevo.");
      return;
    }

    setHomeScore("");
    setAwayScore("");
    setSaved(false);
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
            {isHalftime ? "ENTRETIEMPO" : liveClock}
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
              <span className="block truncate whitespace-nowrap text-xs sm:text-sm font-medium">
                <span className="hidden sm:inline">{homeTeam.flag_emoji} </span>
                {homeTeam.name}
                <span className="sm:hidden"> {homeTeam.flag_emoji}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-base sm:text-lg rounded-lg ${
                  hasScore && isLive
                    ? "bg-red-500/15 border border-red-500/40 text-red-400"
                    : "bg-card-border"
                }`}
              >
                {hasScore
                  ? match.home_score
                  : prediction
                    ? prediction.home_score
                    : "-"}
              </span>
              <span className="text-muted text-[10px]">-</span>
              <span
                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-base sm:text-lg rounded-lg ${
                  hasScore && isLive
                    ? "bg-red-500/15 border border-red-500/40 text-red-400"
                    : "bg-card-border"
                }`}
              >
                {hasScore
                  ? match.away_score
                  : prediction
                    ? prediction.away_score
                    : "-"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block truncate whitespace-nowrap text-xs sm:text-sm font-medium">
                <span className="sm:hidden">{awayTeam.flag_emoji} </span>
                {awayTeam.name}
                <span className="hidden sm:inline"> {awayTeam.flag_emoji}</span>
              </span>
            </div>
          </div>
          {/* Tu pronóstico debajo del resultado real */}
          {hasScore && prediction && (
            <div className="flex justify-center mt-2">
              <span
                className={`inline-flex items-center gap-1.5 bg-background/60 border border-card-border rounded-full pl-2.5 py-0.5 text-[10px] sm:text-xs text-muted ${
                  isLive && livePoints !== null ? "pr-1" : "pr-2.5"
                }`}
              >
                🎯 Tu pronóstico
                <span className="font-bold text-foreground/90">
                  {prediction.home_score} - {prediction.away_score}
                </span>
                {isLive && livePoints !== null && (
                  <span
                    className={`font-bold rounded-full px-1.5 py-px ${
                      livePoints === 3
                        ? "bg-accent/20 text-accent"
                        : livePoints === 1
                          ? "bg-gold/20 text-gold"
                          : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {livePoints === 3 ? "+3 🎯" : livePoints === 1 ? "+1" : "+0"}
                  </span>
                )}
              </span>
            </div>
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

      {error && (
        <p className="text-[10px] sm:text-xs text-red-400 mt-2 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
