"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const EMOJIS = ["⚽", "🔥", "😱", "🤬", "💀", "🧉"];
const FLOAT_DURATION = 3500;
const THROTTLE_MS = 300;

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number; // % horizontal
  drift: number; // px de deriva lateral
}

export default function LiveReactions({ leagueId }: { leagueId?: string }) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);
  const lastSentRef = useRef(0);
  const idRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`reactions:${leagueId ?? "global"}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const emoji = payload?.emoji;
        if (!EMOJIS.includes(emoji)) return;
        const id = idRef.current++;
        setFloating((prev) => [
          ...prev.slice(-40), // cap por si llueven reacciones
          {
            id,
            emoji,
            x: 10 + ((id * 37) % 80),
            drift: ((id * 53) % 60) - 30,
          },
        ]);
        setTimeout(() => {
          setFloating((prev) => prev.filter((f) => f.id !== id));
        }, FLOAT_DURATION);
      })
      .subscribe((status) => {
        readyRef.current = status === "SUBSCRIBED";
      });

    channelRef.current = channel;

    return () => {
      readyRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [leagueId]);

  const send = (emoji: string) => {
    const now = Date.now();
    if (!readyRef.current || now - lastSentRef.current < THROTTLE_MS) return;
    lastSentRef.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "reaction",
      payload: { emoji },
    });
  };

  return (
    <>
      {/* Emojis flotando */}
      <div className="fixed inset-0 z-[9990] pointer-events-none overflow-hidden">
        {floating.map((f) => (
          <span
            key={f.id}
            className="reaction-float absolute bottom-20 text-3xl sm:text-4xl"
            style={
              {
                left: `${f.x}%`,
                "--drift": `${f.drift}px`,
              } as React.CSSProperties
            }
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Barra de reacciones */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9991] flex items-center gap-1 sm:gap-1.5 bg-card/90 border border-card-border rounded-full px-2 py-1.5 shadow-lg backdrop-blur-sm">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => send(emoji)}
            className="text-xl sm:text-2xl px-1.5 py-0.5 rounded-full hover:bg-background/60 active:scale-125 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      <style>{`
        .reaction-float {
          animation: reaction-rise ${FLOAT_DURATION / 1000}s ease-out forwards;
        }
        @keyframes reaction-rise {
          0% { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; }
          10% { opacity: 1; transform: translateY(-30px) translateX(calc(var(--drift) * 0.2)) scale(1.1); }
          100% { transform: translateY(-70vh) translateX(var(--drift)) scale(1); opacity: 0; }
        }
      `}</style>
    </>
  );
}
