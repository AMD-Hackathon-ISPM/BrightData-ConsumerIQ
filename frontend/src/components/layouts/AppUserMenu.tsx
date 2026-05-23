import { IconLogout } from "@tabler/icons-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export function AppUserMenu() {
    const { user, logout } = useAuth();

    if (!user) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-sidebar-border bg-background-default text-foreground-default transition hover:border-brand-default/50 hover:bg-background-surface-100 focus-visible:border-brand-default/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/40 aria-expanded:border-brand-default/60 aria-expanded:bg-background-surface-100"
                    type="button"
                >
                    <Avatar className="size-8 rounded-full border border-transparent">
                        <AvatarFallback className="rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                            {getUserInitials(user.fullName)}
                        </AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="min-w-64 rounded-lg border border-sidebar-border ring-0"
                side="bottom"
                sideOffset={6}
            >
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center p-2 text-left text-sm">
                        <div className="grid flex-1 gap-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium text-foreground-default">
                                {user.fullName}
                            </span>
                            <span className="truncate text-xs text-foreground-light">
                                {user.email}
                            </span>
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-sidebar-border" />

                <DropdownMenuItem
                    className="px-2.5 [&_svg]:text-foreground-lighter [&_span]:text-foreground-light focus:bg-background-overlay-hover focus:[&_span]:text-foreground-default focus:[&_svg]:text-foreground-lighter"
                    onClick={logout}
                >
                    <IconLogout stroke={1.8} />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function getUserInitials(name: string): string {
    return name
        .split(" ")
        .map((segment) => segment[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
}
