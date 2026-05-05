import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { UpdateMeBody } from "@workspace/api-zod";

const router = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(req.dbUser);
});

// PATCH /api/users/me
router.patch("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updated = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.dbUser!.id))
    .returning();

  res.json(updated[0]);
});

// GET /api/users — list all users for assignment dropdowns
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const users = await db.select().from(usersTable);
  res.json(users);
});

// POST /api/users/sync — called after Clerk sign-in to create/sync user in DB
router.post("/sync", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { email, name, avatarUrl } = req.body as {
    email: string;
    name: string;
    avatarUrl?: string;
  };

  if (!email || !name) {
    res.status(400).json({ error: "email and name are required" });
    return;
  }

  try {
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, userId),
    });

    if (!user) {
      const inserted = await db
        .insert(usersTable)
        .values({ clerkId: userId, email, name, avatarUrl: avatarUrl ?? null })
        .returning();
      user = inserted[0];
    } else {
      const updated = await db
        .update(usersTable)
        .set({ email, name, avatarUrl: avatarUrl ?? user.avatarUrl })
        .where(eq(usersTable.clerkId, userId))
        .returning();
      user = updated[0];
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Error syncing user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
