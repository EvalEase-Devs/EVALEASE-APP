import { IconAlertCircle } from "@tabler/icons-react";

export function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-1 text-destructive text-xs mt-1">
            <IconAlertCircle size={12} />
            <span>{message}</span>
        </div>
    );
}
