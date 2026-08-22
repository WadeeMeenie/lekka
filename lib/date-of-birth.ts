export type DateParts = { year: number | null; month: number | null; day: number | null };

export const MIN_BIRTH_YEAR = 1900;

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function parseDateParts(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: null, month: null, day: null };
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function daysInMonth(year: number | null, month: number | null): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

export function formatDateParts(parts: DateParts): string {
  if (!parts.year || !parts.month || !parts.day) return "";
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function clampDateParts(parts: DateParts): DateParts {
  if (!parts.year || !parts.month || !parts.day) return parts;
  return { ...parts, day: Math.min(parts.day, daysInMonth(parts.year, parts.month)) };
}

export function displayMonth(month: number | null): string {
  if (!month) return "Month";
  return new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" });
}
