"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function GoalCelebration({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const end = Date.now() + 5000;

    const burst = () => {
      confetti({
        particleCount: 70,
        spread: 80,
        startVelocity: 45,
        origin: { x: Math.random(), y: Math.random() * 0.3 + 0.1 },
        zIndex: 9999,
      });
    };

    burst();
    const interval = setInterval(() => {
      if (Date.now() < end) burst();
    }, 500);

    const timeout = setTimeout(onDone, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
      <div className="goal-ball-track">
        <span className="goal-ball">⚽</span>
      </div>
      <style>{`
        .goal-ball-track {
          position: absolute;
          bottom: 12%;
          left: -15%;
          animation: goal-roll 5s linear forwards;
        }
        .goal-ball {
          display: inline-block;
          font-size: 5rem;
          animation: goal-spin 1s linear infinite, goal-bounce 0.7s ease-in-out infinite alternate;
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
