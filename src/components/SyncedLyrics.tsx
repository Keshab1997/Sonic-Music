
import { useRef, useEffect, useCallback, useState, useMemo, memo } from "react";
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
  synced?: boolean;
}

function findActiveLine(lines: LyricLine[], time: number): number {
  if (lines.length === 0) return -1;
  let lo = 0, hi = lines.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) { result = mid; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  return result;
}

function SyncedLyricsCore({
  lines, currentTime, isPlaying, onSeek, className = "", variant = "light", synced = false,
}: SyncedLyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const lastScrollTime = useRef(0);
  const userScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [showRoman, setShowRoman] = useState(false);

  const activeIdx = findActiveLine(lines, currentTime);
  const isDark = variant === "dark";
  const hasDevanagariLyrics = useMemo(() => lines.some((l) => hasDevanagari(l.text)), [lines]);

  const displayLines = useMemo(() => {
    if (!showRoman || !hasDevanagariLyrics) return lines;
    return lines.map((l) => ({ ...l, text: hasDevanagari(l.text) ? transliterate(l.text) : l.text }));
  }, [lines, showRoman, hasDevanagariLyrics]);

  useEffect(() => {
    if (!activeRef.current || !containerRef.current || userScrolling.current) return;
    const now = Date.now();
    if (now - lastScrollTime.current < 400) return;
    lastScrollTime.current = now;
    activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  const handleScroll = useCallback(() => {
    userScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => { userScrolling.current = false; }, 3000);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => { el.removeEventListener("scroll", handleScroll); if (scrollTimeout.current) clearTimeout(scrollTimeout.current); };
  }, [handleScroll]);

  if (lines.length === 0) return null;

  const isActiveToggle = showRoman && hasDevanagariLyrics;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header row: label on left, toggle on right — same line */}
      <div className="flex items-center justify-between w-full px-1 pb-2 flex-shrink-0">
        <span className={`text-[10px] uppercase tracking-widest font-medium ${isDark ? "text-white/40" : "text-muted-foreground/60"}`}>
          {synced ? "Synced Lyrics" : "Lyrics"}
        </span>
        <button
          onClick={() => hasDevanagariLyrics && setShowRoman(!showRoman)}
          disabled={!hasDevanagariLyrics}
          className={`
            flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[11px] font-semibold
            transition-all duration-200 select-none
            ${isDark
              ? isActiveToggle
                ? "bg-white text-black shadow-sm"
                : hasDevanagariLyrics
                  ? "bg-white/15 text-white/70 hover:bg-white/25 hover:text-white border border-white/10"
                  : "bg-white/5 text-white/25 border border-white/5 cursor-not-allowed opacity-40"
              : isActiveToggle
                ? "bg-foreground text-background shadow-sm"
                : hasDevanagariLyrics
                  ? "bg-foreground/10 text-foreground/60 hover:bg-foreground/15 hover:text-foreground border border-foreground/10"
                  : "bg-foreground/5 text-foreground/25 border border-foreground/5 cursor-not-allowed opacity-40"
            }
          `}
        >
          <Languages size={12} strokeWidth={2.5} />
          {hasDevanagariLyrics ? (showRoman ? "हिन्दी" : "ABC") : "ABC"}
        </button>
      </div>

      {/* Scrollable lyrics */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-10">
        <div className="h-[30%]" />
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
                block w-full text-left px-4
                transition-all duration-300 ease-out
                ${onSeek ? "cursor-pointer" : "cursor-default"}
                ${isActive
                  ? isDark
                    ? "text-white font-extrabold text-2xl md:text-3xl leading-snug py-4 my-2 opacity-100"
                    : "text-foreground font-extrabold text-2xl md:text-3xl leading-snug py-4 my-2 opacity-100"
                  : isPast
                    ? isDark
                      ? "text-white/40 text-[15px] md:text-base py-2 my-0.5 opacity-50 hover:opacity-70 hover:text-white/55"
                      : "text-foreground/35 text-[15px] md:text-base py-2 my-0.5 opacity-50 hover:opacity-70 hover:text-foreground/50"
                    : isDark
                      ? "text-white/55 text-[16px] md:text-lg py-2 my-0.5 opacity-65 hover:opacity-85 hover:text-white/70"
                      : "text-foreground/50 text-[16px] md:text-lg py-2 my-0.5 opacity-65 hover:opacity-85 hover:text-foreground/65"
                }
              `}
            >
              {line.text}
            </button>
          );
        })}
        <div className="h-[40%]" />
      </div>
    </div>
  );
}

export const SyncedLyrics = memo(SyncedLyricsCore);

