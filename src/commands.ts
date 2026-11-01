import { randomUUID } from "node:crypto";
import type { Bot } from "grammy";
import { parseDeadline } from "./time.js";
import { extractCategory, extractPriority } from "./task-parser.js";
import { loadTasks, saveTasks } from "./storage.js";
import { taskSummary } from "./task-utils.js";
import {
  categories,
  type Task,
} from "./types.js";

export function registerCommands(bot: Bot): void {
  // Memulai bot
  bot.command("start", async (ctx) => {
    await ctx.reply(
      [
        "👋 Halo! Saya bot pengelola pekerjaan kamu.",
        "",
        "Gunakan /help untuk melihat daftar perintah.",
        "",
        "Contoh membuat tugas:",
        "/add Buat landing page deadline 2 jam",
        "/add Edit thumbnail prioritas tinggi",
        "/add Bayar tagihan besok jam 10:00",
      ].join("\n"),
    );
  });

  // Bantuan
  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "📚 DAFTAR PERINTAH",
        "",
        "/start — Memulai bot",
        "/help — Bantuan",
        "/add JUDUL — Membuat tugas",
        "/tasks — Melihat daftar tugas",
        "/done ID — Menandai tugas selesai",
        "/delete ID — Menghapus satu tugas",
        "/clear — Meminta penghapusan semua tugas",
        "/confirm_clear — Konfirmasi penghapusan semua tugas",
        "",
        "Contoh:",
        "/add Buat website deadline 2 jam",
        "/add Edit video prioritas tinggi",
        "/add Kirim revisi tanggal 5 November jam 14:00",
        "",
        "Prioritas: rendah, sedang, tinggi",
        `Kategori: ${categories.join(", ")}`,
        "",
        "Deadline dapat ditulis sebagai:",
        "• deadline 30 menit",
        "• dalam 2 jam",
        "• besok jam 10:00",
        "• 2026-11-05 jam 14:00",
      ].join("\n"),
    );
  });

  // Membuat tugas
  bot.command("add", async (ctx) => {
    if (!ctx.from) return;

    const input = ctx.match.toString().trim();

    if (!input) {
      await ctx.reply(
        "Format: /add Judul tugas deadline 2 jam prioritas tinggi",
      );
      return;
    }

    const parsedTime = parseDeadline(input);

    if (parsedTime.error) {
      await ctx.reply(`❌ ${parsedTime.error}`);
      return;
    }

    let cleanedText = parsedTime.cleanedText;

    const priorityResult = extractPriority(cleanedText);
    cleanedText = priorityResult.cleanedText;

    const categoryResult = extractCategory(cleanedText);
    cleanedText = categoryResult.cleanedText;

    const title = cleanedText
      .replace(/\s+/g, " ")
      .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "")
      .trim();

    if (!title) {
      await ctx.reply(
        "❌ Judul tugas tidak boleh kosong. Contoh: /add Buat desain landing page",
      );
      return;
    }

    const task: Task = {
      id: randomUUID().slice(0, 8),
      userId: ctx.from.id,
      title,
      category: categoryResult.category,
      priority: priorityResult.priority,
      status: "pending",
      deadline: parsedTime.deadline,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    const tasks = await loadTasks();
    tasks.push(task);
    await saveTasks(tasks);

    await ctx.reply(
      [
        "✅ Tugas berhasil dibuat!",
        "",
        taskSummary(task),
      ].join("\n"),
    );
  });

  // Melihat semua tugas milik pengguna
  bot.command("tasks", async (ctx) => {
    if (!ctx.from) return;

    const tasks = (await loadTasks()).filter(
      (task) => task.userId === ctx.from!.id,
    );

    if (tasks.length === 0) {
      await ctx.reply(
        "Belum ada tugas. Tambahkan tugas dengan /add Judul tugas.",
      );
      return;
    }

    const pending = tasks.filter((task) => task.status === "pending");
    const completed = tasks.filter((task) => task.status === "done");

    const sections = [
      `📋 DAFTAR TUGAS (${tasks.length})`,
      "",
      `⏳ BELUM SELESAI (${pending.length})`,
      pending.length > 0
        ? pending.map(taskSummary).join("\n\n──────────\n\n")
        : "Tidak ada tugas yang tertunda.",
      "",
      `✅ SELESAI (${completed.length})`,
      completed.length > 0
        ? completed.map(taskSummary).join("\n\n──────────\n\n")
        : "Belum ada tugas yang selesai.",
    ];

    const message = sections.join("\n");
    const chunks: string[] = [];
    let current = "";

    for (const line of message.split("\n")) {
      if (current.length + line.length + 1 > 3500) {
        if (current.trim()) chunks.push(current);
        current = "";
      }

      current += `${line}\n`;
    }

    if (current.trim()) chunks.push(current);

    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  });

  // Menandai tugas selesai
  bot.command("done", async (ctx) => {
    if (!ctx.from) return;

    const id = ctx.match.toString().trim();

    if (!id) {
      await ctx.reply("Format: /done ID\nContoh: /done a1b2c3d4");
      return;
    }

    const tasks = await loadTasks();
    const task = tasks.find(
      (item) => item.id === id && item.userId === ctx.from!.id,
    );

    if (!task) {
      await ctx.reply("❌ Tugas tidak ditemukan.");
      return;
    }

    if (task.status === "done") {
      await ctx.reply("Tugas ini sudah berstatus selesai.");
      return;
    }

    task.status = "done";
    task.completedAt = new Date().toISOString();

    await saveTasks(tasks);
    await ctx.reply(`✅ Tugas selesai!\n\n${taskSummary(task)}`);
  });

  // Menghapus satu tugas
  bot.command("delete", async (ctx) => {
    if (!ctx.from) return;

    const id = ctx.match.toString().trim();

    if (!id) {
      await ctx.reply(
        "Format: /delete ID\nContoh: /delete a1b2c3d4",
      );
      return;
    }

    const tasks = await loadTasks();
    const taskIndex = tasks.findIndex(
      (item) => item.id === id && item.userId === ctx.from!.id,
    );

    if (taskIndex === -1) {
      await ctx.reply("❌ Tugas tidak ditemukan.");
      return;
    }

    const deletedTask = tasks[taskIndex];

    if (!deletedTask) {
      await ctx.reply("❌ Tugas tidak ditemukan.");
      return;
    }

    tasks.splice(taskIndex, 1);
    await saveTasks(tasks);

    await ctx.reply(
      `🗑️ Tugas berhasil dihapus.\n\n📌 ${deletedTask.title}\n🆔 ID: ${deletedTask.id}`,
    );
  });

  // Meminta konfirmasi sebelum menghapus semua tugas
  bot.command("clear", async (ctx) => {
    if (!ctx.from) return;

    const tasks = await loadTasks();
    const userTasks = tasks.filter(
      (task) => task.userId === ctx.from!.id,
    );

    if (userTasks.length === 0) {
      await ctx.reply("📭 Kamu tidak memiliki tugas untuk dihapus.");
      return;
    }

    await ctx.reply(
      [
        `⚠️ Kamu akan menghapus semua ${userTasks.length} tugas milikmu.`,
        "",
        "Tindakan ini tidak dapat dibatalkan.",
        "",
        "Untuk melanjutkan, kirim:",
        "/confirm_clear",
      ].join("\n"),
    );
  });

  // Menghapus semua tugas milik pengguna
  bot.command("confirm_clear", async (ctx) => {
    if (!ctx.from) return;

    const tasks = await loadTasks();
    const remainingTasks = tasks.filter(
      (task) => task.userId !== ctx.from!.id,
    );

    const deletedCount = tasks.length - remainingTasks.length;

    if (deletedCount === 0) {
      await ctx.reply("📭 Tidak ada tugas yang perlu dihapus.");
      return;
    }

    await saveTasks(remainingTasks);

    await ctx.reply(
      `🗑️ Berhasil menghapus ${deletedCount} tugas milikmu.`,
    );
  });
}
