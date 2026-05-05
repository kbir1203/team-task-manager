import { Router } from "express";
import { db, tasksTable, projectMembersTable, projectsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get("/projects/:projectId/tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.dbUser!.id;

  const member = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!member) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const filters: Parameters<typeof and>[0][] = [eq(tasksTable.projectId, projectId)];

  if (req.query.status) {
    filters.push(eq(tasksTable.status, req.query.status as "todo" | "in_progress" | "done"));
  }

  if (req.query.assigneeId) {
    filters.push(eq(tasksTable.assigneeId, parseInt(req.query.assigneeId as string)));
  }

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
    .where(and(...filters));

  res.json(tasks);
});

// POST /api/projects/:projectId/tasks
router.post("/projects/:projectId/tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.dbUser!.id;

  const member = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!member) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const inserted = await db
    .insert(tasksTable)
    .values({
      ...parsed.data,
      projectId,
      createdById: userId,
      status: parsed.data.status ?? "todo",
      priority: parsed.data.priority ?? "medium",
    })
    .returning();

  res.status(201).json(inserted[0]);
});

// GET /api/tasks/:taskId
router.get("/tasks/:taskId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId as string);
  const userId = req.dbUser!.id;

  const taskRows = await db
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
    .where(eq(tasksTable.id, taskId));

  if (!taskRows[0]) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const task = taskRows[0];

  const member = await db.query.projectMembersTable.findFirst({
    where: and(
      eq(projectMembersTable.projectId, task.projectId),
      eq(projectMembersTable.userId, userId)
    ),
  });

  if (!member) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(task);
});

// PATCH /api/tasks/:taskId
router.patch("/tasks/:taskId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId as string);
  const userId = req.dbUser!.id;

  const task = await db.query.tasksTable.findFirst({ where: eq(tasksTable.id, taskId) });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const member = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, task.projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!member) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updated = await db
    .update(tasksTable)
    .set(parsed.data)
    .where(eq(tasksTable.id, taskId))
    .returning();

  res.json(updated[0]);
});

// DELETE /api/tasks/:taskId
router.delete("/tasks/:taskId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const taskId = parseInt(req.params.taskId as string);
  const userId = req.dbUser!.id;

  const task = await db.query.tasksTable.findFirst({ where: eq(tasksTable.id, taskId) });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const member = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, task.projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!member || (member.role !== "admin" && task.createdById !== userId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
  res.status(204).send();
});

export default router;
