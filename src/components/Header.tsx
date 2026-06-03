"use client";

import { Profile, League } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Header({
  user,
  league,
}: {
  user: Profile | null;
  league?: League;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("pending_league");
    router.push("/");
  };

  return (
    <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <a
            href="/"
            className="text-base sm:text-lg hover:opacity-70 transition-opacity"
            title="Cambiar de liga"
          >
            ⚽
          </a>
          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
              {league ? `PRODE ${league.name.toUpperCase()}` : "PRODE MUNDIAL 2026"}
            </h1>
            <p className="text-[10px] sm:text-xs text-muted truncate">
              Mundial 2026
            </p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium truncate max-w-[120px]">
                {user.display_name}
              </p>
              <p className="text-xs text-accent font-bold">
                {user.total_points} pts
              </p>
            </div>
            <div className="flex flex-col items-center sm:flex-row sm:gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-card-border flex items-center justify-center text-xs">
                  {user.display_name[0]}
                </div>
              )}
              <span className="text-[10px] text-accent font-bold sm:hidden">
                {user.total_points} pts
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] sm:text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
