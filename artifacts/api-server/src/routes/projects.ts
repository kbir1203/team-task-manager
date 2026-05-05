import { Router } from "express";
import { db, projectsTable, projectMembersTable, tasksTable, usersTable } from "@workspace/db";
import { eq, and, count, lt, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { CreateProjectBody, UpdateProjectBody, AddProjectMemberBody } from "@workspace/api-zod";

const router = Router();

// GET /api/projects
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
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

  const now = new Date();

  const projects = await db.select().from(projectsTable).where(
    sql`${projectsTable.id} = ANY(${sql.raw("ARRAY[" + projectIds.join(",") + "]::int[]")})`
  );

  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const [memberCount] = await db
        .select({ count: count() })
        .from(projectMembersTable)
        .where(eq(projectMembersTable.projectId, project.id));

      const [taskCount] = await db
        .select({ count: count() })
        .from(tasksTable)
        .where(eq(tasksTable.projectId, project.id));

      const [completedTaskCount] = await db
        .select({ count: count() })
        .from(tasksTable)
        .where(and(eq(tasksTable.projectId, project.id), eq(tasksTable.status, "done")));

      const [overdueTaskCount] = await db
        .select({ count: count() })
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.projectId, project.id),
            sql`${tasksTable.dueDate} IS NOT NULL`,
            lt(tasksTable.dueDate, now),
            sql`${tasksTable.status} != 'done'`
          )
        );

      return {
        ...project,
        memberCount: memberCount.count,
        taskCount: taskCount.count,
        completedTaskCount: completedTaskCount.count,
        overdueTaskCount: overdueTaskCount.count,
      };
    })
  );

  res.json(projectsWithStats);
});

// POST /api/projects
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const user = req.dbUser!;

  const inserted = await db
    .insert(projectsTable)
    .values({ ...parsed.data, ownerId: user.id })
    .returning();

  const project = inserted[0];

  // Auto-add creator as admin member
  await db.insert(projectMembersTable).values({
    projectId: project.id,
    userId: user.id,
    role: "admin",
  });

  res.status(201).json(project);
});

// GET /api/projects/:projectId
router.get("/:projectId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.dbUser!.id;

  const project = await db.query.projectsTable.findFirst({
    where: eq(projectsTable.id, projectId),
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const member = await db.query.projectMembersTable.findFirst({
    where: and(
      eq(projectMembersTable.projectId, projectId),
      eq(projectMembersTable.userId, userId)
    ),
  });

  if (!member) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const now = new Date();
  const [memberCount] = await db.select({ count: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, projectId));
  const [taskCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const [completedTaskCount] = await db.select({ count: count() }).from(tasksTable).where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.status, "done")));
  const [overdueTaskCount] = await db.select({ count: count() }).from(tasksTable).where(and(eq(tasksTable.projectId, projectId), sql`${tasksTable.dueDate} IS NOT NULL`, lt(tasksTable.dueDate, now), sql`${tasksTable.status} != 'done'`));

  res.json({ ...project, memberCount: memberCount.count, taskCount: taskCount.count, completedTaskCount: completedTaskCount.count, overdueTaskCount: overdueTaskCount.count });
});

// PATCH /api/projects/:projectId
router.patch("/:projectId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.dbUser!.id;

  const member = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!member || member.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updated = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, projectId))
    .returning();

  if (!updated[0]) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(updated[0]);
});

// DELETE /api/projects/:projectId
router.delete("/:projectId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.dbUser!.id;

  const member = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!member || member.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  res.status(204).send();
});

// GET /api/projects/:projectId/members
router.get("/:projectId/members", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.dbUser!.id;

  const callerMember = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!callerMember) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const members = await db
    .select({
      id: projectMembersTable.id,
      projectId: projectMembersTable.projectId,
      userId: projectMembersTable.userId,
      role: projectMembersTable.role,
      joinedAt: projectMembersTable.joinedAt,
      user: usersTable,
    })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
    .where(eq(projectMembersTable.projectId, projectId));

  res.json(members);
});

// POST /api/projects/:projectId/members
router.post("/:projectId/members", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.dbUser!.id;

  const callerMember = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, userId)),
  });

  if (!callerMember || callerMember.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const newMember = await db
    .insert(projectMembersTable)
    .values({ projectId, userId: parsed.data.userId, role: parsed.data.role ?? "member" })
    .returning();

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, parsed.data.userId) });

  res.status(201).json({ ...newMember[0], user });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete("/:projectId/members/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const projectId = parseInt(req.params.projectId as string);
  const targetUserId = parseInt(req.params.userId as string);
  const callerId = req.dbUser!.id;

  const callerMember = await db.query.projectMembersTable.findFirst({
    where: and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, callerId)),
  });

  if (!callerMember || callerMember.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  await db.delete(projectMembersTable).where(
    and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, targetUserId))
  );

  res.status(204).send();
});

export default router;
