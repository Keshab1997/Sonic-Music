import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Languages } from "lucide-react";
import type { LyricLine } from "@/lib/lyricsParser";
import { transliterate, hasDevanagari } from "@/lib/transliterate";

interface SyncedLyricsProps {
  lines: LyricLine[];
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  className?: string;
  variant?: "light" | "dark";
}

function findActiveLine(lines: LyricLine[], time: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

export function SyncedLyrics({
  lines,
  currentTime,
  isPlaying,
  onSeek,
  className = "",
  variant = "light",
}: SyncedLyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const lastScrollTime = useRef(0);
  const userScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [showRoman, setShowRoman] = useState(false);

  const activeIdx = findActiveLine(lines, currentTime);

  const hasDevanagariLyrics = useMemo(
    () => lines.some((l) => hasDevanagari(l.text)),
    [lines]
  );

  const displayLines = useMemo(() => {
    if (!showRoman || !hasDevanagariLyrics) return lines;
    return lines.map((l) => ({
      ...l,
      text: hasDevanagari(l.text) ? transliterate(l.text) : l.text,
    }));
  }, [lines, showRoman, hasDevanagariLyrics]);

  // Auto-scroll to active line
  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return;
    if (userScrolling.current) return;

    const now = Date.now();
    if (now - lastScrollTime.current < 400) return;
    lastScrollTime.current = now;

    activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  const handleScroll = useCallback(() => {
    userScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      userScrolling.current = false;
    }, 3000);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [handleScroll]);

  if (lines.length === 0) return null;

  const isDark = variant === "dark";
  const isActiveToggle = showRoman && hasDevanagariLyrics;

  return (
    <div ref={containerRef} className={`overflow-y-auto scrollbar-hide ${className}`}>
      {/* Toggle button — sticky header */}
      <div
        className="sticky top-0 z-10 flex justify-end px-4 pt-3 pb-2 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to bottom, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.4) 75%, transparent)"
            : "linear-gradient(to bottom, hsl(var(--background) / 0.95) 40%, hsl(var(--background) / 0.6) 75%, transparent)",
        }}
      >
        <button
          onClick={() => hasDevanagariLyrics && setShowRoman(!showRoman)}
          disabled={!hasDevanagariLyrics}
          className={`
            pointer-events-auto relative flex items-center gap-2
            pl-3 pr-4 py-2 rounded-full text-xs font-semibold
            transition-all duration-300 ease-out select-none
            ${
              isDark
                ? isActiveToggle
                  ? "bg-white text-black shadow-lg shadow-white/10 ring-1 ring-white/30"
                  : hasDevanagariLyrics
                  ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10 hover:border-white/25"
                  : "bg-white/5 text-white/25 border border-white/5 cursor-not-allowed"
                : isActiveToggle
                ? "bg-foreground text-background shadow-lg shadow-foreground/10 ring-1 ring-foreground/20"
                : hasDevanagariLyrics
                ? "bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground border border-border/60 hover:border-foreground/20"
                : "bg-muted/40 text-muted-foreground/40 border border-border/30 cursor-not-allowed"
            }
          `}
          title={
            hasDevanagariLyrics
              ? showRoman ? "Show original script" : "Transliterate to Roman"
              : "No Devanagari text available"
          }
        >
          <Languages size={14} strokeWidth={2.5} />
          <span className="tracking-wide">
            {hasDevanagariLyrics ? (showRoman ? "हिन्दी" : "ABC") : "ABC"}
          </span>
        </button>
      </div>

      {/* Lyrics lines */}
      <div className="px-2 pb-[40vh] pt-4">
        {displayLines.map((line, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;

          return (
            <button
              key={`${line.time}-${i}`}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek?.(line.time)}
              disabled={!onSeek}
              className={`
                block w-full text-left rounded-xl
                px-5 my-1
                transition-all duration-300 ease-in-out
                ${onSeek ? "cursor-pointer" : "cursor-default"}
                ${
                  isActive
                    ? isDark
                      ? "text-white font-extrabold text-[22px] leading-snug tracking-tight scale-[1.03] py-4 my-2 bg-white/10 rounded-2xl"
                      : "text-black font-extrabold text-[22px] leading-snug tracking-tight scale-[1.03] py-4 my-2 bg-black/5 rounded-2xl"
                    : isPast
                    ? isDark
                      ? "text-white/50 font-normal text-[15px] py-2.5 hover:text-white/65"
                      : "text-black/40 font-normal text-[15px] py-2.5 hover:text-black/55"
                    : isDark
                    ? "text-white/65 font-medium text-[16px] py-2.5 hover:text-white/80"
                    : "text-black/55 font-medium text-[16px] py-2.5 hover:text-black/70"
                }
              `}
            >
              {line.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
