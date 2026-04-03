import { Sliders, X } from "lucide-react";
import { Equalizer } from "./Equalizer";

interface EqualizerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerPanel = ({ isOpen, onClose }: EqualizerPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 z-[101] md:z-50 w-[calc(100vw-1.5rem)] max-w-80 max-h-[60vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Sliders size={14} className="text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Equalizer</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Equalizer onClose={onClose} />
      </div>
    </div>
  );
};