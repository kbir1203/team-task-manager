# Team Task Manager

## Overview

A full-stack team task management web app built with React + Vite frontend, Express 5 API server, PostgreSQL + Drizzle ORM, and Clerk authentication. Supports role-based access control (Admin/Member), project management, task assignment, and a real-time dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: React + Vite (artifacts/team-task-manager)
- **Backend**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (via Replit-managed Clerk)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Features

- **Authentication**: Clerk sign-in/sign-up with branded pages
- **Projects**: Create, manage, archive projects; auto-add creator as admin
- **Team members**: Add/remove members per project with roles (admin/member)
- **Tasks**: Create, assign, set priority/status/due dates within projects
- **Dashboard**: Summary stats (total/todo/in-progress/done/overdue), recent activity, overdue tasks
- **Role-based access**: Admins can manage projects/members; all members can create/update tasks

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Architecture

### API Routes (all under /api)
- `GET/PATCH /users/me` — current user profile
- `POST /users/sync` — sync Clerk user to DB after sign-in
- `GET /users` — list all users (for assignment dropdowns)
- `GET/POST /projects` — list/create projects
- `GET/PATCH/DELETE /projects/:id` — project CRUD
- `GET/POST /projects/:id/members` — list/add project members
- `DELETE /projects/:id/members/:userId` — remove member
- `GET/POST /projects/:id/tasks` — list/create tasks in project
- `GET/PATCH/DELETE /tasks/:id` — task CRUD
- `GET /dashboard/summary` — stats for current user
- `GET /dashboard/recent-activity` — recent task changes
- `GET /dashboard/overdue-tasks` — overdue tasks for user

### DB Schema (lib/db/src/schema/)
- `users` — Clerk-synced user profiles with global role (admin/member)
- `projects` — project records with status (active/archived) and owner
- `project_members` — user-project associations with per-project roles
- `tasks` — task records with status, priority, assignee, due date

### Frontend Pages (artifacts/team-task-manager/src/pages/)
- `/` — public landing page
- `/sign-in`, `/sign-up` — Clerk auth pages
- `/dashboard` — stats overview, recent activity, overdue tasks
- `/projects` — project list with stats
- `/projects/new` — create project form
- `/projects/:id` — project detail with tasks and members tabs
- `/tasks/:id` — task detail page
- `/settings` — user profile settings

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
