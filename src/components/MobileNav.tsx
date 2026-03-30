import { Home, Search, Sun, Moon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
];

export const MobileNav = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed bottom-[72px] left-0 right-0 z-40 md:hidden glass border-t border-border">
      <div className="flex justify-around py-2">
        {tabs.map(({ icon: Icon, label, path }) => (
          <Link
            key={label}
            to={path}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              location.pathname === path
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          <span className="text-[10px] font-medium">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>
    </nav>
  );
};
