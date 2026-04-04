
import { useEffect, useRef, useState, ReactNode } from "react";

export const DeferredSection = ({ children, fallbackHeight = 200 }: { children: ReactNode; fallbackHeight?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return <div ref={ref} style={{ minHeight: fallbackHeight }} />;
  }

  return <div ref={ref}>{children}</div>;
};
