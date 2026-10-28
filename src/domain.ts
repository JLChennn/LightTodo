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
}
export interface Snapshot {
  data: Data;
  settings: Settings;
  dataDir: string;
  recovered: boolean;
  platform: string;
  version: string;
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
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        a.date.localeCompare(b.date) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}
