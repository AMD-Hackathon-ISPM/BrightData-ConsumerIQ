import type { ReactNode } from "react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { AppUserMenu } from "./AppUserMenu";

export interface AppPageHeaderCrumb {
    label: string;
    href?: string;
}

interface AppPageHeaderProps {
    title: string;
    items?: AppPageHeaderCrumb[];
    actions?: ReactNode;
    className?: string;
}

const breadcrumbBaseClass = "rounded-md px-2 py-1 text-sm font-medium";
const breadcrumbLinkClass = cn(
    breadcrumbBaseClass,
    "cursor-pointer text-foreground-light transition-colors hover:bg-background-overlay-hover hover:text-foreground-default",
);
const breadcrumbPageClass = cn(breadcrumbBaseClass, "text-foreground-default");
const breadcrumbStaticClass = cn(breadcrumbBaseClass, "text-foreground-light");

export function AppPageHeader({
    title,
    items,
    actions,
    className,
}: AppPageHeaderProps) {
    const crumbs: AppPageHeaderCrumb[] =
        items && items.length > 0 ? items : [{ label: title }];

    return (
        <header
            className={cn(
                "sticky top-0 z-30 border-b border-sidebar-border bg-background-default bg-gradient-to-b from-brand-default/[0.025] to-transparent transition-[height,padding] ease-linear",
                className,
            )}
        >
            <div className="mx-auto flex h-12 w-full max-w-[1200px] items-center justify-between gap-3 px-6 transition-[height,padding] ease-linear sm:px-10 xl:px-14">
                <div className="-ml-2 flex min-w-0 items-center">
                    <Breadcrumb>
                        <BreadcrumbList className="gap-0.5 text-sm">
                            {crumbs.map((crumb, index) => {
                                const isLast = index === crumbs.length - 1;

                                return (
                                    <BreadcrumbSegment
                                        key={`${crumb.href ?? "static"}-${crumb.label}`}
                                        crumb={crumb}
                                        isLast={isLast}
                                    />
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
                <div className="flex min-h-7 min-w-7 items-center justify-end gap-2">
                    {actions ?? null}
                    <AppUserMenu />
                </div>
            </div>
        </header>
    );
}

function BreadcrumbSegment({
    crumb,
    isLast,
}: {
    crumb: AppPageHeaderCrumb;
    isLast: boolean;
}) {
    return (
        <>
            <BreadcrumbItem>
                {crumb.href ? (
                    <BreadcrumbLink asChild className={breadcrumbLinkClass}>
                        <a href={crumb.href}>{crumb.label}</a>
                    </BreadcrumbLink>
                ) : (
                    <span
                        aria-current={isLast ? "page" : undefined}
                        className={
                            isLast ? breadcrumbPageClass : breadcrumbStaticClass
                        }
                    >
                        {crumb.label}
                    </span>
                )}
            </BreadcrumbItem>
            {!isLast && <BreadcrumbSeparator />}
        </>
    );
}
