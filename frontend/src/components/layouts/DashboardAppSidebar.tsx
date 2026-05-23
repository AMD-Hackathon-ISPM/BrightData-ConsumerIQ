import { IconLogout, IconMessageCircle } from "@tabler/icons-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { navItems, type DashboardSection } from "@/features/dashboard/constants";

interface DashboardAppSidebarProps {
    active: DashboardSection;
    onActiveChange: (next: DashboardSection) => void;
    onToggleChat?: () => void;
}

export function DashboardAppSidebar({
    active,
    onActiveChange,
    onToggleChat,
}: DashboardAppSidebarProps) {
    const { logout } = useAuth();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border px-2 py-2">
                <div className="flex h-8 items-center gap-2 pl-2 pr-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground-default group-data-[collapsible=icon]:hidden">
                        ConsumerIQ
                    </span>
                    <SidebarTrigger className="shrink-0 rounded-md text-foreground-lighter hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8" />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="pt-2 font-medium text-foreground-lighter">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = active === item.id;
                                return (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            isActive={isActive}
                                            onClick={() => onActiveChange(item.id)}
                                            tooltip={item.label}
                                        >
                                            <Icon className="size-4" />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                {onToggleChat ? (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={onToggleChat}
                                tooltip="Founder Chat"
                            >
                                <IconMessageCircle className="size-4" stroke={1.8} />
                                <span>Founder Chat</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                ) : null}
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout} tooltip="Log out">
                            <IconLogout className="size-4" stroke={1.8} />
                            <span>Log out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
