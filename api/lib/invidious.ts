/**
 * Shared Invidious instances list
 * Used by both yt-stream and proxy-yt-download API routes
 * These are public Invidious instances that provide YouTube API access
 */
export const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.flokinet.to",
  "https://yt.artemislena.eu",
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
  "https://invidious.protokolla.fi",
  "https://iv.datura.network",
  "https://invidious.perennialte.ch",
  "https://yewtu.be",
  "https://invidious.lunar.icu",
  "https://inv.in.projectsegfau.lt",
];

/**
 * Timeout for each Invidious instance request (ms)
 */
export const INVIDIOUS_REQUEST_TIMEOUT = 5000;

/**
 * Common headers for Invidious API requests
 */
export const INVIDIOUS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};
