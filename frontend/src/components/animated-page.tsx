import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function AnimatedPage({
  children,
  className,
  transitionKey,
}: {
  children: ReactNode;
  className?: string;
  transitionKey: string | number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    void transitionKey
    setIsVisible(false);

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsVisible(true));
    });

    return () => window.cancelAnimationFrame(firstFrame);
  }, [transitionKey]);

  return (
    <div
      className={cn(
        "will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isVisible
          ? "translate-y-0 scale-100 opacity-100 blur-0"
          : "translate-y-4 scale-[0.985] opacity-0 blur-[1px]",
        className
      )}
      key={transitionKey}
    >
      {children}
    </div>
  );
}

export function SectionFade({
  children,
  className,
  transitionKey,
}: {
  children: ReactNode;
  className?: string;
  transitionKey: string | number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    void transitionKey
    setIsVisible(false);

    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [transitionKey]);

  return (
    <div
      className={cn(
        "min-w-0 transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className
      )}
      key={transitionKey}
    >
      {children}
    </div>
  );
}
