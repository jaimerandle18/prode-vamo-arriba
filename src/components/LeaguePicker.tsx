"use client";

import { League } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface LeaguePickerProps {
  leagues: League[];
  userId: string;
  userLeagues: string[];
}

export default function LeaguePicker({
  leagues,
  userId,
  userLeagues,
}: LeaguePickerProps) {
  const router = useRouter();

  const handleJoin = async (leagueId: string) => {
    if (!userLeagues.includes(leagueId)) {
      const supabase = createClient();
      await supabase.from("league_members").insert({
        user_id: userId,
        league_id: leagueId,
      });
    }
    router.push(`/liga/${leagueId}`);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="text-5xl sm:text-6xl mb-6">🏆</div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-center">
          Elegí tu prode
        </h1>
        <p className="text-sm text-muted mb-8 text-center">
          Podés unirte a los dos si querés
        </p>

        <div className="flex flex-col gap-3 w-full">
          {leagues.map((league) => {
            const isMember = userLeagues.includes(league.id);

            return (
              <button
                key={league.id}
                onClick={() => handleJoin(league.id)}
                className="group w-full flex items-center gap-4 bg-card border border-card-border rounded-xl px-5 py-4 hover:border-accent/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="text-3xl sm:text-4xl">{league.emoji}</span>
                <div className="flex-1 text-left">
                  <span className="text-lg sm:text-xl font-bold block">
                    {league.name}
                  </span>
                  {isMember && (
                    <span className="text-[10px] sm:text-xs text-accent">
                      Ya estás adentro
                    </span>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
