/**
 * Jira Clone - TypeScript Interfaces
 * สอดคล้องกับ Supabase Schema
 */

// ============ Enums / Union Types ============

export type SprintStatus = "planned" | "active" | "completed";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskType = "story" | "task" | "bug" | "subtask";

export type EpicStatus = "open" | "in_progress" | "done";

// ============ Database Entities ============

export interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  project_key: string;
  last_ticket_number: number;
  created_at?: string;
  updated_at?: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  status: SprintStatus;
  start_date: string | null;
  end_date: string | null;
  actual_end_date: string | null;
  goal: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Epic {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: EpicStatus;
  position: number;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  project_id: string;
  sprint_id: string | null;
  type: TaskType;
  parent_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  position: number;
  board_position: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  ticket_number: number;
  ticket_key: string;
  epic_id: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============ Relations (with joined data) ============

export interface Attachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  created_at?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_name: string;
  author_id: string | null;
  content: string;
  created_at?: string;
}

export interface TaskCommentWithUser extends TaskComment {
  user?: { id: string; name: string; avatar_url: string | null } | null;
}

export interface TaskWithAssignee extends Task {
  assignee?: User | null;
}

export interface EpicWithProject extends Epic {
  project?: Project | null;
}

export interface SprintWithTasks extends Sprint {
  tasks?: TaskWithAssignee[];
}

export interface ProjectWithSprints extends Project {
  sprints?: SprintWithTasks[];
}

// ============ Insert / Update (optional fields) ============

export type UserInsert = Omit<User, "id"> & Partial<Pick<User, "id">>;
export type UserUpdate = Partial<Omit<User, "id">>;

export type ProjectInsert = Omit<
  Project,
  "id" | "project_key" | "last_ticket_number"
> &
  Partial<Pick<Project, "id" | "project_key" | "last_ticket_number">>;
export type ProjectUpdate = Partial<Omit<Project, "id">>;

export type SprintInsert = Omit<Sprint, "id"> & Partial<Pick<Sprint, "id">>;
export type SprintUpdate = Partial<Omit<Sprint, "id">>;

export type EpicInsert = Omit<Epic, "id"> & Partial<Pick<Epic, "id">>;
export type EpicUpdate = Partial<Omit<Epic, "id">>;

export type TaskInsert = Omit<
  Task,
  "id" | "ticket_number" | "ticket_key"
> &
  Partial<Pick<Task, "id" | "ticket_number" | "ticket_key">>;
export type TaskUpdate = Partial<Omit<Task, "id">>;

export type AttachmentInsert = Omit<Attachment, "id" | "created_at"> &
  Partial<Pick<Attachment, "id">>;
export type AttachmentUpdate = Partial<Omit<Attachment, "id" | "task_id">>;

export type TaskCommentInsert = Omit<TaskComment, "id" | "created_at"> &
  Partial<Pick<TaskComment, "id">>;
