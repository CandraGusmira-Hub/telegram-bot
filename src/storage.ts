
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ReminderLog, Task } from "./types.js";

const DATA_FILE = resolve(process.cwd(), "tasks.json");
const REMINDER_LOG_FILE = resolve(process.cwd(), "reminder-logs.json");

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return fallback;
    }

    throw error;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function loadTasks(): Promise<Task[]> {
  return readJson<Task[]>(DATA_FILE, []);
}

export function saveTasks(tasks: Task[]): Promise<void> {
  return writeJson(DATA_FILE, tasks);
}

export function loadReminderLogs(): Promise<ReminderLog[]> {
  return readJson<ReminderLog[]>(REMINDER_LOG_FILE, []);
}

export function saveReminderLogs(logs: ReminderLog[]): Promise<void> {
  return writeJson(REMINDER_LOG_FILE, logs);
}
