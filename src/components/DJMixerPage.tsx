import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipBack, Disc3, ChevronDown, Volume2, VolumeX,
  Sliders, Disc, Music
} from "lucide-react";
import { useDJMixer } from "@/context/DJMixerContext";
import { Track } from "@/data/playlist";

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ---- Deck Component ----
interface DeckProps {
  id: "A" | "B";
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (t: number) => void;
  onVolume: (v: number) => void;
  onEqBass: (v: number) => void;
  onEqMid: (v: number) => void;
  onEqTreble: (v: number) => void;
  onLoadTrack: (t: Track) => void;
  availableTracks: Track[];
}

const Deck = ({
  id, track, isPlaying, progress, duration, volume,
  eqBass, eqMid, eqTreble,
  onPlay, onPause, onSeek, onVolume, onEqBass, onEqMid, onEqTreble,
  onLoadTrack, availableTracks,
}: DeckProps) => {
  const [showTrackList, setShowTrackList] = useState(false);
  const deckColor = id === "A" ? "primary" : "primary";
  const accent = id === "A" ? "from-red-500 to-orange-500" : "from-blue-500 to-cyan-500";
  const accentBg = id === "A" ? "bg-red-500/20 border-red-500/30" : "bg-blue-500/20 border-blue-500/30";
  const accentText = id === "A" ? "text-red-400" : "text-blue-400";
  const accentFill = id === "A" ? "from-red-500 to-orange-400" : "from-blue-500 to-cyan-400";
  const ringColor = id === "A" ? "ring-red-500/50" : "ring-blue-500/50";

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Deck Label */}
      <div className={`text-center font-black text-3xl bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
        DECK {id}
      </div>

      {/* Track Info / Selector */}
      <div className={`relative rounded-xl border ${accentBg} p-3`}>
        {track ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={track.cover}
                alt={track.title}
                className={`w-14 h-14 rounded-lg object-cover ${isPlaying ? "animate-spin" : ""}`}
                style={{ animationDuration: "3s" }}
              />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Disc3 size={24} className={`${accentText} animate-spin`} style={{ animationDuration: "1s" }} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{track.title}</p>
              <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              <p className="text-[10px] text-muted-foreground/60">{track.album}</p>
            </div>
            <button
              onClick={() => setShowTrackList(!showTrackList)}
              className="p-2 rounded-full hover:bg-white/10 text-muted-foreground"
            >
              <ChevronDown size={16} className={showTrackList ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTrackList(true)}
            className="w-full flex flex-col items-center gap-2 py-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Music size={28} />
            <span className="text-xs font-medium">Load Track</span>
          </button>
        )}

        {/* Track List Dropdown */}
        {showTrackList && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto rounded-xl glass-heavy border border-border shadow-2xl">
            {availableTracks.filter(t => t.type === "audio").map((t) => (
              <button
                key={t.id}
                onClick={() => { onLoadTrack(t); setShowTrackList(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
              >
                <img src={t.cover} alt={t.title} className="w-8 h-8 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.artist}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress / Seek */}
      {track && (
        <div className="px-1">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1 tabular-nums">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-1 cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${(progress / (duration || 1)) * 100}%, hsl(var(--muted)) ${(progress / (duration || 1)) * 100}%)`,
            }}
          />
        </div>
      )}

      {/* Play Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => track && onSeek(0)}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        >
          <SkipBack size={18} />
        </button>
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!track}
          className={`p-4 rounded-full bg-gradient-to-r ${accent} text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>
        <button
          onClick={() => track && onSeek(0)}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors rotate-180"
        >
          <SkipBack size={18} />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 px-1">
        <button onClick={() => onVolume(volume === 0 ? 0.8 : 0)} className="text-muted-foreground hover:text-foreground">
          {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range" min={0} max={1} step={0.01} value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="flex-1 h-1 cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
          style={{
            background: `linear-gradient(to right, hsl(var(--foreground)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%)`,
          }}
        />
        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{Math.round(volume * 100)}%</span>
      </div>

      {/* EQ */}
      <div className={`rounded-xl border ${accentBg} p-3 space-y-3`}>
        <div className="flex items-center gap-1.5 mb-1">
          <Sliders size={12} className={accentText} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">EQ</span>
        </div>
        {[
          { label: "BASS", value: eqBass, onChange: onEqBass },
          { label: "MID", value: eqMid, onChange: onEqMid },
          { label: "TREBLE", value: eqTreble, onChange: onEqTreble },
        ].map(({ label, value, onChange }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{value > 0 ? "+" : ""}{value}</span>
            </div>
            <input
              type="range" min={-12} max={12} step={1} value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-1 cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${((value + 12) / 24) * 100}%, hsl(var(--muted)) ${((value + 12) / 24) * 100}%)`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Main DJ Mixer Page ----
export const DJMixerPage = () => {
  const {
    deckA, deckB, crossfader, masterVolume, analyserRef, availableTracks,
    loadTrackA, playA, pauseA, seekA, setVolumeA, setEqBassA, setEqMidA, setEqTrebleA,
    loadTrackB, playB, pauseB, seekB, setVolumeB, setEqBassB, setEqMidB, setEqTrebleB,
    setCrossfader, setMasterVolume,
  } = useDJMixer();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 32;
      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;

      for (let i = 0; i < barCount; i++) {
        const binStart = Math.floor((i / barCount) * bufferLength);
        const binEnd = Math.floor(((i + 1) / barCount) * bufferLength);
        let sum = 0;
        for (let j = binStart; j < binEnd; j++) sum += dataArray[j];
        const avg = sum / (binEnd - binStart || 1);
        const barHeight = (avg / 255) * height * 0.9;

        const x = i * (barWidth + gap) + gap / 2;
        const y = height - barHeight;

        const hue = (i / barCount) * 60 + 280; // purple to pink range
        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, `hsl(${hue}, 80%, 60%)`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 60%, 0.2)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [analyserRef, deckA.isPlaying, deckB.isPlaying]);

  const crossfaderLabel = crossfader < 0.35 ? "A" : crossfader > 0.65 ? "B" : "CENTER";

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-80px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 border-b border-border">
        <Disc size={20} className="text-primary" />
        <h1 className="text-lg font-black text-foreground tracking-tight">
          <span className="bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            DJ MIXER
          </span>
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 md:p-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6">
        {/* Deck A */}
        <Deck
          id="A"
          track={deckA.track}
          isPlaying={deckA.isPlaying}
          progress={deckA.progress}
          duration={deckA.duration}
          volume={deckA.volume}
          eqBass={deckA.eqBass}
          eqMid={deckA.eqMid}
          eqTreble={deckA.eqTreble}
          onPlay={playA}
          onPause={pauseA}
          onSeek={seekA}
          onVolume={setVolumeA}
          onEqBass={setEqBassA}
          onEqMid={setEqMidA}
          onEqTreble={setEqTrebleA}
          onLoadTrack={loadTrackA}
          availableTracks={availableTracks}
        />

        {/* Center Mixer */}
        <div className="flex flex-col items-center gap-4 min-w-[200px] md:min-w-[240px]">
          {/* Visualizer */}
          <div className="w-full rounded-xl bg-card border border-border overflow-hidden">
            <canvas ref={canvasRef} width={240} height={80} className="w-full h-20" />
          </div>

          {/* Master Volume */}
          <div className="w-full rounded-xl glass border border-border p-4 space-y-2">
            <div className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Master Volume
            </div>
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-muted-foreground" />
              <input
                type="range" min={0} max={1} step={0.01} value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="flex-1 h-1.5 cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${masterVolume * 100}%, hsl(var(--muted)) ${masterVolume * 100}%)`,
                }}
              />
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{Math.round(masterVolume * 100)}%</span>
            </div>
          </div>

          {/* Crossfader */}
          <div className="w-full rounded-xl glass border border-border p-4 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-red-400">A</span>
              <span className="text-muted-foreground">Crossfader</span>
              <span className="text-blue-400">B</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={crossfader}
                onChange={(e) => setCrossfader(Number(e.target.value))}
                className="w-full h-2 cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 70%, 50%) 0%, 
                    hsl(280, 70%, 50%) 50%, 
                    hsl(200, 70%, 50%) 100%)`,
                }}
              />
            </div>
            <div className="text-center">
              <span className={`text-xs font-bold ${
                crossfaderLabel === "A" ? "text-red-400" :
                crossfaderLabel === "B" ? "text-blue-400" : "text-purple-400"
              }`}>
                {crossfaderLabel}
              </span>
            </div>
          </div>

          {/* Deck active indicators */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${deckA.isPlaying ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50" : "bg-muted"}`} />
              <span className="text-[9px] text-muted-foreground">A</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${deckB.isPlaying ? "bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50" : "bg-muted"}`} />
              <span className="text-[9px] text-muted-foreground">B</span>
            </div>
          </div>
        </div>

        {/* Deck B */}
        <Deck
          id="B"
          track={deckB.track}
          isPlaying={deckB.isPlaying}
          progress={deckB.progress}
          duration={deckB.duration}
          volume={deckB.volume}
          eqBass={deckB.eqBass}
          eqMid={deckB.eqMid}
          eqTreble={deckB.eqTreble}
          onPlay={playB}
          onPause={pauseB}
          onSeek={seekB}
          onVolume={setVolumeB}
          onEqBass={setEqBassB}
          onEqMid={setEqMidB}
          onEqTreble={setEqTrebleB}
          onLoadTrack={loadTrackB}
          availableTracks={availableTracks}
        />
      </div>
    </div>
  );
};
