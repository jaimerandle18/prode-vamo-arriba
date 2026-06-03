"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo / Trophy */}
        <div className="relative mb-8">
          <div className="text-7xl sm:text-8xl animate-bounce" style={{ animationDuration: "3s" }}>
            🏆
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-accent/20 rounded-full blur-sm" />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent">
          VAMO ARRIBA
        </h1>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-accent/50" />
          <span className="text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
            Prode Mundial 2026
          </span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-accent/50" />
        </div>

        {/* Host cities */}
        <div className="flex items-center gap-3 sm:gap-4 mb-10 text-muted">
          <div className="flex flex-col items-center">
            <span className="text-lg sm:text-xl">🇨🇦</span>
            <span className="text-[9px] sm:text-[10px] mt-0.5">Canadá</span>
          </div>
          <span className="text-card-border">|</span>
          <div className="flex flex-col items-center">
            <span className="text-lg sm:text-xl">🇲🇽</span>
            <span className="text-[9px] sm:text-[10px] mt-0.5">México</span>
          </div>
          <span className="text-card-border">|</span>
          <div className="flex flex-col items-center">
            <span className="text-lg sm:text-xl">🇺🇸</span>
            <span className="text-[9px] sm:text-[10px] mt-0.5">EE.UU.</span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10 w-full max-w-xs">
          <div className="bg-card/80 border border-card-border rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-xl sm:text-2xl font-black text-accent">48</p>
            <p className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wider">Selecciones</p>
          </div>
          <div className="bg-card/80 border border-card-border rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-xl sm:text-2xl font-black text-accent">12</p>
            <p className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wider">Grupos</p>
          </div>
          <div className="bg-card/80 border border-card-border rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-xl sm:text-2xl font-black text-accent">104</p>
            <p className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wider">Partidos</p>
          </div>
        </div>

        {/* Scoring info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-1.5">
            <span className="bg-gold/20 text-gold text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">+1</span>
            <span className="text-[10px] sm:text-xs text-muted">Acertar ganador</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-accent/20 text-accent text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">+3</span>
            <span className="text-[10px] sm:text-xs text-muted">Resultado exacto</span>
          </div>
        </div>

        {/* Login button */}
        <button
          onClick={handleGoogleLogin}
          className="group flex items-center gap-3 bg-white text-gray-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-lg shadow-white/10 hover:shadow-xl hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Entrar con Google
          <svg
            className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <p className="text-[10px] text-muted/50 mt-6">
          Predecí · Competí · Demostrá que sabés
        </p>
      </div>
    </div>
  );
}
