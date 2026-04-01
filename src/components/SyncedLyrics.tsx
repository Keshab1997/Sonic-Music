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
  const isDark = variant === "dark";

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
    scrollTimeout.current = setTimeout(() => { userScrolling.current = false; }, 3000);
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

  const isActiveToggle = showRoman && hasDevanagariLyrics;

  return (
    <div className="relative h-full flex flex-col">
      {/* Toggle button — fixed top-right, does not scroll */}
      <div className="flex justify-end px-3 pt-1 pb-1 flex-shrink-0">
        <button
          onClick={() => hasDevanagariLyrics && setShowRoman(!showRoman)}
          disabled={!hasDevanagariLyrics}
          className={`
            flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[11px] font-semibold
            transition-all duration-200 select-none
            ${
              isDark
                ? isActiveToggle
                  ? "bg-white text-black shadow-sm"
                  : hasDevanagariLyrics
                  ? "bg-white/15 text-white/80 hover:bg-white/25 hover:text-white border border-white/10"
                  : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
                : isActiveToggle
                ? "bg-foreground text-background shadow-sm"
                : hasDevanagariLyrics
                ? "bg-foreground/10 text-foreground/60 hover:bg-foreground/15 hover:text-foreground border border-foreground/10"
                : "bg-foreground/5 text-foreground/25 border border-foreground/5 cursor-not-allowed"
            }
          `}
          title={hasDevanagariLyrics ? (showRoman ? "Show original script" : "Transliterate to Roman") : "No Devanagari text"}
        >
          <Languages size={12} strokeWidth={2.5} />
          {hasDevanagariLyrics ? (showRoman ? "हिन्दी" : "ABC") : "ABC"}
        </button>
      </div>

      {/* Scrollable lyrics area */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Top padding for centering first line */}
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
                block w-full text-left px-5
                transition-all duration-300 ease-out
                ${onSeek ? "cursor-pointer" : "cursor-default"}
                ${
                  isActive
                    ? isDark
                      ? "text-white font-extrabold text-2xl md:text-3xl leading-snug py-4 my-2 opacity-100"
                      : "text-black font-extrabold text-2xl md:text-3xl leading-snug py-4 my-2 opacity-100"
                    : isPast
                    ? isDark
                      ? "text-white/40 font-normal text-base md:text-lg py-2 my-0.5 opacity-60 hover:text-white/60 hover:opacity-80"
                      : "text-foreground/35 font-normal text-base md:text-lg py-2 my-0.5 opacity-60 hover:text-foreground/55 hover:opacity-80"
                    : isDark
                    ? "text-white/55 font-medium text-base md:text-lg py-2 my-0.5 opacity-75 hover:text-white/75 hover:opacity-90"
                    : "text-foreground/50 font-medium text-base md:text-lg py-2 my-0.5 opacity-75 hover:text-foreground/70 hover:opacity-90"
                }
              `}
            >
              {line.text}
            </button>
          );
        })}

        {/* Bottom padding for centering last line */}
        <div className="h-[40%]" />
      </div>
    </div>
  );
}
