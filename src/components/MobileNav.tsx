import { Home, Search, Library } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Library, label: "Library", path: "/" },
];

export const MobileNav = () => {
  const location = useLocation();

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
      </div>
    </nav>
  );
};
