import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function AnimatedPage({
  children,
  className,
  transitionKey,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  transitionKey: string | number;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    void transitionKey;
    setIsVisible(false);

    let timer: number | undefined;
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (delay > 0) {
          timer = window.setTimeout(() => setIsVisible(true), delay);
        } else {
          setIsVisible(true);
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [transitionKey, delay]);

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
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  transitionKey: string | number;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    void transitionKey;
    setIsVisible(false);

    let timer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      if (delay > 0) {
        timer = window.setTimeout(() => setIsVisible(true), delay);
      } else {
        setIsVisible(true);
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [transitionKey, delay]);

  return (
    <div
      className={cn(
        "min-w-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isVisible
          ? "translate-y-0 scale-100 opacity-100 blur-0"
          : "translate-y-6 scale-[0.97] opacity-0 blur-[2px]",
        className
      )}
      key={transitionKey}
    >
      {children}
    </div>
  );
}
