
import { useState } from "react";
import { Home, Search, Library, Sun, Moon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { SearchOverlay } from "@/components/SearchOverlay";
import { MobileLibrary } from "@/components/MobileLibrary";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
];

export const MobileNav = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  return (
    <>
      <nav className="fixed bottom-[72px] left-0 right-0 z-40 md:hidden glass border-t border-border">
        <div className="flex justify-around py-2">
          {tabs.map(({ icon: Icon, label, path }) => (
            <Link
              key={label}
              to={path}
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
            onClick={() => setShowSearch(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-2 min-w-[48px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search size={22} />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button
            onClick={() => setShowLibrary(true)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 min-w-[48px] transition-colors ${
              showLibrary ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Library size={22} />
            <span className="text-[10px] font-medium">Library</span>
          </button>
          <button
            onClick={toggleTheme}
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
