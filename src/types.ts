
export type Priority = "low" | "medium" | "high";

export type Category =
  | "website"
  | "design"
  | "personal"
  | "client"
  | "business"
  | "idea"
  | "other";

export type TaskStatus = "pending" | "done";

export interface Task {
  id: string;
  userId: number;
  title: string;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ReminderLog {
  taskId: string;
  type: "upcoming" | "overdue";
  sentAt: string;
}

export const categories: Category[] = [
  "website",
  "design",
  "personal",
  "client",
  "business",
  "idea",
  "other",
];

export const priorityLabels: Record<Priority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

export const categoryLabels: Record<Category, string> = {
  website: "Proyek Website",
  design: "Desain / Editing",
  personal: "Pribadi",
  client: "Pekerjaan Klien",
  business: "Bisnis",
  idea: "Ide",
  other: "Lainnya",
};
