"use client";

import { useEffect, useMemo, useState } from "react";
import { Match, Prediction, Profile, Team } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface PlayerHistoryProps {
  profile: Profile;
  matches: Match[];
  teams: Team[];
  onClose: () => void;
}

interface HistoryEntry {
  match: Match;
  prediction: Prediction;
  cumulative: number;
}

const W = 320;
const H = 130;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 8;

function pointsColor(points: number | null): string {
  if (points === 3) return "var(--accent)";
  if (points === 1) return "var(--gold)";
  return "#f87171";
}

export default function PlayerHistory({
  profile,
  matches,
  teams,
  onClose,
}: PlayerHistoryProps) {
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("predictions")
      .select("*")
      .eq("user_id", profile.id)
      .not("points", "is", null)
      .returns<Prediction[]>()
      .then(({ data }) => setPredictions(data ?? []));
  }, [profile.id]);

  const entries: HistoryEntry[] = useMemo(() => {
    if (!predictions) return [];
    const finishedMap = new Map(
      matches.filter((m) => m.status === "finished").map((m) => [m.id, m])
    );
    let cumulative = 0;
    return predictions
      .map((p) => ({ prediction: p, match: finishedMap.get(p.match_id) }))
      .filter((e): e is { prediction: Prediction; match: Match } => !!e.match)
      .sort(
        (a, b) =>
          new Date(a.match.match_date).getTime() -
          new Date(b.match.match_date).getTime()
      )
      .map((e) => {
        cumulative += e.prediction.points ?? 0;
        return { ...e, cumulative };
      });
  }, [predictions, matches]);

  const total = entries.length ? entries[entries.length - 1].cumulative : 0;
  const exactos = entries.filter((e) => e.prediction.points === 3).length;
  const ganadores = entries.filter((e) => e.prediction.points === 1).length;
  const erradas = entries.filter((e) => e.prediction.points === 0).length;

  // Gráfico estilo electrocardiograma: línea recta en el medio con un pico
  // hacia arriba por cada exacto y hacia abajo por cada errada; los +1 siguen
  // derecho por la línea.
  const n = entries.length;
  const xAt = (i: number) =>
    PAD_X + (i * (W - 2 * PAD_X)) / Math.max(n - 1, 1);
  const yAt = (v: number) =>
    PAD_TOP + ((1 - v) * (H - PAD_TOP - PAD_BOTTOM)) / 2;

  const beatOf = (points: number | null) =>
    points === 3 ? 1 : points === 1 ? 0 : -1;

  const gap = (W - 2 * PAD_X) / Math.max(n - 1, 1);
  const spikeWidth = Math.min(gap * 0.35, 5);
  const beatPoints: [number, number][] = [];
  entries.forEach((e, i) => {
    const beat = beatOf(e.prediction.points);
    if (beat === 0) {
      beatPoints.push([xAt(i), yAt(0)]);
    } else {
      beatPoints.push(
        [xAt(i) - spikeWidth, yAt(0)],
        [xAt(i), yAt(beat)],
        [xAt(i) + spikeWidth, yAt(0)]
      );
    }
  });
  const linePath = beatPoints
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");

  const firstDate = n ? new Date(entries[0].match.match_date) : null;
  const lastDate = n ? new Date(entries[n - 1].match.match_date) : null;
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[100dvh] sm:max-h-[88dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-card-border px-4 py-3 flex items-center gap-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-8 h-8 rounded-full shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-card-border flex items-center justify-center text-sm shrink-0">
              {profile.display_name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold truncate">
              {profile.display_name}
            </h3>
            <p className="text-[10px] sm:text-xs text-muted">
              Historial · {n} partidos pronosticados
            </p>
          </div>
          <span className="font-bold text-accent text-sm sm:text-base shrink-0">
            {total} pts
          </span>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-xl leading-none px-1 cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {predictions === null ? (
          <p className="text-center text-muted py-10 text-sm">Cargando...</p>
        ) : n === 0 ? (
          <p className="text-center text-muted py-10 text-sm">
            Todavía no tiene partidos puntuados 🤷
          </p>
        ) : (
          <div className="p-4 space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background/50 border border-card-border rounded-lg py-2">
                <p className="text-base sm:text-lg font-bold text-accent">
                  {exactos}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wide">
                  Exactos +3
                </p>
              </div>
              <div className="bg-background/50 border border-card-border rounded-lg py-2">
                <p className="text-base sm:text-lg font-bold text-gold">
                  {ganadores}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wide">
                  Ganador +1
                </p>
              </div>
              <div className="bg-background/50 border border-card-border rounded-lg py-2">
                <p className="text-base sm:text-lg font-bold text-red-400">
                  {erradas}
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wide">
                  Erradas
                </p>
              </div>
            </div>

            {/* Evolución de puntos */}
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest mb-1.5">
                📈 Evolución de puntos
              </p>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto bg-background/50 border border-card-border rounded-lg"
              >
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
                {entries.map((e, i) => (
                  <circle
                    key={e.prediction.id}
                    cx={xAt(i)}
                    cy={yAt(beatOf(e.prediction.points))}
                    r={n > 40 ? 1.5 : 2.5}
                    fill={pointsColor(e.prediction.points)}
                  />
                ))}
              </svg>
              <div className="flex justify-between text-[9px] sm:text-[10px] text-muted mt-1">
                <span>{firstDate ? fmtDate(firstDate) : ""}</span>
                <span className="flex gap-2">
                  <span className="text-accent">● +3</span>
                  <span className="text-gold">● +1</span>
                  <span className="text-red-400">● 0</span>
                </span>
                <span>{lastDate ? fmtDate(lastDate) : ""}</span>
              </div>
            </div>

            {/* Partido por partido, del más reciente al primero */}
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest mb-1.5">
                ⚽ Partido por partido
              </p>
              <div className="divide-y divide-card-border border border-card-border rounded-lg overflow-hidden">
                {[...entries].reverse().map((e) => {
                  const home = teamsMap.get(e.match.home_team_id);
                  const away = teamsMap.get(e.match.away_team_id);
                  const pts = e.prediction.points ?? 0;
                  return (
                    <div
                      key={e.prediction.id}
                      className="flex items-center gap-2 px-2.5 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs truncate">
                          {home?.flag_emoji} {home?.name}{" "}
                          <span className="font-bold">
                            {e.match.home_score}-{e.match.away_score}
                          </span>{" "}
                          {away?.name} {away?.flag_emoji}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-muted">
                          Pronosticó {e.prediction.home_score}-
                          {e.prediction.away_score} ·{" "}
                          {fmtDate(new Date(e.match.match_date))}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-bold shrink-0 ${
                          pts === 3
                            ? "text-accent"
                            : pts === 1
                              ? "text-gold"
                              : "text-red-400"
                        }`}
                      >
                        +{pts}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-muted tabular-nums shrink-0 w-8 text-right">
                        {e.cumulative}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
