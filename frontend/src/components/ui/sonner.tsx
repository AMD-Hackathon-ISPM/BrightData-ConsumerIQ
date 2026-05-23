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
            theme="system"
            className="toaster group"
            closeButton
            toastOptions={{
                classNames: {
                    closeButton:
                        "!bg-transparent !border-0 !text-muted-foreground hover:!text-foreground hover:!bg-transparent",
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
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--foreground)",
                    "--normal-border": "var(--border-default)",
                    "--success-bg": "var(--primary)",
                    "--success-text": "var(--primary)",
                    "--success-border": "var(--primary)",
                    "--error-bg": "var(--destructive-200)",
                    "--error-text": "var(--destructive-600)",
                    "--error-border": "var(--destructive-400)",
                    "--warning-bg": "#fef9c3",
                    "--warning-text": "#a16207",
                    "--warning-border": "#facc15",
                    "--info-bg": "var(--primary)",
                    "--info-text": "var(--primary)",
                    "--info-border": "var(--primary)",
                    "--border-radius": "var(--radius)",
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
