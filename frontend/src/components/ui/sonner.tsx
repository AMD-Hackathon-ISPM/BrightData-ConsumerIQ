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
                    /* Success */
                    "--success-bg": "var(--brand-200)",
                    "--success-text": "var(--brand-600)",
                    "--success-border": "var(--brand-300)",
                    /* Error */
                    "--error-bg": "var(--destructive-200)",
                    "--error-text": "var(--destructive-600)",
                    "--error-border": "var(--destructive-400)",
                    /* Warning */
                    "--warning-bg": "var(--warning-200)",
                    "--warning-text": "var(--warning-600)",
                    "--warning-border": "var(--warning-400)",
                    /* Info */
                    "--info-bg": "var(--brand-200)",
                    "--info-text": "var(--brand-600)",
                    "--info-border": "var(--brand-300)",
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
