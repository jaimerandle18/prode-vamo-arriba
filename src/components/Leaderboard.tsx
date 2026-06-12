"use client";

import { useEffect, useState } from "react";
import { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// Racha: resultados consecutivos (acierto/error) en partidos finalizados,
// del más reciente hacia atrás. 3+ aciertos seguidos 🔥, 3+ errores 🧊.
const STREAK_MIN = 3;

interface StreakInfo {
  emoji: string;
  count: number;
}

export default function Leaderboard({ profiles }: { profiles: Profile[] }) {
  const [streaks, setStreaks] = useState<Map<string, StreakInfo>>(new Map());

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

  return (
    <div className="bg-card border border-card-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold">🏆  Tabla de posiciones</h2>
        <span className="text-[10px] sm:text-xs text-muted">+1 ganador · +3 exacto</span>
      </div>

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
                className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg hover:bg-background/50 transition-colors"
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
                <span className="font-bold text-accent text-xs sm:text-sm shrink-0">
                  {profile.total_points} pts
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
