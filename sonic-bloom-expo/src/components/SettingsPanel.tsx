import { useState } from "react";
import { Moon, Settings, Zap, X, Info } from "lucide-react-native";
import { usePlayer, AudioQuality } from "@/context/PlayerContext";

interface SettingsPanelProps {
  panelType: "sleep" | "quality" | "speed" | "about" | null;
  onClose: () => void;
}

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: "96 kbps", value: "96kbps" },
  { label: "160 kbps", value: "160kbps" },
  { label: "320 kbps", value: "320kbps" },
];

const SLEEP_OPTIONS = [15, 30, 45, 60, 90, 120];
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CROSSFADE_OPTIONS = [0, 3, 5];

export const SettingsPanel = ({ panelType, onClose }: SettingsPanelProps) => {
  const {
    quality,
    setQuality,
    sleepMinutes,
    setSleepTimer,
    cancelSleepTimer,
    playbackSpeed,
    setPlaybackSpeed,
    crossfade,
    setCrossfade,
  } = usePlayer();

  if (!panelType) return null;

  const renderPanel = () => {
    switch (panelType) {
      case "about":
        return (
          <div className="p-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Zap size={24} className="text-primary" />
            </div>
            <h4 className="text-lg font-bold text-foreground mb-1">Sonic Bloom</h4>
            <p className="text-xs text-muted-foreground mb-4">Version 1.0.0</p>
            <p className="text-xs text-muted-foreground">Created by</p>
            <p className="text-sm font-medium text-foreground mb-4">Keshab Sarkar</p>
            <p className="text-xs text-muted-foreground/60">
              A premium music player with synced lyrics, equalizer, and multi-language support.
            </p>
          </div>
        );

      case "sleep":
        return (
          <div className="p-4">
            <h4 className="text-sm font-bold text-foreground mb-3">Sleep Timer</h4>
            <div className="grid grid-cols-3 gap-2">
              {SLEEP_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => setSleepTimer(min)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    sleepMinutes === min
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
            {sleepMinutes !== null && (
              <button
                onClick={cancelSleepTimer}
                className="w-full mt-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
              >
                Cancel Timer
              </button>
            )}
          </div>
        );

      case "quality":
        return (
          <div className="p-4">
            <h4 className="text-sm font-bold text-foreground mb-3">Audio Quality</h4>
            <div className="space-y-1.5">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${
                    quality === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  <span>{opt.label}</span>
                  {quality === opt.value && <CheckIcon />}
                </button>
              ))}
            </div>
          </div>
        );

      case "speed":
        return (
          <div className="p-4">
            <h4 className="text-sm font-bold text-foreground mb-3">Playback Speed</h4>
            <div className="grid grid-cols-3 gap-2">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    playbackSpeed === speed
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (panelType) {
      case "about":
        return "About";
      case "sleep":
        return "Sleep Timer";
      case "quality":
        return "Audio Quality";
      case "speed":
        return "Playback Speed";
      default:
        return "Settings";
    }
  };

  const getIcon = () => {
    switch (panelType) {
      case "about":
        return <Info size={14} />;
      case "sleep":
        return <Moon size={14} />;
      case "quality":
        return <Settings size={14} />;
      case "speed":
        return <span className="text-[10px] font-bold">{playbackSpeed}x</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 z-[101] md:z-50 w-[calc(100vw-1.5rem)] max-w-80 glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            {getIcon()}
          </div>
          <h3 className="text-sm font-bold text-foreground">{getTitle()}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      {renderPanel()}
    </div>
  );
};

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.6666 3.5L5.24998 9.91667L2.33331 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);