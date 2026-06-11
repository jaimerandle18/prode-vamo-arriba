"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const DURATION = 5000;

export default function GoalCelebration({
  teamName,
  flagEmoji,
  scoreline,
  onDone,
}: {
  teamName: string;
  flagEmoji?: string;
  scoreline?: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const end = Date.now() + DURATION - 500;

    // Explosión inicial en el centro
    confetti({
      particleCount: 160,
      spread: 100,
      startVelocity: 55,
      origin: { x: 0.5, y: 0.6 },
      zIndex: 9999,
    });

    // Cañones laterales continuos desde las esquinas de abajo
    let raf: number;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.9 },
        colors: ["#ffd700", "#ffffff", "#22c55e", "#3b82f6"],
        zIndex: 9999,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.9 },
        colors: ["#ffd700", "#ffffff", "#22c55e", "#3b82f6"],
        zIndex: 9999,
      });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    })();

    const timeout = setTimeout(onDone, DURATION);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [onDone]);

  return (
    <div className="goal-overlay fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
      {/* Backdrop oscurecido */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Placa central estilo transmisión */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-2 sm:gap-3">
        <p className="goal-title font-black italic tracking-tighter text-6xl sm:text-8xl bg-gradient-to-b from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent [filter:drop-shadow(0_4px_16px_rgba(250,204,21,0.45))]">
          ¡GOOOL!
        </p>
        <p className="goal-team flex items-center gap-2 sm:gap-3 text-3xl sm:text-5xl font-black text-white uppercase tracking-wide [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
          {flagEmoji && <span>{flagEmoji}</span>}
          <span>{teamName}</span>
          {flagEmoji && <span>{flagEmoji}</span>}
        </p>
        {scoreline && (
          <p className="goal-score text-base sm:text-xl font-semibold text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
            {scoreline}
          </p>
        )}
      </div>

      {/* Pelota cruzando abajo */}
      <div className="goal-ball-track">
        <span className="goal-ball">⚽</span>
      </div>

      <style>{`
        .goal-overlay {
          animation: goal-fade-out 0.5s ease-in ${(DURATION - 500) / 1000}s forwards;
        }
        .goal-title {
          animation: goal-pop 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.4) both;
        }
        .goal-team {
          animation: goal-rise 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.2) 0.25s both;
        }
        .goal-score {
          animation: goal-rise 0.5s ease-out 0.5s both;
        }
        .goal-ball-track {
          position: absolute;
          bottom: 8%;
          left: -15%;
          animation: goal-roll ${DURATION / 1000}s linear forwards;
        }
        .goal-ball {
          display: inline-block;
          font-size: 4.5rem;
          animation: goal-spin 1s linear infinite, goal-bounce 0.7s ease-in-out infinite alternate;
        }
        @keyframes goal-pop {
          from { transform: scale(0) rotate(-8deg); opacity: 0; }
          to { transform: scale(1) rotate(-4deg); opacity: 1; }
        }
        @keyframes goal-rise {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes goal-fade-out {
          to { opacity: 0; }
        }
        @keyframes goal-roll {
          from { left: -15%; }
          to { left: 110%; }
        }
        @keyframes goal-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes goal-bounce {
          from { translate: 0 0; }
          to { translate: 0 -60px; }
        }
      `}</style>
    </div>
  );
}
