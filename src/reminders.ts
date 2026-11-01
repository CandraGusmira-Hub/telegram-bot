
import type { Bot } from "grammy";
import {
  loadReminderLogs,
  loadTasks,
  saveReminderLogs,
} from "./storage.js";
import { formatDeadline } from "./time.js";
import {
  priorityLabels,
  type ReminderLog,
} from "./types.js";

const UPCOMING_WINDOW_MS = 60 * 60 * 1000;

export async function checkReminders(
  bot: Bot,
): Promise<void> {
  const [tasks, logs] = await Promise.all([
    loadTasks(),
    loadReminderLogs(),
  ]);

  const now = Date.now();
  const newLogs: ReminderLog[] = [];

  for (const task of tasks) {
    if (task.status !== "pending" || !task.deadline) continue;

    const deadlineMs = new Date(task.deadline).getTime();

    if (Number.isNaN(deadlineMs)) continue;

    const overdue = deadlineMs <= now;
    const upcoming =
      !overdue && deadlineMs - now <= UPCOMING_WINDOW_MS;

    if (!overdue && !upcoming) continue;

    const type = overdue ? "overdue" : "upcoming";

    const alreadySent = logs.some(
      (log) => log.taskId === task.id && log.type === type,
    );

    if (alreadySent) continue;

    const message = overdue
      ? [
          "🚨 DEADLINE TERLEWAT",
          "",
          `📌 ${task.title}`,
          `⚡ Prioritas: ${priorityLabels[task.priority]}`,
          `📅 Deadline: ${formatDeadline(task.deadline)}`,
          "",
          "Tugas ini masih berstatus belum selesai.",
          `Gunakan /done ${task.id} jika sudah selesai.`,
        ].join("\n")
      : [
          "⏰ PENGINGAT DEADLINE",
          "",
          `📌 ${task.title}`,
          `⚡ Prioritas: ${priorityLabels[task.priority]}`,
          `📅 Deadline: ${formatDeadline(task.deadline)}`,
          "",
          `Gunakan /done ${task.id} setelah tugas selesai.`,
        ].join("\n");

    try {
      await bot.api.sendMessage(task.userId, message);

      newLogs.push({
        taskId: task.id,
        type,
        sentAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `Gagal mengirim pengingat untuk tugas ${task.id}:`,
        error,
      );
    }
  }

  if (newLogs.length > 0) {
    await saveReminderLogs([...logs, ...newLogs]);
  }
}
