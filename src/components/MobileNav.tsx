import { Home, Search, Library } from "lucide-react";

const tabs = [
  { icon: Home, label: "Home" },
  { icon: Search, label: "Search" },
  { icon: Library, label: "Library" },
];

export const MobileNav = () => (
  <nav className="fixed bottom-[72px] left-0 right-0 z-40 md:hidden glass border-t border-border">
    <div className="flex justify-around py-2">
      {tabs.map(({ icon: Icon, label }) => (
        <button
          key={label}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  </nav>
);
