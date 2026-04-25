"use client";

import { useMemo } from "react";

type Particle = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  hue: number;
  drift: number;
  opacity: number;
};

const COUNT = 36;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function Particles({ seed = 7 }: { seed?: number }) {
  const items = useMemo<Particle[]>(() => {
    const rand = rng(seed);
    return Array.from({ length: COUNT }, () => ({
      left: rand() * 100,
      delay: -rand() * 18,
      duration: 14 + rand() * 18,
      size: 2 + rand() * 4,
      hue: 70 + rand() * 30,
      drift: (rand() - 0.5) * 80,
      opacity: 0.25 + rand() * 0.45,
    }));
  }, [seed]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {items.map((p, i) => (
        <span
          key={i}
          className="absolute bottom-[-10%] block rounded-full blur-[1px] [animation:mattcha-rise_var(--d)_linear_infinite]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `hsl(${p.hue}deg 50% 70% / ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 4}px hsl(${p.hue}deg 60% 60% / ${p.opacity})`,
            animationDelay: `${p.delay}s`,
            // CSS variables consumed in keyframes
            ["--d" as never]: `${p.duration}s`,
            ["--drift" as never]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
