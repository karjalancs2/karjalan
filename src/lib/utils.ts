import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function faceitTierClass(level?: number | null, elo?: number | null) {
  if ((elo ?? 0) >= 2000 || (level ?? 0) >= 10) {
    return "text-red-500 bg-red-500/10";
  }
  if ((level ?? 0) >= 8) return "text-orange-500 bg-orange-500/10";
  if ((level ?? 0) >= 7) return "text-yellow-400 bg-yellow-400/10";
  if ((level ?? 0) >= 5) return "text-green-400 bg-green-400/10";
  if ((level ?? 0) >= 3) return "text-sky-400 bg-sky-400/10";
  return "text-violet-400 bg-violet-400/10";
}
