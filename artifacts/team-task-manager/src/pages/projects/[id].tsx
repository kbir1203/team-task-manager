import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetProject,
  getGetProjectQueryKey,
  useListProjectTasks,
  getListProjectTasksQueryKey,
  useListProjectMembers,
  getListProjectMembersQueryKey,
  useGetMe,
  getGetMeQueryKey,
  useCreateTask,
  useAddProjectMember,
  useRemoveProjectMember,
  useUpdateProject,
  useDeleteProject,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, PriorityBadge } from "@/components/shared/badges";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  CalendarIcon, 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  UserCircle, 
  UserPlus, 
  Users,
  Settings as SettingsIcon
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const taskSchema = z.object({
  title: z.string().min(2, "Title is required").max(100),
  description: z.string().max(1000).optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigneeId: z.coerce.number().optional().nullable(),
  dueDate: z.date().optional().nullable(),
});

export default function ProjectDetail() {
  const params = useParams();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("tasks");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: project, isLoading: isLoadingProject } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: tasks, isLoading: isLoadingTasks } = useListProjectTasks(
    projectId,
    { status: taskStatusFilter !== "all" ? (taskStatusFilter as any) : undefined },
    { query: { enabled: !!projectId, queryKey: getListProjectTasksQueryKey(projectId, { status: taskStatusFilter !== "all" ? (taskStatusFilter as any) : undefined }) } }
  );
  const { data: members, isLoading: isLoadingMembers } = useListProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectMembersQueryKey(projectId) },
  });

  const createTask = useCreateTask();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigneeId: null,
      dueDate: null,
    },
  });

  const isAdmin = members?.some((m) => m.userId === me?.id && m.role === "admin") || me?.role === "admin";

  function onSubmitTask(values: z.infer<typeof taskSchema>) {
    createTask.mutate(
      {
        projectId,
        data: {
          ...values,
          dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
          assigneeId: values.assigneeId || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId, { status: taskStatusFilter !== "all" ? (taskStatusFilter as any) : undefined }) });
          toast({ title: "Task created" });
          setIsNewTaskOpen(false);
          form.reset();
        },
        onError: () => toast({ variant: "destructive", title: "Error creating task" }),
      }
    );
  }

  if (isLoadingProject) return <div className="p-8">Loading project...</div>;
  if (!project) return <div className="p-8">Project not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.status === "archived" && (
              <span className="text-xs uppercase tracking-wider font-bold bg-muted px-2 py-1 rounded text-muted-foreground">Archived</span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 max-w-3xl">{project.description}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center border-b border-border">
          <TabsList className="bg-transparent border-0 rounded-none h-12 p-0 space-x-6">
            <TabsTrigger 
              value="tasks" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="members"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 flex items-center gap-2"
            >
              Members <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{members?.length || 0}</span>
            </TabsTrigger>
          </TabsList>
          
          {activeTab === "tasks" && (
            <div className="flex items-center gap-3 pb-2">
              <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 gap-1.5">
                    <Plus className="h-4 w-4" /> New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Task</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitTask)} className="space-y-4">
                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none" rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="priority" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createTask.isPending}>Create Task</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <TabsContent value="tasks" className="pt-6">
          {isLoadingTasks ? (
            <div className="text-muted-foreground">Loading tasks...</div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl bg-muted/10">
              <p className="text-muted-foreground">No tasks found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tasks?.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium text-[15px]">{task.title}</span>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={task.status} />
                          <PriorityBadge priority={task.priority} />
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" /> {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={task.assignee?.avatarUrl || undefined} />
                        <AvatarFallback><UserCircle className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members?.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback><UserCircle className="h-6 w-6" /></AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.user.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}