"use client";

import { useEffect } from "react";
import { League } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PublicLeaguePickerProps {
  leagues: League[];
  isLoggedIn: boolean;
}

export default function PublicLeaguePicker({
  leagues,
  isLoggedIn,
}: PublicLeaguePickerProps) {
  const router = useRouter();

  // After login, check if there's a pending league to join
  useEffect(() => {
    if (!isLoggedIn) return;
    const pending = localStorage.getItem("pending_league");
    if (pending) {
      localStorage.removeItem("pending_league");
      handleSelect(pending);
    }
  }, [isLoggedIn]);

  const handleSelect = async (leagueId: string) => {
    if (isLoggedIn) {
      // Already logged in — join league and go
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("league_members")
          .upsert(
            { user_id: user.id, league_id: leagueId },
            { onConflict: "user_id,league_id" }
          );
        router.push(`/liga/${leagueId}`);
      }
    } else {
      // Not logged in — save league choice and go to login
      localStorage.setItem("pending_league", leagueId);
      router.push("/login");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div
          className="text-6xl sm:text-7xl mb-6 animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          🏆
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent">
          PRODE MUNDIAL
        </h1>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-accent/50" />
          <span className="text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
            2026
          </span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-accent/50" />
        </div>
        <p className="text-sm text-muted mb-8">Elegí tu prode</p>

        <div className="flex flex-col gap-3 w-full">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => handleSelect(league.id)}
              className="group w-full flex items-center gap-4 bg-card border border-card-border rounded-xl px-5 py-5 hover:border-accent/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-3xl sm:text-4xl">{league.emoji}</span>
              <span className="flex-1 text-left text-lg sm:text-xl font-bold">
                {league.name}
              </span>
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
                  d="M9 5l7 7-7-7"
                />
              </svg>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted/50 mt-8">
          Predecí · Competí · Demostrá que sabés
        </p>
      </div>
    </div>
  );
}
