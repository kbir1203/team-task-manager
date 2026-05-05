import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  dbUser?: typeof usersTable.$inferSelect;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, userId),
    });

    if (!user) {
      res.status(401).json({ error: "User not found. Please complete sign-up." });
      return;
    }

    req.dbUser = user;
    next();
  } catch (err) {
    req.log.error({ err }, "Error fetching user from DB");
    res.status(500).json({ error: "Internal server error" });
  }
}
