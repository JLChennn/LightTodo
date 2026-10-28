export type Period = 'today' | 'week' | 'month' | 'year';
export type Color = 'mint' | 'blue' | 'peach' | 'lavender';
export interface Todo {
  id: string;
  title: string;
  notes: string;
  date: string;
  done: boolean;
  color: Color;
  createdAt: string;
}
export interface Data {
  version: 1;
  todos: Todo[];
}
export interface Settings {
  language: 'zh' | 'en';
  alwaysOnTop: boolean;
  opacity: number;
  autoStart: boolean;
}
export interface Snapshot {
  data: Data;
  settings: Settings;
  dataDir: string;
  recovered: boolean;
  platform: string;
  version: string;
  startupSupported: boolean;
}
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function periodRange(period: Period, now = new Date()): [string, string] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(+start);
    end.setDate(end.getDate() + 6);
  }
  if (period === 'month') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  if (period === 'year') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  return [dateKey(start), dateKey(end)];
}
export function selectTodos(
  todos: Todo[],
  period: Period,
  query: string,
  now = new Date(),
): Todo[] {
  const [start, end] = periodRange(period, now),
    today = dateKey(now),
    q = query.trim().toLocaleLowerCase();
  return todos
    .filter(
      (t) =>
        ((t.date >= start && t.date <= end) || (period === 'today' && !t.done && t.date < today)) &&
        (!q || `${t.title}\n${t.notes}`.toLocaleLowerCase().includes(q)),
    )
    .sort((a, b) => Number(a.done) - Number(b.done));
}

// Only reorder slots visible in the same completion group. Hidden tasks retain their positions.
export function reorderTodos(
  todos: Todo[],
  visibleIds: string[],
  sourceId: string,
  targetId: string,
): Todo[] {
  const source = todos.find((t) => t.id === sourceId),
    target = todos.find((t) => t.id === targetId);
  if (!source || !target || source.done !== target.done || sourceId === targetId) return todos;
  const allowed = new Set(visibleIds);
  const group = todos.filter((t) => allowed.has(t.id) && t.done === source.done);
  const from = group.findIndex((t) => t.id === sourceId),
    to = group.findIndex((t) => t.id === targetId);
  if (from < 0 || to < 0) return todos;
  group.splice(to, 0, group.splice(from, 1)[0]);
  let index = 0;
  return todos.map((t) => (allowed.has(t.id) && t.done === source.done ? group[index++] : t));
}
