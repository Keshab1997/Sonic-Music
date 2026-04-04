
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
 * Split a long lyric section into individual lines at natural break points.
 * Prioritizes punctuation breaks, then falls back to word-boundary splits.
 */
function splitSection(section: string, maxLen: number): string[] {
  if (section.length <= maxLen) return [section];

  // Split on commas, semicolons, danda (।), question marks, exclamation
  const parts = section
    .split(/(?<=[,;?!।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    // Re-combine short parts, keep within maxLen
    const result: string[] = [];
    let buf = "";
    for (const part of parts) {
      const candidate = buf ? `${buf} ${part}` : part;
      if (candidate.length > maxLen && buf) {
        result.push(buf);
        buf = part;
      } else {
        buf = candidate;
      }
    }
    if (buf) result.push(buf);

    // If still single long line, force split at word boundaries
    if (result.length === 1) {
      return forceSplit(result[0], maxLen);
    }
    return result;
  }

  return forceSplit(section, maxLen);
}

/**
 * Force split at word boundaries targeting ~40-55 char lines.
 */
function forceSplit(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(/\s+/);
  const result: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxLen && line) {
      result.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) result.push(line);
  return result;
}

/**
 * Convert plain text lyrics to estimated timed lines.
 * Distributes lines evenly across the track duration.
 *
 * Handles JioSaavn format where lyrics come as a single string
 * with double-spaces as verse separators and no newlines.
 */
export function estimateTimings(
  plainText: string,
  duration: number
): LyricLine[] {
  if (!plainText || duration <= 0) return [];

  // Normalize whitespace
  const normalized = plainText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Try newline split first
  let sections = normalized
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // If single block, split on double-spaces (JioSaavn format)
  if (sections.length <= 1 && plainText.includes("  ")) {
    sections = plainText
      .split(/\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Split each section into individual lines (max ~55 chars)
  const lines: string[] = [];
  for (const section of sections) {
    const split = splitSection(section, 55);
    lines.push(...split);
  }

  if (lines.length === 0) return [];

  const padding = Math.min(2, duration * 0.03);
  const endPadding = Math.min(1, duration * 0.02);
  const usable = Math.max(0, duration - padding - endPadding);
  const interval = usable / lines.length;

  return lines.map((text, i) => ({
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

