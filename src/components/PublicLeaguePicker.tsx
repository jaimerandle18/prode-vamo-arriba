"use client";

import { useEffect, useState } from "react";
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
  // Check immediately if we should redirect (before first render)
  const hasPending = isLoggedIn && typeof window !== "undefined" && !!localStorage.getItem("pending_league");
  const [loading, setLoading] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(hasPending);

  useEffect(() => {
    if (!isLoggedIn) return;
    const pending = localStorage.getItem("pending_league");
    if (pending) {
      setRedirecting(true);
      localStorage.removeItem("pending_league");
      handleSelect(pending);
    }
  }, [isLoggedIn]);

  const handleSelect = async (leagueId: string) => {
    setLoading(leagueId);
    if (isLoggedIn) {
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
      localStorage.setItem("pending_league", leagueId);
      router.push("/login");
    }
  };

  if (redirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <svg
          className="w-8 h-8 text-accent animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-muted">Entrando al prode...</p>
      </div>
    );
  }

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
          {leagues.map((league) => {
            const isLoading = loading === league.id;

            return (
              <button
                key={league.id}
                onClick={() => handleSelect(league.id)}
                disabled={!!loading}
                className={`group w-full flex items-center gap-4 bg-card border border-card-border rounded-xl px-5 py-5 transition-all cursor-pointer ${
                  isLoading
                    ? "border-accent/50 scale-[0.98]"
                    : loading
                      ? "opacity-40"
                      : "hover:border-accent/50 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                <span className="text-3xl sm:text-4xl">{league.emoji}</span>
                <span className="flex-1 text-left text-lg sm:text-xl font-bold">
                  {league.name}
                </span>
                {isLoading ? (
                  <svg
                    className="w-5 h-5 text-accent animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
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
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-muted/50 mt-8">
          Predecí · Competí · Demostrá que sabés
        </p>
      </div>
    </div>
  );
}
