"use client";

import { useEffect, useState } from "react";
import { Match, Profile, Team } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import PlayerHistory from "./PlayerHistory";

// Racha: resultados consecutivos (acierto/error) en partidos finalizados,
// del más reciente hacia atrás. 3+ aciertos seguidos 🔥, 3+ errores 🧊.
const STREAK_MIN = 3;

interface StreakInfo {
  emoji: string;
  count: number;
}

const LEAGUE_NAMES: Record<string, string> = {
  "vamo-arriba": "VAMO ARRIBA",
  "las-pibas": "LAS PIBAS",
};

export default function Leaderboard({
  profiles,
  leagueId,
  matches = [],
  teams = [],
}: {
  profiles: Profile[];
  leagueId?: string;
  matches?: Match[];
  teams?: Team[];
}) {
  const [streaks, setStreaks] = useState<Map<string, StreakInfo>>(new Map());
  const [sharing, setSharing] = useState(false);
  const [livePoints, setLivePoints] = useState<Map<string, number>>(new Map());
  const [historyProfile, setHistoryProfile] = useState<Profile | null>(null);

  const liveMatches = matches.filter(
    (m) => m.status === "live" || m.status === "halftime"
  );
  const liveMatchIds = liveMatches.map((m) => m.id).join(",");
  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  // Puntos provisorios de los partidos en curso (el trigger de la DB
  // ya los calcula en vivo; acá los traemos para mostrarlos aparte)
  useEffect(() => {
    if (!liveMatchIds) {
      setLivePoints(new Map());
      return;
    }
    const supabase = createClient();
    supabase
      .from("predictions")
      .select("user_id, points")
      .in("match_id", liveMatchIds.split(",").map(Number))
      .then(({ data }) => {
        const sums = new Map<string, number>();
        for (const p of data ?? []) {
          sums.set(p.user_id, (sums.get(p.user_id) ?? 0) + (p.points ?? 0));
        }
        setLivePoints(sums);
      });
    // matches cambia con cada update de Realtime (gol/minuto) → refetch
  }, [liveMatchIds, matches]);

  useEffect(() => {
    const supabase = createClient();

    const fetchStreaks = async () => {
      const { data } = await supabase
        .from("predictions")
        .select("user_id, points, matches!inner(match_date, status)")
        .eq("matches.status", "finished")
        .not("points", "is", null);

      if (!data) return;

      const byUser = new Map<string, { date: string; hit: boolean }[]>();
      for (const row of data) {
        const match = row.matches as unknown as { match_date: string };
        if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
        byUser.get(row.user_id)!.push({
          date: match.match_date,
          hit: (row.points ?? 0) > 0,
        });
      }

      const result = new Map<string, StreakInfo>();
      for (const [userId, results] of byUser) {
        results.sort((a, b) => a.date.localeCompare(b.date));
        const last = results[results.length - 1];
        let count = 0;
        for (let i = results.length - 1; i >= 0; i--) {
          if (results[i].hit === last.hit) count++;
          else break;
        }
        if (count >= STREAK_MIN) {
          result.set(userId, { emoji: last.hit ? "🔥" : "🧊", count });
        }
      }
      setStreaks(result);
    };

    fetchStreaks();
  }, [profiles]);

  const sorted = [...profiles].sort((a, b) => b.total_points - a.total_points);

  const minPoints = sorted.length ? sorted[sorted.length - 1].total_points : 0;
  const maxPoints = sorted.length ? sorted[0].total_points : 0;
  const showClown = minPoints !== maxPoints;

  const medalColor = (index: number) => {
    if (index === 0) return "text-gold";
    if (index === 1) return "text-silver";
    if (index === 2) return "text-bronze";
    return "text-muted";
  };

  // Genera una imagen de la tabla y la comparte (o descarga)
  const shareImage = async () => {
    setSharing(true);
    try {
      const W = 900;
      const rowH = 76;
      const headerH = 190;
      const footerH = 90;
      const H = headerH + sorted.length * rowH + footerH;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Fondo
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0c1a0f");
      bg.addColorStop(1, "#09090b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Header
      ctx.textAlign = "center";
      ctx.fillStyle = "#fafafa";
      ctx.font = "900 56px -apple-system, system-ui, sans-serif";
      ctx.fillText(
        `🏆 ${LEAGUE_NAMES[leagueId ?? ""] ?? "PRODE"}`,
        W / 2,
        85
      );
      ctx.fillStyle = "#22c55e";
      ctx.font = "700 26px -apple-system, system-ui, sans-serif";
      ctx.fillText("PRODE MUNDIAL 2026 · TABLA DE POSICIONES", W / 2, 130);
      ctx.fillStyle = "#71717a";
      ctx.font = "400 22px -apple-system, system-ui, sans-serif";
      ctx.fillText(
        new Date().toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
        }),
        W / 2,
        165
      );

      // Filas
      sorted.forEach((p, i) => {
        const y = headerH + i * rowH;
        const streak = streaks.get(p.id);
        const isClown = showClown && p.total_points === minPoints;

        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(30, y, W - 60, rowH);
        }

        ctx.textAlign = "left";
        const medal =
          i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "700 34px -apple-system, system-ui, sans-serif";
        ctx.fillText(medal, 55, y + 50);

        ctx.fillStyle = "#fafafa";
        ctx.font = "600 32px -apple-system, system-ui, sans-serif";
        const name = `${p.display_name}${isClown ? " 🤡" : ""}${streak ? ` ${streak.emoji}${streak.count}` : ""}`;
        ctx.fillText(name, 130, y + 50, W - 320);

        ctx.textAlign = "right";
        ctx.fillStyle = "#22c55e";
        ctx.font = "900 34px -apple-system, system-ui, sans-serif";
        ctx.fillText(`${p.total_points} pts`, W - 55, y + 50);
      });

      // Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#52525b";
      ctx.font = "400 22px -apple-system, system-ui, sans-serif";
      ctx.fillText(
        "prode-vamo-arriba.vercel.app",
        W / 2,
        H - 40
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const file = new File([blob], "prode-tabla.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "prode-tabla.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // usuario canceló el share — no es error
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold">🏆  Tabla de posiciones</h2>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-muted whitespace-nowrap">+1 ganador · +3 exacto</span>
          <button
            onClick={shareImage}
            disabled={sharing || sorted.length === 0}
            title="Compartir tabla"
            className="text-[10px] sm:text-xs font-medium px-2 py-1 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer disabled:opacity-50"
          >
            {sharing ? "..." : "📲 Compartir"}
          </button>
        </div>
      </div>

      {/* Partidos en juego: la tabla se mueve con cada gol */}
      {liveMatches.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {liveMatches.map((m) => {
            const home = teamsMap.get(m.home_team_id);
            const away = teamsMap.get(m.away_team_id);
            if (!home || !away) return null;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[11px] sm:text-sm font-medium min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="truncate">
                    {home.flag_emoji} {home.name}{" "}
                    <span className="font-bold text-red-400">
                      {m.home_score} - {m.away_score}
                    </span>{" "}
                    {away.name} {away.flag_emoji}
                  </span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-red-400 shrink-0 ml-2">
                  {m.status === "halftime"
                    ? "ET"
                    : m.elapsed
                      ? `${m.elapsed}${m.extra ? "+" + m.extra : ""}'`
                      : ""}
                </span>
              </div>
            );
          })}
          <p className="text-[10px] sm:text-xs text-muted text-center">
            ⚡ = puntos en juego con el resultado actual
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-center text-muted py-4 sm:py-6 text-sm">
          Todavía no hay jugadores ⚽
        </p>
      ) : (
        <div className="space-y-1 sm:space-y-2">
          {sorted.map((profile, index) => {
            const streak = streaks.get(profile.id);
            const isClown = showClown && profile.total_points === minPoints;
            return (
              <div
                key={profile.id}
                onClick={() => setHistoryProfile(profile)}
                title="Ver historial"
                className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg hover:bg-background/50 transition-colors cursor-pointer"
              >
                <span
                  className={`text-base sm:text-lg font-bold w-5 sm:w-6 text-center shrink-0 ${medalColor(index)}`}
                >
                  {index + 1}
                </span>
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-card-border flex items-center justify-center text-xs sm:text-sm shrink-0">
                    {profile.display_name[0]}
                  </div>
                )}
                <span className="flex-1 font-medium text-xs sm:text-sm truncate min-w-0">
                  {profile.display_name}
                  {isClown && " 🤡"}
                </span>
                {streak && (
                  <span
                    className="text-xs sm:text-sm shrink-0"
                    title={`${streak.count} ${streak.emoji === "🔥" ? "aciertos" : "erradas"} seguidas`}
                  >
                    {streak.emoji}
                    <span className="text-[9px] sm:text-[10px] text-muted font-bold ml-0.5">
                      {streak.count}
                    </span>
                  </span>
                )}
                {(livePoints.get(profile.id) ?? 0) > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-bold bg-gold/15 text-gold rounded-full px-1.5 py-px shrink-0">
                    ⚡+{livePoints.get(profile.id)}
                  </span>
                )}
                <span className="font-bold text-accent text-xs sm:text-sm shrink-0">
                  {profile.total_points} pts
                </span>
              </div>
            );
          })}
        </div>
      )}

      {historyProfile && (
        <PlayerHistory
          profile={historyProfile}
          matches={matches}
          teams={teams}
          onClose={() => setHistoryProfile(null)}
        />
      )}
    </div>
  );
}
