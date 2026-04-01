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

const variantStyles = {
  dark: {
    active: "text-white font-bold",
    past: "text-white/30",
    upcoming: "text-white/50",
    hover: "hover:text-white/80",
  },
  light: {
    active: "text-foreground font-bold lyric-active",
    past: "text-muted-foreground/40",
    upcoming: "text-muted-foreground/60",
    hover: "hover:text-foreground/80",
  },
};

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
  const styles = variantStyles[variant];

  // Check if any line contains Devanagari
  const hasDevanagariLyrics = useMemo(
    () => lines.some((l) => hasDevanagari(l.text)),
    [lines]
  );

  // Transliterated lines
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

    activeRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
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

  const isActiveToggle = showRoman && hasDevanagariLyrics;

  const toggleBtnBase = variant === "dark"
    ? `border transition-all ${
        isActiveToggle
          ? "text-white bg-white/30 border-white/40 shadow-md"
          : "text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border-white/15"
      }`
    : `border transition-all ${
        isActiveToggle
          ? "text-foreground bg-primary/15 border-primary/30 shadow-md"
          : "text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border-border/50"
      }`;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto scrollbar-hide ${className}`}
    >
      {/* Transliteration toggle — sticky at top of lyrics */}
      <div
        className="sticky top-0 z-10 flex justify-end px-3 pt-2 pb-1 pointer-events-none"
        style={
          variant === "dark"
            ? { background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 60%, transparent)" }
            : { background: "linear-gradient(to bottom, hsl(var(--background) / 0.9) 60%, transparent)" }
        }
      >
        <button
          onClick={() => hasDevanagariLyrics && setShowRoman(!showRoman)}
          disabled={!hasDevanagariLyrics}
          className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-sm ${toggleBtnBase} ${!hasDevanagariLyrics ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          title={
            hasDevanagariLyrics
              ? showRoman
                ? "Show original Hindi script"
                : "Show Roman transliteration"
              : "No Devanagari text to transliterate"
          }
        >
          <Languages size={13} />
          {hasDevanagariLyrics
            ? showRoman
              ? "हिन्दी"
              : "ABC"
            : "ABC"}
        </button>
      </div>

      <div className="py-[35%]">
        {displayLines.map((line, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <button
              key={`${line.time}-${i}`}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek?.(line.time)}
              disabled={!onSeek}
              className={`block w-full text-left px-4 py-2.5 transition-all duration-500 ease-out
                ${isActive ? styles.active : isPast ? styles.past : styles.upcoming}
                ${isActive ? "text-lg scale-[1.02] opacity-100" : "text-base opacity-70"}
                ${onSeek ? `cursor-pointer ${styles.hover}` : "cursor-default"}
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
