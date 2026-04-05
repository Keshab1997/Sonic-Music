
import { useState, useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, Disc3, ChevronDown, Volume2, VolumeX,
  Disc, Music
} from "lucide-react";
import { useDJMixer } from "@/context/DJMixerContext";
import { Track } from "@/data/playlist";

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ---- Vertical Fader Component ----
const VerticalFader = ({
  label, value, min, max, step, onChange, color, unit, showCenter,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
  unit?: string;
  showCenter?: boolean;
}) => {
  const trackHeight = 160;
  const fillPercent = ((value - min) / (max - min)) * 100;
  const centerPercent = showCenter ? ((0 - min) / (max - min)) * 100 : 50;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="relative flex items-center" style={{ height: `${trackHeight}px` }}>
        {/* Track background */}
        <div
          className="relative w-2 rounded-full overflow-hidden"
          style={{ height: `${trackHeight}px`, background: "hsl(var(--muted))" }}
        >
          {/* Center marker */}
          {showCenter && (
            <div
              className="absolute left-0 right-0 h-[2px] bg-foreground/40 z-10"
              style={{ top: `${100 - centerPercent}%` }}
            />
          )}
          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-75"
            style={{
              height: `${fillPercent}%`,
              background: color,
            }}
          />
        </div>
        {/* Invisible range input on top */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{
            writingMode: "vertical-lr",
            direction: "rtl",
            WebkitAppearance: "slider-vertical",
            width: `${trackHeight}px`,
            height: "8px",
            transform: "rotate(0deg)",
          }}
          // Fallback: use horizontal slider rotated via CSS
        />
        {/* Actual visible slider thumb overlay */}
        <div
          className="absolute w-8 h-4 rounded-md bg-foreground border border-border shadow-md pointer-events-none"
          style={{
            bottom: `calc(${fillPercent}% - 8px)`,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
        {showCenter ? (value > 0 ? `+${value}` : value) : unit ? `${Math.round(value * 100)}${unit}` : value}
      </span>
    </div>
  );
};

// ---- Proper Vertical Slider (HTML range rotated) ----
const VerticalSlider = ({
  value, min, max, step, onChange, color, height = 150,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
  height?: number;
}) => {
  const fillPercent = ((value - min) / (max - min)) * 100;
  const centerPercent = ((0 - min) / (max - min)) * 100;

  return (
    <div className="relative flex justify-center" style={{ width: "32px", height: `${height}px` }}>
      {/* Track */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-1.5 rounded-full overflow-hidden"
        style={{ height: `${height}px`, background: "hsl(var(--muted) / 0.5)" }}
      >
        {/* Center line for EQ */}
        {min < 0 && (
          <div
            className="absolute left-0 right-0 h-[2px] bg-white/20 z-[1]"
            style={{ top: `${100 - centerPercent}%` }}
          />
        )}
        {/* Active fill */}
        <div
          className="absolute left-0 right-0 rounded-full transition-all duration-75"
          style={{
            height: `${fillPercent}%`,
            bottom: 0,
            background: color,
          }}
        />
      </div>
      {/* Range input rotated */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute z-10 cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border
          [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20
          [&::-webkit-slider-runnable-track]:appearance-none
          [&::-webkit-slider-runnable-track]:bg-transparent"
        style={{
          width: `${height}px`,
          height: "32px",
          transform: "rotate(-90deg) translateX(-50%)",
          transformOrigin: "left center",
          position: "absolute",
          top: "50%",
          left: "50%",
        }}
      />
    </div>
  );
};

// ---- Track Selector ----
const TrackSelector = ({
  track, isPlaying, onLoadTrack, availableTracks, accent, accentText,
}: {
  track: Track | null;
  isPlaying: boolean;
  onLoadTrack: (t: Track) => void;
  availableTracks: Track[];
  accent: string;
  accentText: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {track ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
        >
          <div className="relative flex-shrink-0">
            <img
              src={track.cover}
              alt={track.title}
              className={`w-10 h-10 rounded-lg object-cover ${isPlaying ? "animate-spin" : ""}`}
              style={{ animationDuration: "3s" }}
            />
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                <Disc3 size={16} className={`${accentText} animate-spin`} style={{ animationDuration: "1s" }} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-foreground truncate leading-tight">{track.title}</p>
            <p className="text-[9px] text-muted-foreground truncate">{track.artist}</p>
          </div>
          <ChevronDown size={14} className={`text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Music size={22} />
          <span className="text-[10px] font-medium">Load Track</span>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-52 overflow-y-auto rounded-xl glass-heavy border border-border shadow-2xl">
            {availableTracks.filter(t => t.type === "audio").map((t) => (
              <button
                key={t.id}
                onClick={() => { onLoadTrack(t); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left"
              >
                <img src={t.cover} alt={t.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.artist}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
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

      const barCount = 40;
      const barWidth = (width / barCount) * 0.75;
      const gap = (width / barCount) * 0.25;

      for (let i = 0; i < barCount; i++) {
        const binStart = Math.floor((i / barCount) * bufferLength);
        const binEnd = Math.floor(((i + 1) / barCount) * bufferLength);
        let sum = 0;
        for (let j = binStart; j < binEnd; j++) sum += dataArray[j];
        const avg = sum / (binEnd - binStart || 1);
        const barHeight = (avg / 255) * height * 0.95;

        const x = i * (barWidth + gap) + gap / 2;
        const y = height - barHeight;

        // Green-yellow-red gradient based on height
        const ratio = avg / 255;
        const hue = ratio < 0.5 ? 120 : 120 - (ratio - 0.5) * 240;
        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, `hsl(${hue}, 90%, 55%)`);
        gradient.addColorStop(0.6, `hsl(${hue}, 80%, 45%)`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 45%, 0.3)`);
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
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-80px)] overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-2.5 px-4 border-b border-border flex-shrink-0">
        <Disc size={18} className="text-primary" />
        <h1 className="text-base font-black tracking-tight">
          <span className="bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            DJ MIXER
          </span>
        </h1>
      </div>

      {/* Mixer Board */}
      <div className="flex-1 flex flex-col min-h-0 p-2 md:p-3 gap-2 md:gap-3">
        {/* Top Row: Track Info + Visualizer */}
        <div className="flex-shrink-0 grid grid-cols-[1fr_2fr_1fr] gap-2 md:gap-3 items-center">
          {/* Deck A Track */}
          <div className="rounded-xl glass border border-border p-2">
            <TrackSelector
              track={deckA.track}
              isPlaying={deckA.isPlaying}
              onLoadTrack={loadTrackA}
              availableTracks={availableTracks}
              accent="from-red-500 to-orange-500"
              accentText="text-red-400"
            />
            {deckA.track && (
              <div className="mt-1.5 px-1">
                <div className="flex justify-between text-[9px] text-muted-foreground tabular-nums">
                  <span>{formatTime(deckA.progress)}</span>
                  <span>{formatTime(deckA.duration)}</span>
                </div>
                <input
                  type="range" min={0} max={deckA.duration || 1} step={0.1} value={deckA.progress}
                  onChange={(e) => seekA(Number(e.target.value))}
                  className="w-full h-1 cursor-pointer appearance-none
                    [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
                  style={{
                    background: `linear-gradient(to right, hsl(0, 70%, 50%) ${(deckA.progress / (deckA.duration || 1)) * 100}%, hsl(var(--muted)) ${(deckA.progress / (deckA.duration || 1)) * 100}%)`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Visualizer */}
          <div className="rounded-xl glass border border-border overflow-hidden">
            <canvas ref={canvasRef} width={480} height={60} className="w-full h-14 md:h-16" />
          </div>

          {/* Deck B Track */}
          <div className="rounded-xl glass border border-border p-2">
            <TrackSelector
              track={deckB.track}
              isPlaying={deckB.isPlaying}
              onLoadTrack={loadTrackB}
              availableTracks={availableTracks}
              accent="from-blue-500 to-cyan-500"
              accentText="text-blue-400"
            />
            {deckB.track && (
              <div className="mt-1.5 px-1">
                <div className="flex justify-between text-[9px] text-muted-foreground tabular-nums">
                  <span>{formatTime(deckB.progress)}</span>
                  <span>{formatTime(deckB.duration)}</span>
                </div>
                <input
                  type="range" min={0} max={deckB.duration || 1} step={0.1} value={deckB.progress}
                  onChange={(e) => seekB(Number(e.target.value))}
                  className="w-full h-1 cursor-pointer appearance-none
                    [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
                  style={{
                    background: `linear-gradient(to right, hsl(200, 70%, 50%) ${(deckB.progress / (deckB.duration || 1)) * 100}%, hsl(var(--muted)) ${(deckB.progress / (deckB.duration || 1)) * 100}%)`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Mixer Board */}
        <div className="flex-1 min-h-0 rounded-xl glass border border-border overflow-hidden">
          <div className="h-full grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-0">
            {/* ===== DECK A CHANNEL ===== */}
            <div className="flex flex-col items-center justify-between py-3 px-2 md:px-4 border-r border-border/50">
              {/* Play controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deckA.track && seekA(0)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={deckA.isPlaying ? pauseA : playA}
                  disabled={!deckA.track}
                  className={`p-3 rounded-full text-white shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    deckA.isPlaying
                      ? "bg-red-500 shadow-red-500/30"
                      : "bg-gradient-to-br from-red-500 to-orange-500"
                  }`}
                >
                  {deckA.isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <button
                  onClick={() => deckA.track && seekA(0)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors rotate-180"
                >
                  <SkipBack size={14} />
                </button>
              </div>

              {/* EQ + Volume faders */}
              <div className="flex items-end gap-3 md:gap-4">
                <VerticalSlider
                  value={deckA.eqBass} min={-12} max={12} step={1}
                  onChange={setEqBassA} color="hsl(0, 70%, 50%)"
                />
                <VerticalSlider
                  value={deckA.eqMid} min={-12} max={12} step={1}
                  onChange={setEqMidA} color="hsl(40, 80%, 50%)"
                />
                <VerticalSlider
                  value={deckA.eqTreble} min={-12} max={12} step={1}
                  onChange={setEqTrebleA} color="hsl(200, 70%, 50%)"
                />
                <div className="w-px h-[120px] bg-border/50 mx-1" />
                <VerticalSlider
                  value={deckA.volume} min={0} max={1} step={0.01}
                  onChange={setVolumeA} color="hsl(var(--primary))"
                />
              </div>

              {/* Labels */}
              <div className="flex items-center gap-3 md:gap-4">
                <span className="text-[8px] font-bold text-red-400 w-8 text-center">BASS</span>
                <span className="text-[8px] font-bold text-amber-400 w-8 text-center">MID</span>
                <span className="text-[8px] font-bold text-blue-400 w-8 text-center">HIGH</span>
                <div className="w-px mx-1" />
                <span className="text-[8px] font-bold text-primary w-8 text-center">VOL</span>
              </div>
            </div>

            {/* ===== CENTER DIVIDER ===== */}
            <div className="flex flex-col items-center justify-between py-3 px-3 md:px-5 bg-black/20">
              {/* Channel indicators */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${deckA.isPlaying ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50" : "bg-muted"}`} />
                  <span className="text-[8px] font-bold text-muted-foreground">A</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${deckB.isPlaying ? "bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50" : "bg-muted"}`} />
                  <span className="text-[8px] font-bold text-muted-foreground">B</span>
                </div>
              </div>

              {/* Master Volume */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">MASTER</span>
                <VerticalSlider
                  value={masterVolume} min={0} max={1} step={0.01}
                  onChange={setMasterVolume} color="hsl(var(--primary))"
                  height={120}
                />
                <span className="text-[10px] font-bold text-primary tabular-nums">{Math.round(masterVolume * 100)}%</span>
              </div>

              {/* Master mute */}
              <button
                onClick={() => setMasterVolume(masterVolume === 0 ? 0.8 : 0)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              >
                {masterVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* ===== DECK B CHANNEL ===== */}
            <div className="flex flex-col items-center justify-between py-3 px-2 md:px-4 border-l border-border/50">
              {/* Play controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deckB.track && seekB(0)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={deckB.isPlaying ? pauseB : playB}
                  disabled={!deckB.track}
                  className={`p-3 rounded-full text-white shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    deckB.isPlaying
                      ? "bg-blue-500 shadow-blue-500/30"
                      : "bg-gradient-to-br from-blue-500 to-cyan-500"
                  }`}
                >
                  {deckB.isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <button
                  onClick={() => deckB.track && seekB(0)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors rotate-180"
                >
                  <SkipBack size={14} />
                </button>
              </div>

              {/* EQ + Volume faders */}
              <div className="flex items-end gap-3 md:gap-4">
                <VerticalSlider
                  value={deckB.eqBass} min={-12} max={12} step={1}
                  onChange={setEqBassB} color="hsl(0, 70%, 50%)"
                />
                <VerticalSlider
                  value={deckB.eqMid} min={-12} max={12} step={1}
                  onChange={setEqMidB} color="hsl(40, 80%, 50%)"
                />
                <VerticalSlider
                  value={deckB.eqTreble} min={-12} max={12} step={1}
                  onChange={setEqTrebleB} color="hsl(200, 70%, 50%)"
                />
                <div className="w-px h-[120px] bg-border/50 mx-1" />
                <VerticalSlider
                  value={deckB.volume} min={0} max={1} step={0.01}
                  onChange={setVolumeB} color="hsl(var(--primary))"
                />
              </div>

              {/* Labels */}
              <div className="flex items-center gap-3 md:gap-4">
                <span className="text-[8px] font-bold text-red-400 w-8 text-center">BASS</span>
                <span className="text-[8px] font-bold text-amber-400 w-8 text-center">MID</span>
                <span className="text-[8px] font-bold text-blue-400 w-8 text-center">HIGH</span>
                <div className="w-px mx-1" />
                <span className="text-[8px] font-bold text-primary w-8 text-center">VOL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Crossfader Bar */}
        <div className="flex-shrink-0 rounded-xl glass border border-border p-2.5 md:p-3">
          <div className="flex items-center gap-3 md:gap-4 max-w-2xl mx-auto">
            <span className="text-sm font-black text-red-400 w-6 text-center">A</span>
            <div className="flex-1 relative">
              <input
                type="range" min={0} max={1} step={0.01} value={crossfader}
                onChange={(e) => setCrossfader(Number(e.target.value))}
                className="w-full h-3 cursor-pointer appearance-none
                  [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:bg-foreground
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-border
                  [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:h-2"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 70%, 50%) 0%, 
                    hsl(280, 70%, 50%) 50%, 
                    hsl(200, 70%, 50%) 100%)`,
                }}
              />
            </div>
            <span className="text-sm font-black text-blue-400 w-6 text-center">B</span>
            <span className={`text-[10px] font-bold min-w-[50px] text-center ${
              crossfaderLabel === "A" ? "text-red-400" :
              crossfaderLabel === "B" ? "text-blue-400" : "text-purple-400"
            }`}>
              {crossfaderLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

