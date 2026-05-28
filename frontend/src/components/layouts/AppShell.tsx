import { IconMenu2 } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';

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
                <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-background-default md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border-default md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0">
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
    const { toggleSidebar } = useSidebar();

    return (
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border bg-background-default bg-gradient-to-b from-brand-default/[0.025] to-transparent px-6 sm:px-8 md:hidden">
            <Button
                aria-label="Toggle menu"
                className="-ml-1 text-foreground-light hover:text-foreground-default"
                onClick={toggleSidebar}
                size="icon-sm"
                type="button"
                variant="ghost"
            >
                <IconMenu2 className="size-[20px]" />
            </Button>
            <Separator className="data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-auto" orientation="vertical" />
            <div className="min-w-0 flex-1 truncate">{brand}</div>
        </header>
    );
}
