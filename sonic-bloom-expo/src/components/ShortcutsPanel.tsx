
import { X, Keyboard } from "lucide-react-native";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

interface ShortcutsPanelProps {
  onClose: () => void;
}

export function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl shadow-2xl p-6 w-[90vw] max-w-sm animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-primary" />
            <h2 className="text-base font-bold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono border border-border">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground/50 mt-4 text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">?</kbd> to toggle this panel
        </p>
      </div>
    </div>
  );
}

