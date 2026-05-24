import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
    IconAlertOctagon,
    IconAlertTriangle,
    IconCircleCheckFilled,
    IconInfoCircleFilled,
    IconLoader,
} from "@tabler/icons-react";

/**
 * Icon badge for warning/error: solid accent square with a dark glyph,
 * matching the dark-toast / colored-badge pattern.
 */
const badgeClasses =
    "flex size-5 items-center justify-center rounded text-[#161616]";

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="light"
            position="top-right"
            className="toaster group"
            closeButton
            toastOptions={{
                classNames: {
                    toast:
                        "!w-full !rounded-md !py-3 !px-5 !flex !gap-2 !items-start !font-normal !text-sm",
                    closeButton:
                        "!bg-transparent !border-0 !text-foreground-light hover:!text-foreground-default hover:!bg-transparent",
                    actionButton: "!mr-8",
                    /* Make the [data-icon] container fit the 20px badge */
                    icon: "!size-5 !w-5 !h-5 !m-0 !mr-2.5",
                },
            }}
            icons={{
                success: <IconCircleCheckFilled className="size-4" />,
                info: <IconInfoCircleFilled className="size-4" />,
                warning: (
                    <span
                        className={`${badgeClasses} bg-warning-500`}
                        aria-hidden
                    >
                        <IconAlertTriangle
                            className="block size-3"
                            stroke={2.5}
                        />
                    </span>
                ),
                error: (
                    <span
                        className={`${badgeClasses} bg-destructive-500`}
                        aria-hidden
                    >
                        <IconAlertOctagon
                            className="block size-3"
                            stroke={2.5}
                        />
                    </span>
                ),
                loading: <IconLoader className="size-4 animate-spin" />,
            }}
            style={
                {
                    /* Base */
                    "--normal-bg": "var(--background-dialog-default)",
                    "--normal-text": "var(--foreground-default)",
                    "--normal-border":
                        "color-mix(in oklab, var(--foreground-default) 12%, transparent)",
                    /* Success — default toast colors */
                    "--success-bg": "var(--normal-bg)",
                    "--success-text": "var(--normal-text)",
                    "--success-border": "var(--normal-border)",
                    /* Error — saturated dark red bg, coral border, badge accent */
                    "--error-bg":
                        "color-mix(in oklab, var(--destructive-500) 30%, #000)",
                    "--error-text": "var(--foreground-default)",
                    "--error-border":
                        "color-mix(in oklab, var(--destructive-500) 55%, #000)",
                    /* Warning — saturated dark amber bg, amber border, badge accent */
                    "--warning-bg":
                        "color-mix(in oklab, var(--warning-500) 30%, #000)",
                    "--warning-text": "var(--foreground-default)",
                    "--warning-border":
                        "color-mix(in oklab, var(--warning-500) 55%, #000)",
                    /* Info — default toast colors */
                    "--info-bg": "var(--normal-bg)",
                    "--info-text": "var(--normal-text)",
                    "--info-border": "var(--normal-border)",
                    /* Shape */
                    "--border-radius": "var(--radius)",
                    /* Close button: sit flush inside the top-right corner */
                    "--toast-close-button-start": "unset",
                    "--toast-close-button-end": "8px",
                    "--toast-close-button-transform": "translate(0, 8px)",
                } as React.CSSProperties
            }
            {...props}
        />
    );
};

export { Toaster };
