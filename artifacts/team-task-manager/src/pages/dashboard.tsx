import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useGetOverdueTasks, getGetOverdueTasksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo, FolderKanban, Activity } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/shared/badges";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: overdueTasks, isLoading: isLoadingOverdue } = useGetOverdueTasks({ query: { queryKey: getGetOverdueTasksQueryKey() } });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening across your projects.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingSummary ? "..." : summary?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {summary?.activeProjects || 0} active projects</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingSummary ? "..." : summary?.todoTasks || 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingSummary ? "..." : summary?.inProgressTasks || 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingSummary ? "..." : summary?.doneTasks || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingActivity ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : recentActivity?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No recent activity.</div>
              ) : (
                recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex flex-col gap-1 border-b border-border/50 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-start justify-between">
                      <Link href={`/tasks/${activity.id}`} className="font-medium text-sm hover:underline">
                        {activity.title}
                      </Link>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(activity.updatedAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FolderKanban className="h-3 w-3" />
                      <span>{activity.projectName}</span>
                      <span className="mx-1">•</span>
                      <StatusBadge status={activity.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Clock className="h-5 w-5" /> Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingOverdue ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : overdueTasks?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No overdue tasks. Great job!</div>
              ) : (
                overdueTasks?.map((task) => (
                  <div key={task.id} className="flex items-center justify-between bg-background p-3 rounded-md border border-border shadow-sm">
                    <div className="flex flex-col">
                      <Link href={`/tasks/${task.id}`} className="font-medium text-sm hover:underline text-destructive">
                        {task.title}
                      </Link>
                      <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        Due: {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'Unknown'}
                      </span>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}