import type { ReactNode } from 'react';

import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface AppShellProps {
    sidebar: ReactNode;
    brand: ReactNode;
    header?: ReactNode;
    topBanner?: ReactNode;
    children: ReactNode;
}

export function AppShell({ sidebar, brand, header, topBanner, children }: AppShellProps) {
    return (
        <div className="flex h-svh flex-col overflow-hidden">
            {topBanner}
            <SidebarProvider className="min-h-0 flex-1 overflow-hidden" defaultOpen>
                {sidebar}
                <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-background">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <MobileShellHeader brand={brand} />
                        {header}
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-none">
                            {children}
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}

function MobileShellHeader({ brand }: { brand: ReactNode }) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border bg-background/80 px-2 backdrop-blur md:hidden">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-auto" orientation="vertical" />
            <div className="min-w-0 flex-1">{brand}</div>
        </header>
    );
}
