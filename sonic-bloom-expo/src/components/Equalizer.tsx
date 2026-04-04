
import { useState, useCallback, useRef, useEffect } from "react";
import { Sliders, X } from "lucide-react-native";
import { usePlayer } from "@/context/PlayerContext";

interface EqPreset {
  name: string;
  bass: number;
  mid: number;
  treble: number;
}

const presets: EqPreset[] = [
  { name: "Flat", bass: 0, mid: 0, treble: 0 },
  { name: "Bass Boost", bass: 6, mid: 0, treble: -2 },
  { name: "Rock", bass: 4, mid: -1, treble: 3 },
  { name: "Pop", bass: 1, mid: 3, treble: 2 },
  { name: "Classical", bass: 0, mid: 0, treble: 4 },
  { name: "Jazz", bass: 3, mid: 2, treble: 1 },
  { name: "Electronic", bass: 5, mid: -2, treble: 4 },
  { name: "Vocal", bass: -2, mid: 4, treble: 2 },
];

interface EqualizerProps {
  onClose: () => void;
}

export const Equalizer = ({ onClose }: EqualizerProps) => {
  const { analyserRef, eqBass, eqMid, eqTreble, setEqBass, setEqMid, setEqTreble, isPlaying } = usePlayer();
  const [activePreset, setActivePreset] = useState(() => {
    const match = presets.find((p) => p.bass === eqBass && p.mid === eqMid && p.treble === eqTreble);
    return match ? match.name : "Custom";
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const applyPreset = useCallback((preset: EqPreset) => {
    setActivePreset(preset.name);
    setEqBass(preset.bass);
    setEqMid(preset.mid);
    setEqTreble(preset.treble);
  }, [setEqBass, setEqMid, setEqTreble]);

  const handleBassChange = useCallback((v: number) => {
    setEqBass(v);
    setActivePreset("Custom");
  }, [setEqBass]);

  const handleMidChange = useCallback((v: number) => {
    setEqMid(v);
    setActivePreset("Custom");
  }, [setEqMid]);

  const handleTrebleChange = useCallback((v: number) => {
    setEqTreble(v);
    setActivePreset("Custom");
  }, [setEqTreble]);

  // Analyser-driven canvas visualizer
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

      const barCount = 16;
      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency bin range
        const binStart = Math.floor((i / barCount) * bufferLength);
        const binEnd = Math.floor(((i + 1) / barCount) * bufferLength);
        let sum = 0;
        for (let j = binStart; j < binEnd; j++) {
          sum += dataArray[j];
        }
        const avg = sum / (binEnd - binStart || 1);
        const barHeight = (avg / 255) * height * 0.9;

        const x = i * (barWidth + gap) + gap / 2;
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, "hsl(262, 83%, 58%)");
        gradient.addColorStop(1, "hsla(262, 83%, 58%, 0.3)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserRef, isPlaying]);

  return (
    <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm h-auto sm:h-auto glass-heavy border border-border sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-primary" />
            <h2 className="text-base font-bold text-foreground">Equalizer</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Presets */}
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  activePreset === p.name
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="p-6 space-y-6">
          {/* Bass */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Bass</span>
              <span className="text-xs text-muted-foreground tabular-nums">{eqBass > 0 ? "+" : ""}{eqBass} dB</span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={eqBass}
              onChange={(e) => handleBassChange(Number(e.target.value))}
              className="w-full h-1.5 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${((eqBass + 12) / 24) * 100}%, hsl(var(--muted)) ${((eqBass + 12) / 24) * 100}%)`,
              }}
            />
          </div>

          {/* Mid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Mid</span>
              <span className="text-xs text-muted-foreground tabular-nums">{eqMid > 0 ? "+" : ""}{eqMid} dB</span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={eqMid}
              onChange={(e) => handleMidChange(Number(e.target.value))}
              className="w-full h-1.5 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${((eqMid + 12) / 24) * 100}%, hsl(var(--muted)) ${((eqMid + 12) / 24) * 100}%)`,
              }}
            />
          </div>

          {/* Treble */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Treble</span>
              <span className="text-xs text-muted-foreground tabular-nums">{eqTreble > 0 ? "+" : ""}{eqTreble} dB</span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={eqTreble}
              onChange={(e) => handleTrebleChange(Number(e.target.value))}
              className="w-full h-1.5 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${((eqTreble + 12) / 24) * 100}%, hsl(var(--muted)) ${((eqTreble + 12) / 24) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* Real-time visualizer */}
        <div className="px-6 pb-4">
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <canvas
              ref={canvasRef}
              width={320}
              height={64}
              className="w-full h-16"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

