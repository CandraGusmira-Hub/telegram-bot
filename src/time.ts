
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const monthNames: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
};

function makeWibDate(
  year: number,
  month: number,
  day: number,
  hour = 23,
  minute = 59,
): Date {
  return new Date(
    Date.UTC(year, month, day, hour, minute) - WIB_OFFSET_MS,
  );
}

function wibParts(date: Date) {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function formatDeadline(deadline?: string | null): string {
  if (!deadline) return "Tidak ada deadline";

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) return "Deadline tidak valid";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date) + " WIB";
}

export function parseDeadline(text: string): {
  deadline: string | null;
  cleanedText: string;
  error?: string;
} {
  let cleanedText = text;
  const now = new Date();

  // Durasi relatif: 10 menit, dalam 2 jam, deadline 3 hari.
  const relativeMatch = cleanedText.match(
    /\b(?:deadline\s+|dalam\s+)?(\d+)\s*(menit|jam|hari)\b/i,
  );

  if (relativeMatch?.[1] && relativeMatch[2]) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();

    if (amount < 1) {
      return {
        deadline: null,
        cleanedText,
        error: "Durasi deadline harus minimal 1 menit.",
      };
    }

    const multiplier =
      unit === "menit"
        ? 60_000
        : unit === "jam"
          ? 3_600_000
          : 86_400_000;

    const deadline = new Date(now.getTime() + amount * multiplier);

    cleanedText = cleanedText.replace(relativeMatch[0], " ").trim();

    return {
      deadline: deadline.toISOString(),
      cleanedText,
    };
  }

  // Tanggal ISO: 2026-11-05.
  const isoMatch = cleanedText.match(
    /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/,
  );

  // Tanggal lokal: 5 November atau 5 November 2026.
  const localMatch = cleanedText.match(
    /\b(?:tanggal\s+)?(\d{1,2})\s+(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|september|sep|oktober|okt|november|nov|desember|des)(?:\s+(20\d{2}))?\b/i,
  );

  // Kata hari: hari ini, besok, lusa.
  const dayMatch = cleanedText.match(/\b(hari ini|besok|lusa)\b/i);

  // Jam: jam 15.00, jam 15:30, atau 15:30.
  const timeMatch = cleanedText.match(
    /\b(?:jam\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)\b/i,
  );

  let year: number;
  let month: number;
  let day: number;

  const today = wibParts(now);

  if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]) - 1;
    day = Number(isoMatch[3]);
  } else if (localMatch?.[1] && localMatch[2]) {
    day = Number(localMatch[1]);
    const parsedMonth = monthNames[localMatch[2].toLowerCase()];

    if (parsedMonth === undefined) {
      return {
        deadline: null,
        cleanedText,
        error: "Nama bulan tidak dikenali.",
      };
    }

    month = parsedMonth;
    year = localMatch[3] ? Number(localMatch[3]) : today.year;
  } else if (dayMatch?.[1]) {
    const offset =
      dayMatch[1].toLowerCase() === "besok"
        ? 1
        : dayMatch[1].toLowerCase() === "lusa"
          ? 2
          : 0;

    const base = makeWibDate(today.year, today.month, today.day);
    base.setUTCDate(base.getUTCDate() + offset);

    const parts = wibParts(base);
    year = parts.year;
    month = parts.month;
    day = parts.day;
  } else if (timeMatch?.[1] && timeMatch[2]) {
    // Jika hanya jam yang diberikan, gunakan hari ini.
    year = today.year;
    month = today.month;
    day = today.day;
  } else {
    return {
      deadline: null,
      cleanedText,
    };
  }

  const hour = timeMatch?.[1] ? Number(timeMatch[1]) : 23;
  const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 59;

  const deadlineDate = makeWibDate(year, month, day, hour, minute);

  // Menolak tanggal yang tidak valid, misalnya 31 Februari.
  const actual = wibParts(deadlineDate);

  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    return {
      deadline: null,
      cleanedText,
      error: "Tanggal atau jam tidak valid.",
    };
  }

  if (deadlineDate.getTime() <= now.getTime()) {
    return {
      deadline: null,
      cleanedText,
      error: "Deadline harus berada di masa depan.",
    };
  }

  if (isoMatch) cleanedText = cleanedText.replace(isoMatch[0], " ");
  if (localMatch) cleanedText = cleanedText.replace(localMatch[0], " ");
  if (dayMatch) cleanedText = cleanedText.replace(dayMatch[0], " ");
  if (timeMatch) cleanedText = cleanedText.replace(timeMatch[0], " ");

  cleanedText = cleanedText
    .replace(/\bdeadline\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    deadline: deadlineDate.toISOString(),
    cleanedText,
  };
}
