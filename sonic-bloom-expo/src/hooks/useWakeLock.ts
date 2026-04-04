
import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to request a Wake Lock to prevent the device from sleeping.
 * This is essential for background audio playback on mobile devices.
 * When the screen locks, the browser may suspend audio playback.
 * A wake lock helps keep the audio session alive.
 */
export function useWakeLock(enabled = true) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const requestWakeLock = useCallback(async () => {
    if (!enabledRef.current) return;
    if (!("wakeLock" in navigator)) return;

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;

      sentinel.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch (err) {
      // Wake lock request failed - this is common on some browsers
      console.warn("Wake lock request failed:", err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Request wake lock when enabled changes to true
  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [enabled, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when visibility changes (e.g., user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabledRef.current && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock, hasWakeLock: wakeLockRef.current !== null };
}
