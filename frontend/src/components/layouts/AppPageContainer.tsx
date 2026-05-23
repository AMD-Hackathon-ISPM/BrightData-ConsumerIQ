import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AppPageContainerProps {
    children: ReactNode;
    className?: string;
}

export function AppPageContainer({ children, className }: AppPageContainerProps) {
    return (
        <div className="flex min-h-full w-full flex-1 flex-col items-stretch">
            <div
                className={cn(
                    "mx-auto flex w-full flex-1 flex-col @container max-w-[1200px] px-6 pt-12 pb-16 sm:px-10 xl:px-14",
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}
