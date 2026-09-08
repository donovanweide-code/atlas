export type WorkItemType = "TASK" | "APPOINTMENT";
export type RelatedEntityType = "CONTACT" | "CUSTOMER" | "ORDER" | "WEBSHOP_ORDER" | "EMAIL" | "DOCUMENT" | "SUPPLIER" | "TEAMWEAR" | "PRODUCTION_CONTEXT";
export interface WorkItemRelation { entityType: RelatedEntityType; entityId: string; displayLabel: string; }
export interface WorkItem {
  id: string; workspaceId: string; type: WorkItemType; title: string; description: string;
  createdBy: string; owner: string; sharedWith: string[]; sharedWithTeams: string[];
  dueDate: string | null; startTime: string | null; endTime: string | null; timeZone: "Europe/Amsterdam";
  status: "OPEN" | "COMPLETED"; createdAt: string; updatedAt: string;
  completedAt: string | null; completedBy: string | null; revision: number;
  relatedEntities: WorkItemRelation[];
  permissions?: Record<"view" | "edit" | "assign" | "share" | "note" | "complete" | "delete", boolean>;
  notes: { id: string; author: string; at: string; text: string }[];
  activity: { id: string; actor: string; at: string; action: string; fields?: string[] }[];
}
/** Future connectors are PERSONAL projections. Their credentials/private events never belong on WorkItem. */
export interface PersonalCalendarProjection {
  userId: string; connectionId: string; externalAccountId: string; calendarId: string;
  purpose: "WORK" | "PRIVATE"; isDefault: boolean; workItemId: string; projectionRequested: boolean;
}
export interface WorkItemCompletedEvent {
  id: string; type: "WORK_ITEM_COMPLETED"; version: 1; workspaceId: string;
  workItemId: string; completedBy: string; completedAt: string; revision: number;
}
export function localDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10);
}
export function validDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function todayIdentity(name: string, now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "numeric", hourCycle: "h23" }).format(now));
  const day = new Date(`${localDay(now)}T12:00:00Z`); const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const week = Math.ceil((((day.getTime() - Date.UTC(day.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7);
  const date = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "long", day: "numeric", month: "long" }).format(now);
  const time = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" }).format(now);
  return { greeting: `${hour < 6 ? "Goedenacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond"}, ${name.split(" ")[0]}`, dateLine: `${date.charAt(0).toUpperCase()}${date.slice(1)} · ${time} · week ${week}` };
}
export function projectWorkItems(items: WorkItem[], now = new Date()) {
  const today = localDay(now);
  const open = items.filter(item => item.status === "OPEN").sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || (a.startTime || "").localeCompare(b.startTime || "") || a.createdAt.localeCompare(b.createdAt));
  return {
    today: open.filter(item => item.dueDate === today),
    overdue: open.filter(item => item.type === "TASK" && item.dueDate && item.dueDate < today),
    upcoming: open.filter(item => !item.dueDate || item.dueDate > today),
    pastAppointments: open.filter(item => item.type === "APPOINTMENT" && item.dueDate && item.dueDate < today),
    completed: items.filter(item => item.status === "COMPLETED").sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || "")),
  };
}
/** Conservative Dutch capture: one date token, optional one unambiguous HH:mm, exact first-name prefix. */
export function parseQuickCapture(input: string, users: { id: string; name: string }[] = [], now = new Date()) {
  let title = input.trim(); let dueDate: string | null = null; let startTime: string | null = null; let owner: string | null = null;
  const first = title.match(/^([\p{L}]+)[,\s]+/u);
  const matches = first ? users.filter(user => user.name.toLocaleLowerCase("nl").split(" ")[0] === first[1].toLocaleLowerCase("nl")) : [];
  if (matches.length === 1) { owner = matches[0].id; title = title.slice(first![0].length); }
  const dateTokens = [...title.matchAll(/\b(vandaag|morgen|overmorgen|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/gi)];
  const uncertain = /\b(volgende|aanstaande|misschien|of|ergens|rond)\b/i.test(title);
  if (dateTokens.length === 1 && !uncertain) {
    const token = dateTokens[0][0].toLowerCase(); const today = localDay(now);
    if (["vandaag", "morgen", "overmorgen"].includes(token)) dueDate = addDays(today, ["vandaag", "morgen", "overmorgen"].indexOf(token));
    else if (["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"].includes(token)) {
      const target = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"].indexOf(token);
      dueDate = addDays(today, (target - new Date(`${today}T12:00:00Z`).getUTCDay() + 7) % 7);
    } else {
      const parts = token.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      const candidate = parts ? `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}` : token;
      if (validDay(candidate)) dueDate = candidate;
    }
    if (dueDate) title = title.replace(dateTokens[0][0], "").trim();
  }
  const times = [...title.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)];
  if (times.length === 1 && !uncertain) { startTime = `${times[0][1].padStart(2, "0")}:${times[0][2]}`; title = title.replace(times[0][0], "").trim(); }
  return { title: title.replace(/\s+/g, " "), dueDate, startTime, owner, needsDateChoice: (dateTokens.length > 0 && !dueDate) || uncertain };
}
