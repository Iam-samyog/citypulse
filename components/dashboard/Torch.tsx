"use client";

import { useId } from "react";

/** Olympic-style bronze torch. Flame flickers when lit and shrinks to an ember when not. */
export function Torch({ lit = true, className = "h-10 w-5" }: { lit?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 40 100" className={className} aria-hidden>
      <defs>
        <linearGradient id={`f${id}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#d9381e" /><stop offset=".55" stopColor="#f58a28" /><stop offset="1" stopColor="#ffe45c" /></linearGradient>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6e5326" /><stop offset=".45" stopColor="#d2a95a" /><stop offset="1" stopColor="#5a431d" /></linearGradient>
        <linearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3b2f1a" /><stop offset=".5" stopColor="#8a6d38" /><stop offset="1" stopColor="#2f2514" /></linearGradient>
      </defs>
      <g className="torch-flame" style={lit ? undefined : { transform: "scale(.5)", opacity: 0.55, filter: "saturate(.5)", animation: "none" }}>
        <path d="M20 3C28 14 34 23 31 34c-2 6-6 8-11 8s-9-2-11-8C7 23 13 14 20 3Z" fill={`url(#f${id})`} />
        <path d="M8 22C2 29 4 37 13 43c-3-6-2-12 2-17Z" fill="#d9381e" />
        <path d="M32 22c6 7 4 15-5 21 3-6 2-12-2-17Z" fill="#e8501f" />
        <path d="M20 18c5 7 6 14 2 21-2 2-5 0-5-4 0-7 2-11 3-17Z" fill="#ffe97a" opacity=".9" />
      </g>
      <path d="M8 45h24l-3 10H11Z" fill={`url(#b${id})`} />
      <ellipse cx="20" cy="45" rx="12" ry="2.2" fill="#15110a" />
      <rect x="12" y="55" width="16" height="5" rx="1" fill={`url(#b${id})`} />
      <rect x="14" y="60" width="12" height="2.5" fill="#3b2f1a" />
      <path d="M16 62.5h8L21.2 98h-2.4Z" fill={`url(#h${id})`} />
    </svg>
  );
}
