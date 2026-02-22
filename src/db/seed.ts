import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hash } from "bcryptjs";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://taskforge:taskforge@localhost:5432/taskforge";

async function seed() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("🌱 Seeding database...");

  // Create a demo user
  const passwordHash = await hash("password123", 12);
  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Demo User",
      email: "demo@taskforge.dev",
      passwordHash,
    })
    .returning();
  console.log("✅ Created user:", user.email);

  // Create a workspace
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      name: "Demo Workspace",
      slug: "demo-workspace",
      ownerId: user.id,
    })
    .returning();
  console.log("✅ Created workspace:", workspace.name);

  // Add user as workspace owner
  await db.insert(schema.workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
  });
  console.log("✅ Added user as workspace owner");

  // Create labels
  const labelColors = [
    { name: "Bug", color: "#ef4444" },
    { name: "Feature", color: "#3b82f6" },
    { name: "Enhancement", color: "#8b5cf6" },
    { name: "Documentation", color: "#10b981" },
    { name: "Design", color: "#f59e0b" },
  ];

  const createdLabels = await db
    .insert(schema.labels)
    .values(labelColors.map((l) => ({ ...l, workspaceId: workspace.id })))
    .returning();
  console.log("✅ Created labels:", createdLabels.length);

  // Create a space
  const [space] = await db
    .insert(schema.spaces)
    .values({
      workspaceId: workspace.id,
      name: "Product Development",
      description: "Main product development space",
      color: "#6366f1",
      icon: "rocket",
      order: 0,
    })
    .returning();
  console.log("✅ Created space:", space.name);

  // Create a folder
  const [folder] = await db
    .insert(schema.folders)
    .values({
      spaceId: space.id,
      name: "Backend",
      order: 0,
    })
    .returning();
  console.log("✅ Created folder:", folder.name);

  // Create a list inside the folder
  const [backendList] = await db
    .insert(schema.lists)
    .values({
      folderId: folder.id,
      spaceId: space.id,
      name: "API Development",
      description: "Backend API tasks",
      order: 0,
    })
    .returning();
  console.log("✅ Created list:", backendList.name);

  // Create a folderless list
  const [designList] = await db
    .insert(schema.lists)
    .values({
      spaceId: space.id,
      name: "Design Tasks",
      description: "UI/UX design tasks",
      order: 1,
    })
    .returning();
  console.log("✅ Created folderless list:", designList.name);

  // Create statuses for both lists
  const statusSets = [backendList.id, designList.id];
  for (const listId of statusSets) {
    await db.insert(schema.statuses).values([
      { listId, name: "To Do", color: "#94a3b8", order: 0, isDefault: true },
      { listId, name: "In Progress", color: "#3b82f6", order: 1, isDefault: false },
      { listId, name: "In Review", color: "#f59e0b", order: 2, isDefault: false },
      { listId, name: "Done", color: "#10b981", order: 3, isDefault: false },
      { listId, name: "Closed", color: "#6b7280", order: 4, isDefault: false },
    ]);
  }
  console.log("✅ Created statuses for lists");

  // Create tasks in the backend list
  const backendTasks = [
    {
      title: "Set up authentication system",
      description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Implement NextAuth.js with credentials and OAuth providers" }] }] },
      status: "done",
      priority: "high" as const,
      order: 0,
    },
    {
      title: "Design database schema",
      description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Create Drizzle ORM schema with all required tables" }] }] },
      status: "done",
      priority: "urgent" as const,
      order: 1,
    },
    {
      title: "Implement workspace CRUD API",
      description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Create REST endpoints for workspace management" }] }] },
      status: "in_progress",
      priority: "high" as const,
      order: 2,
    },
    {
      title: "Add real-time collaboration",
      description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Implement WebSocket-based real-time updates for task changes" }] }] },
      status: "todo",
      priority: "medium" as const,
      order: 3,
    },
    {
      title: "Implement file upload system",
      description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Set up MinIO integration for S3-compatible file storage" }] }] },
      status: "todo",
      priority: "low" as const,
      order: 4,
    },
  ];

  for (const taskData of backendTasks) {
    const [task] = await db
      .insert(schema.tasks)
      .values({
        listId: backendList.id,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        creatorId: user.id,
        order: taskData.order,
      })
      .returning();

    // Add task assignee
    await db.insert(schema.taskAssignees).values({
      taskId: task.id,
      userId: user.id,
    });

    // Add activity log
    await db.insert(schema.taskActivities).values({
      taskId: task.id,
      userId: user.id,
      action: "created",
    });
  }
  console.log("✅ Created", backendTasks.length, "backend tasks");

  // Create tasks in the design list
  const designTasks = [
    {
      title: "Design dashboard layout",
      status: "in_progress",
      priority: "high" as const,
      order: 0,
    },
    {
      title: "Create component library",
      status: "todo",
      priority: "medium" as const,
      order: 1,
    },
    {
      title: "Design task detail view",
      status: "todo",
      priority: "medium" as const,
      order: 2,
    },
  ];

  for (const taskData of designTasks) {
    const [task] = await db
      .insert(schema.tasks)
      .values({
        listId: designList.id,
        title: taskData.title,
        description: {},
        status: taskData.status,
        priority: taskData.priority,
        creatorId: user.id,
        order: taskData.order,
      })
      .returning();

    await db.insert(schema.taskAssignees).values({
      taskId: task.id,
      userId: user.id,
    });
  }
  console.log("✅ Created", designTasks.length, "design tasks");

  // Create a sprint
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  await db.insert(schema.sprints).values({
    workspaceId: workspace.id,
    name: "Sprint 1",
    startDate: now,
    endDate: twoWeeksFromNow,
    status: "active",
    goal: "Complete Phase 1 foundation",
  });
  console.log("✅ Created sprint");

  // Create a board view
  await db.insert(schema.views).values({
    listId: backendList.id,
    name: "Board View",
    type: "board",
    filters: {},
    sort: { field: "order", direction: "asc" },
  });
  console.log("✅ Created view");

  // Create custom field definitions
  await db.insert(schema.customFieldDefinitions).values([
    {
      listId: backendList.id,
      name: "Story Points",
      type: "number",
      options: {},
      order: 0,
    },
    {
      listId: backendList.id,
      name: "Sprint",
      type: "select",
      options: { choices: ["Sprint 1", "Sprint 2", "Sprint 3", "Backlog"] },
      order: 1,
    },
    {
      listId: backendList.id,
      name: "Blocked",
      type: "checkbox",
      options: {},
      order: 2,
    },
  ]);
  console.log("✅ Created custom field definitions");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📝 Demo credentials:");
  console.log("   Email: demo@taskforge.dev");
  console.log("   Password: password123\n");

  await client.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
