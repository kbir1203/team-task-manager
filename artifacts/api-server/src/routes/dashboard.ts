import { Router } from "express";
import { db, tasksTable, projectsTable, projectMembersTable, usersTable } from "@workspace/db";
import { eq, and, lt, sql, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

// GET /api/dashboard/summary
router.get("/summary", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.dbUser!.id;
  const now = new Date();

  // Get all projects the user belongs to
  const memberProjects = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));

  const projectIds = memberProjects.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json({
      totalTasks: 0,
      todoTasks: 0,
      inProgressTasks: 0,
      doneTasks: 0,
      overdueTasks: 0,
      totalProjects: 0,
      activeProjects: 0,
    });
    return;
  }

  const projectIdArray = sql.raw("ARRAY[" + projectIds.join(",") + "]::int[]");

  const [totalTasksRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(sql`${tasksTable.projectId} = ANY(${projectIdArray})`);

  const [todoRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(and(sql`${tasksTable.projectId} = ANY(${projectIdArray})`, eq(tasksTable.status, "todo")));

  const [inProgressRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(and(sql`${tasksTable.projectId} = ANY(${projectIdArray})`, eq(tasksTable.status, "in_progress")));

  const [doneRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(and(sql`${tasksTable.projectId} = ANY(${projectIdArray})`, eq(tasksTable.status, "done")));

  const [overdueRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(
      and(
        sql`${tasksTable.projectId} = ANY(${projectIdArray})`,
        sql`${tasksTable.dueDate} IS NOT NULL`,
        lt(tasksTable.dueDate, now),
        sql`${tasksTable.status} != 'done'`
      )
    );

  const [totalProjectsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(sql`${projectsTable.id} = ANY(${projectIdArray})`);

  const [activeProjectsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(and(sql`${projectsTable.id} = ANY(${projectIdArray})`, eq(projectsTable.status, "active")));

  res.json({
    totalTasks: totalTasksRow.count,
    todoTasks: todoRow.count,
    inProgressTasks: inProgressRow.count,
    doneTasks: doneRow.count,
    overdueTasks: overdueRow.count,
    totalProjects: totalProjectsRow.count,
    activeProjects: activeProjectsRow.count,
  });
});

// GET /api/dashboard/recent-activity
router.get("/recent-activity", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.dbUser!.id;

  const memberProjects = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));

  const projectIds = memberProjects.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json([]);
    return;
  }

  const projectIdArray = sql.raw("ARRAY[" + projectIds.join(",") + "]::int[]");

  const tasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
      projectName: projectsTable.name,
      updatedAt: tasksTable.updatedAt,
    })
    .from(tasksTable)
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(sql`${tasksTable.projectId} = ANY(${projectIdArray})`)
    .orderBy(desc(tasksTable.updatedAt))
    .limit(10);

  res.json(tasks);
});

// GET /api/dashboard/overdue-tasks
router.get("/overdue-tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.dbUser!.id;
  const now = new Date();

  const memberProjects = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));

  const projectIds = memberProjects.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json([]);
    return;
  }

  const projectIdArray = sql.raw("ARRAY[" + projectIds.join(",") + "]::int[]");

  const tasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
      assigneeId: tasksTable.assigneeId,
      createdById: tasksTable.createdById,
      dueDate: tasksTable.dueDate,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
      project: projectsTable,
      assignee: usersTable,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(
      and(
        sql`${tasksTable.projectId} = ANY(${projectIdArray})`,
        sql`${tasksTable.dueDate} IS NOT NULL`,
        lt(tasksTable.dueDate, now),
        sql`${tasksTable.status} != 'done'`
      )
    )
    .orderBy(tasksTable.dueDate)
    .limit(20);

  res.json(tasks);
});

export default router;
