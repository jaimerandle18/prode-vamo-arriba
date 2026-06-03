"use client";

import { Profile } from "@/lib/types";

export default function Leaderboard({ profiles }: { profiles: Profile[] }) {
  const sorted = [...profiles].sort((a, b) => b.total_points - a.total_points);

  const medalColor = (index: number) => {
    if (index === 0) return "text-gold";
    if (index === 1) return "text-silver";
    if (index === 2) return "text-bronze";
    return "text-muted";
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold">🏆 Tabla de posiciones</h2>
        <span className="text-[10px] sm:text-xs text-muted">+1 ganador · +3 exacto</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-muted py-4 sm:py-6 text-sm">
          Todavía no hay jugadores ⚽
        </p>
      ) : (
        <div className="space-y-1 sm:space-y-2">
          {sorted.map((profile, index) => (
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
              </span>
              <span className="font-bold text-accent text-xs sm:text-sm shrink-0">
                {profile.total_points} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
