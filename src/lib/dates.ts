/** Adds business days (Mon–Fri) to a date. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

/** Earliest arrival = production lead time + transit, both in business days. */
export function earliestArrival(leadDays: number, transitDays: number, from = new Date()): Date {
  return addBusinessDays(from, leadDays + transitDays);
}

export const formatDay = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
