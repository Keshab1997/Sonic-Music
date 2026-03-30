import { useState, useCallback } from "react";
import { Sliders, X, Volume2 } from "lucide-react";

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
  const [activePreset, setActivePreset] = useState("Flat");
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);

  const applyPreset = useCallback((preset: EqPreset) => {
    setActivePreset(preset.name);
    setBass(preset.bass);
    setMid(preset.mid);
    setTreble(preset.treble);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden">
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
              <span className="text-xs text-muted-foreground tabular-nums">{bass > 0 ? "+" : ""}{bass} dB</span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={bass}
              onChange={(e) => { setBass(Number(e.target.value)); setActivePreset("Custom"); }}
              className="w-full h-1.5 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${((bass + 12) / 24) * 100}%, hsl(var(--muted)) ${((bass + 12) / 24) * 100}%)`,
              }}
            />
          </div>

          {/* Mid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Mid</span>
              <span className="text-xs text-muted-foreground tabular-nums">{mid > 0 ? "+" : ""}{mid} dB</span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={mid}
              onChange={(e) => { setMid(Number(e.target.value)); setActivePreset("Custom"); }}
              className="w-full h-1.5 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${((mid + 12) / 24) * 100}%, hsl(var(--muted)) ${((mid + 12) / 24) * 100}%)`,
              }}
            />
          </div>

          {/* Treble */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Treble</span>
              <span className="text-xs text-muted-foreground tabular-nums">{treble > 0 ? "+" : ""}{treble} dB</span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={treble}
              onChange={(e) => { setTreble(Number(e.target.value)); setActivePreset("Custom"); }}
              className="w-full h-1.5 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${((treble + 12) / 24) * 100}%, hsl(var(--muted)) ${((treble + 12) / 24) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* Visualizer bars */}
        <div className="px-6 pb-4">
          <div className="flex items-end justify-center gap-1 h-16 p-3 rounded-xl bg-card border border-border">
            {Array.from({ length: 16 }).map((_, i) => {
              const baseH = 10 + Math.random() * 30;
              const bassBoost = bass > 0 && i < 5 ? bass * 2 : 0;
              const trebleBoost = treble > 0 && i > 11 ? treble * 2 : 0;
              const h = baseH + bassBoost + trebleBoost;
              return (
                <div
                  key={i}
                  className="w-2 rounded-full bg-gradient-to-t from-primary to-primary/40 transition-all duration-300"
                  style={{ height: `${h}px` }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
