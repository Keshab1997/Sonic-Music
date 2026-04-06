/**
 * Application-wide constants
 */

// Audio/Playback
export const DEFAULT_VOLUME = 0.7;
export const DEFAULT_PLAYBACK_SPEED = 1.0;
export const DEFAULT_CROSSFADE_SECONDS = 3;
export const CROSSFADE_OPTIONS = [0, 3, 5]; // seconds
export const MIN_AUDIO_FILE_SIZE = 100000; // bytes (100KB)
export const SILENT_AUDIO_VOLUME = 0.001;

// EQ
export const EQ_BASS_FREQUENCY = 320; // Hz
export const EQ_MID_FREQUENCY = 1000; // Hz
export const EQ_TREBLE_FREQUENCY = 3200; // Hz
export const EQ_MID_Q_VALUE = 1;
export const EQ_MIN_GAIN = -12; // dB
export const EQ_MAX_GAIN = 12; // dB

// Audio Context
export const ANALYSER_FFT_SIZE = 256;

// Time Update
export const TIME_UPDATE_INTERVAL_MS = 800;

// Crossfade
export const CROSSFADE_INTERVAL_MS = 250;
export const CROSSFADE_STEPS_PER_SECOND = 4;

// Sleep Timer
export const SLEEP_TIMER_OPTIONS = [15, 30, 45, 60, 90, 120]; // minutes
export const SLEEP_TIMER_MS_PER_MINUTE = 60000;

// Quality
export const DEFAULT_AUDIO_QUALITY = "160kbps";
export const QUALITY_OPTIONS = [
  { label: "96 kbps", value: "96kbps" as const },
  { label: "160 kbps", value: "160kbps" as const },
  { label: "320 kbps", value: "320kbps" as const },
];

// Playback Speed
export const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const MIN_PLAYBACK_SPEED = 0.5;
export const MAX_PLAYBACK_SPEED = 2.0;

// Preload
export const PRELOAD_NEXT_TRACK_DELAY_MS = 200;
export const PLAYBACK_START_DELAY_MS = 300;
export const PLAYBACK_SHORT_DELAY_MS = 100;
export const PLAYBACK_MEDIUM_DELAY_MS = 150;

// LocalStorage Keys
export const STORAGE_KEY_QUALITY = "sonic_quality";
export const STORAGE_KEY_EQ = "sonic_eq";
export const STORAGE_KEY_QUEUE = "sonic_queue";

// IndexedDB
export const DB_NAME = "SonicBloomDownloads";
export const DB_VERSION = 1;
export const STORE_NAME = "tracks";
// Aliases for backward compatibility
export const IDB_NAME = DB_NAME;
export const IDB_VERSION = DB_VERSION;
export const IDB_STORE_NAME = STORE_NAME;

// Download
export const DOWNLOAD_TIMEOUT_MS = 120000; // 2 minutes
export const DOWNLOAD_STAGGER_DELAY_MS = 500; // ms between batch downloads
export const DOWNLOAD_PROGRESS_CLEAR_MS = 3000;

// UI
export const TOAST_DURATION_MS = 3000;
export const CONFIRM_CLEAR_TIMEOUT_MS = 5000;
export const PLAYLIST_SAVE_FEEDBACK_MS = 2000;
export const SONG_MENU_STAGGER_MS = 200;

// Search
export const SEARCH_DEBOUNCE_MS = 450;
export const MUSIC_SEARCH_DEBOUNCE_MS = 400;

// Cache
export const MAX_CACHE_SIZE = 200;
export const STREAM_CACHE_TTL_MS = 3600000; // 1 hour
export const SEARCH_CACHE_TTL_MS = 300000; // 5 minutes
export const SECTION_CACHE_TTL_MS = 600000; // 10 minutes

// Invidious API
export const INVIDIOUS_REQUEST_TIMEOUT_MS = 5000;
export const INVIDIOUS_BATCH_SIZE = 4;

// Volume Wheel
export const VOLUME_WHEEL_STEP = 0.05;
export const VOLUME_WHEEL_DEBOUNCE_MS = 50;

// Seek Wheel
export const SEEK_WHEEL_STEP_SECONDS = 5;
