import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "todo" | "in_progress" | "done" | "overdue" | string }) {
  const config = {
    todo: { label: "To Do", className: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200" },
    in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200" },
    done: { label: "Done", className: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" },
  };

  const style = config[status as keyof typeof config] || { label: status, className: "bg-muted" };

  return (
    <Badge variant="outline" className={`font-medium shadow-none ${style.className}`}>
      {style.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" | string }) {
  const config = {
    low: { label: "Low", className: "bg-gray-100 text-gray-700 border-gray-200" },
    medium: { label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200" },
    high: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  };

  const style = config[priority as keyof typeof config] || { label: priority, className: "bg-muted" };

  return (
    <Badge variant="outline" className={`text-xs shadow-none ${style.className}`}>
      {style.label}
    </Badge>
  );
}