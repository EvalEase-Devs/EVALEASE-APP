import { Suspense } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { TaskWizard } from "./components/task-wizard";

export default function CreateTaskPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-24">
                    <IconLoader2
                        size={24}
                        className="animate-spin text-muted-foreground"
                    />
                </div>
            }
        >
            <TaskWizard />
        </Suspense>
    );
}
