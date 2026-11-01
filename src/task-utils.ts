
import { formatDeadline } from "./time.js";
import {
  categoryLabels,
  priorityLabels,
  type Task,
} from "./types.js";

export function taskSummary(task: Task): string {
  const status = task.status === "done" ? "Selesai" : "Belum selesai";
  const deadline = formatDeadline(task.deadline);

  return [
    `🆔 ID: ${task.id}`,
    `📌 ${task.title}`,
    `📂 Kategori: ${categoryLabels[task.category]}`,
    `⚡ Prioritas: ${priorityLabels[task.priority]}`,
    `📅 Deadline: ${deadline}`,
    `📍 Status: ${status}`,
  ].join("\n");
}
