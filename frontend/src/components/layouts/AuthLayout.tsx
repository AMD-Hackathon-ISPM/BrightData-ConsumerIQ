import type { ReactNode } from "react";

interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex h-svh flex-1 overflow-hidden">
            <aside className="relative hidden h-full basis-1/4 overflow-hidden bg-background-default xl:flex xl:flex-1 xl:shrink">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-default/20 via-background-selection/60 to-background-default" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,theme(colors.brand.default/18%),transparent_55%)]" />
            </aside>
            <main className="flex h-full w-full shrink-0 flex-col overflow-hidden bg-background-muted/30 px-5 pt-10 pb-8 shadow-lg xl:w-[600px] xl:border-l xl:border-border-default">
                <nav className="w-full pl-6">
                    <a
                        aria-label="ConsumerIQ home"
                        className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
                        href="/"
                    >
                        <span className="text-lg font-semibold tracking-tight text-foreground-default">
                            ConsumerIQ
                        </span>
                    </a>
                </nav>
                <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="w-[330px] max-w-full sm:w-[384px]">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
