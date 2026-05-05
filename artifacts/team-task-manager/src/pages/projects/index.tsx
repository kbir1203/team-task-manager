import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your team's initiatives.</p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading projects...</div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl bg-muted/20">
          <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-muted-foreground mt-1 mb-4">Get started by creating your first project.</p>
          <Link href="/projects/new">
            <Button>Create Project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => {
            const progress = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-all duration-200 cursor-pointer border-border/60 hover:border-primary/30 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg leading-tight line-clamp-1">{project.name}</CardTitle>
                      {project.status === 'archived' && (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">Archived</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                      {project.description || "No description provided."}
                    </p>
                  </CardHeader>
                  <CardContent className="pb-4 mt-auto">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground font-medium">Progress</span>
                          <span className="font-bold">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5" title="Members">
                          <Users className="h-4 w-4" />
                          <span>{project.memberCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Completed / Total Tasks">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{project.completedTaskCount}/{project.taskCount}</span>
                        </div>
                        {project.overdueTaskCount > 0 && (
                          <div className="flex items-center gap-1.5 text-destructive" title="Overdue Tasks">
                            <AlertCircle className="h-4 w-4" />
                            <span>{project.overdueTaskCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Need FolderKanban import since it was missing
import { FolderKanban } from "lucide-react";