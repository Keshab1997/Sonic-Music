export interface LyricLine {
  time: number; // seconds
  text: string;
}

const LRC_LINE_RE = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)$/;

/**
 * Parse LRC format lyrics into timed lines.
 * Supports: [mm:ss.xx] lyric text
 */
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const match = trimmed.match(LRC_LINE_RE);
    if (!match) continue;
    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = match[4].trim();
    if (text) {
      lines.push({ time, text });
    }
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

/**
 * Check if lyrics are in LRC format.
 */
export function isLRCFormat(text: string): boolean {
  return /^\[\d{2}:\d{2}/.test(text.trim());
}

/**
 * Convert plain text lyrics to estimated timed lines.
 * Distributes lines evenly across the track duration.
 * Skips empty lines and uses a small padding at start/end.
 */
export function estimateTimings(
  plainText: string,
  duration: number
): LyricLine[] {
  const rawLines = plainText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) return [];

  const padding = Math.min(2, duration * 0.03); // 3% or 2s padding at start
  const endPadding = Math.min(1, duration * 0.02);
  const usable = Math.max(0, duration - padding - endPadding);
  const interval = usable / rawLines.length;

  return rawLines.map((text, i) => ({
    time: padding + i * interval,
    text,
  }));
}

/**
 * Parse lyrics string — handles both LRC and plain text.
 * For plain text, `duration` is required to estimate timings.
 */
export function parseLyrics(
  text: string,
  duration: number
): LyricLine[] {
  if (isLRCFormat(text)) {
    return parseLRC(text);
  }
  return estimateTimings(text, duration);
}
