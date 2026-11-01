
import "dotenv/config";
import { Bot } from "grammy";
import { registerCommands } from "./commands.js";
import { checkReminders } from "./reminders.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error(
    "TELEGRAM_BOT_TOKEN belum diatur. Periksa file .env.",
  );
}

const bot = new Bot(token);

registerCommands(bot);

let reminderCheckRunning = false;

async function runReminderCheck(): Promise<void> {
  if (reminderCheckRunning) return;

  reminderCheckRunning = true;

  try {
    await checkReminders(bot);
  } catch (error) {
    console.error("Pemeriksaan pengingat gagal:", error);
  } finally {
    reminderCheckRunning = false;
  }
}

bot.catch((error) => {
  console.error("Terjadi kesalahan pada bot:", error);
});

async function main(): Promise<void> {
  await bot.api.deleteWebhook({ drop_pending_updates: false });

  await bot.start({
    onStart: (info) => {
      console.log(`Bot @${info.username} berhasil dijalankan.`);
    },
  });
}

void main().catch((error: unknown) => {
  console.error("Bot gagal dijalankan:", error);
  process.exitCode = 1;
});

const reminderTimer = setInterval(() => {
  void runReminderCheck();
}, 30_000);

void runReminderCheck();

function shutdown(signal: string): void {
  console.log(`Menerima ${signal}; menghentikan bot...`);
  clearInterval(reminderTimer);
  bot.stop();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
