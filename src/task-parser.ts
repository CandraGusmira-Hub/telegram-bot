
import type { Category, Priority } from "./types.js";

const categoryAliases: Record<string, Category> = {
  website: "website",
  web: "website",
  design: "design",
  desain: "design",
  editing: "design",
  personal: "personal",
  pribadi: "personal",
  client: "client",
  klien: "client",
  business: "business",
  bisnis: "business",
  idea: "idea",
  ide: "idea",
  other: "other",
  lainnya: "other",
};

export function extractPriority(text: string): {
  priority: Priority;
  cleanedText: string;
} {
  const match = text.match(
    /\b(?:prioritas|priority)\s*[:=]?\s*(rendah|low|sedang|medium|normal|tinggi|high|urgent)\b/i,
  );

  if (!match) {
    return { priority: "medium", cleanedText: text };
  }

  const value = match[1]?.toLowerCase();
  let priority: Priority = "medium";

  if (value === "rendah" || value === "low") {
    priority = "low";
  } else if (
    value === "tinggi" ||
    value === "high" ||
    value === "urgent"
  ) {
    priority = "high";
  }

  return {
    priority,
    cleanedText: text
      .replace(match[0], " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

export function extractCategory(text: string): {
  category: Category;
  cleanedText: string;
} {
  const match = text.match(
    /\bkategori\s*[:=]\s*([a-z]+)\b/i,
  );

  if (!match) {
    return { category: "other", cleanedText: text };
  }

  const categoryName = match[1]?.toLowerCase();
  const category = categoryName
    ? categoryAliases[categoryName]
    : undefined;

  if (!category) {
    return { category: "other", cleanedText: text };
  }

  return {
    category,
    cleanedText: text
      .replace(match[0], " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}
