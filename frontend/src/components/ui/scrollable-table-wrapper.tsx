import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollableTableWrapper({ children }: { children: ReactNode }) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scrolledLeft, setScrolledLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const scrollEl = wrapper.querySelector<HTMLElement>(
            '[data-slot="table-container"]',
        );
        if (!scrollEl) return;

        const update = () => {
            setScrolledLeft(scrollEl.scrollLeft > 0);
            setCanScrollRight(
                scrollEl.scrollLeft + scrollEl.clientWidth <
                    scrollEl.scrollWidth - 1,
            );
        };

        update();
        scrollEl.addEventListener("scroll", update);
        const observer = new ResizeObserver(update);
        observer.observe(scrollEl);

        return () => {
            scrollEl.removeEventListener("scroll", update);
            observer.disconnect();
        };
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="overflow-hidden rounded-lg border border-border-default bg-background-default"
        >
            <div className="relative">
                <div
                    className={[
                        "pointer-events-none absolute inset-0 z-[38]",
                        "before:pointer-events-none before:absolute before:top-0 before:right-0 before:bottom-0 before:w-6 before:bg-gradient-to-l before:from-black/5 before:to-transparent before:transition-opacity before:duration-300",
                        canScrollRight
                            ? "before:opacity-100"
                            : "before:opacity-0",
                        "after:pointer-events-none after:absolute after:top-0 after:left-0 after:bottom-0 after:w-6 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:transition-opacity after:duration-300",
                        scrolledLeft ? "after:opacity-100" : "after:opacity-0",
                    ].join(" ")}
                />
                {children}
            </div>
        </div>
    );
}
