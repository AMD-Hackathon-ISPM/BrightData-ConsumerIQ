import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
    IconAlertOctagon,
    IconAlertTriangle,
    IconCircleCheck,
    IconInfoCircle,
    IconLoader,
} from "@tabler/icons-react";

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="light"
            position="top-right"
            className="toaster group"
            closeButton
            toastOptions={{
                classNames: {
                    closeButton:
                        "!bg-transparent !border-0 !text-foreground-light hover:!text-foreground-default hover:!bg-transparent",
                },
            }}
            icons={{
                success: <IconCircleCheck className="size-4" />,
                info: <IconInfoCircle className="size-4" />,
                warning: <IconAlertTriangle className="size-4" />,
                error: <IconAlertOctagon className="size-4" />,
                loading: <IconLoader className="size-4 animate-spin" />,
            }}
            style={
                {
                    /* Base */
                    "--normal-bg": "var(--background-dialog-default)",
                    "--normal-text": "var(--foreground-default)",
                    "--normal-border": "var(--border-default)",
                    /* Success — gruvbox green accent on dialog bg */
                    "--success-bg": "var(--background-dialog-default)",
                    "--success-text": "var(--chart-4)",
                    "--success-border":
                        "color-mix(in oklab, var(--chart-4) 40%, transparent)",
                    /* Error — gruvbox red bg, white text */
                    "--error-bg": "var(--destructive-500)",
                    "--error-text": "#fff",
                    "--error-border": "var(--destructive-600)",
                    /* Warning — gruvbox yellow bg, white text */
                    "--warning-bg": "var(--warning-500)",
                    "--warning-text": "#fff",
                    "--warning-border": "var(--warning-600)",
                    /* Info — gruvbox blue accent on dialog bg */
                    "--info-bg": "var(--background-dialog-default)",
                    "--info-text": "var(--chart-5)",
                    "--info-border":
                        "color-mix(in oklab, var(--chart-5) 40%, transparent)",
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
