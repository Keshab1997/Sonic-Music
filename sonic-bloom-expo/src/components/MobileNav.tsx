
import { useState } from "react";
import { Home, Search, Library, Sun, Moon, Download } from "lucide-react-native";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { usePlayer } from "@/context/PlayerContext";
import { SearchOverlay } from "@/components/SearchOverlay";
import { MobileLibrary } from "@/components/MobileLibrary";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Download, label: "Downloads", path: "/downloads" },
];

interface MobileNavProps {
  onClosePlaylist?: () => void;
}

export const MobileNav = ({ onClosePlaylist }: MobileNavProps = {}) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const { currentTrack } = usePlayer();
  const isFullScreen = false; // This will be controlled by parent

  // Hide navigation when fullscreen player is active
  if (isFullScreen) return null;

  const handleNavClick = () => {
    if (onClosePlaylist) {
      onClosePlaylist();
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden glass border-t border-border h-[60px]">
        <div className="flex justify-around py-2">
          {tabs.map(({ icon: Icon, label, path }) => (
            <Link
              key={label}
              to={path}
              onClick={handleNavClick}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 min-w-[48px] transition-colors ${
                location.pathname === path
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => { handleNavClick(); setShowSearch(true); }}
            className="flex flex-col items-center gap-0.5 px-4 py-2 min-w-[48px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search size={22} />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button
            onClick={() => { handleNavClick(); setShowLibrary(true); }}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 min-w-[48px] transition-colors ${
              showLibrary ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Library size={22} />
            <span className="text-[10px] font-medium">Library</span>
          </button>
          <button
            onClick={() => { handleNavClick(); toggleTheme(); }}
            className="flex flex-col items-center gap-0.5 px-4 py-2 min-w-[48px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
            <span className="text-[10px] font-medium">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </nav>
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showLibrary && <MobileLibrary onClose={() => setShowLibrary(false)} />}
    </>
  );
};
