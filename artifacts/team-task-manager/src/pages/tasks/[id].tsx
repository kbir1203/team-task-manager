import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import {
  useGetTask,
  getGetTaskQueryKey,
  useUpdateTask,
  useDeleteTask,
  useListProjectMembers,
  getListProjectMembersQueryKey,
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, UserCircle, CalendarIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge, PriorityBadge } from "@/components/shared/badges";
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
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assigneeId: z.coerce.number().optional().nullable(),
});

export default function TaskDetail() {
  const params = useParams();
  const taskId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: task, isLoading: isLoadingTask } = useGetTask(taskId, {
    query: { enabled: !!taskId, queryKey: getGetTaskQueryKey(taskId) },
  });

  const { data: members } = useListProjectMembers(task?.projectId || 0, {
    query: { enabled: !!task?.projectId, queryKey: getListProjectMembersQueryKey(task?.projectId || 0) },
  });

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const initRef = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigneeId: null,
    },
  });

  useEffect(() => {
    if (task && !initRef.current) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status as any,
        priority: task.priority as any,
        assigneeId: task.assigneeId || undefined,
      });
      initRef.current = true;
    }
  }, [task, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateTask.mutate(
      {
        taskId,
        data: {
          ...values,
          assigneeId: values.assigneeId || null,
        },
      },
      {
        onSuccess: (updatedTask) => {
          queryClient.setQueryData(getGetTaskQueryKey(taskId), updatedTask);
          toast({ title: "Task updated" });
        },
        onError: () => toast({ variant: "destructive", title: "Error updating task" }),
      }
    );
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this task?")) return;
    deleteTask.mutate(
      { taskId },
      {
        onSuccess: () => {
          toast({ title: "Task deleted" });
          setLocation(`/projects/${task?.projectId}`);
        },
        onError: () => toast({ variant: "destructive", title: "Error deleting task" }),
      }
    );
  }

  if (isLoadingTask) return <div className="p-8">Loading task...</div>;
  if (!task) return <div className="p-8">Task not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${task.projectId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="text-sm font-medium text-muted-foreground">
            {task.project?.name} / Task #{task.id}
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
          <Trash2 className="h-4 w-4" /> Delete Task
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input className="font-semibold text-lg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={6} className="resize-none" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="space-y-6 p-5 bg-muted/30 rounded-lg border border-border/50">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField control={form.control} name="assigneeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "unassigned" ? null : Number(val))} 
                      value={field.value ? String(field.value) : "unassigned"}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members?.map(m => (
                          <SelectItem key={m.userId} value={String(m.userId)}>{m.user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" disabled={updateTask.isPending} className="px-8">
                {updateTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}