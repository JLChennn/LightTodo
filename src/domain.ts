export type Period = 'today' | 'week' | 'month' | 'year' | 'memo';
export type Color = 'mint' | 'blue' | 'peach' | 'lavender';
export interface Todo {
  list?: Period;
  id: string;
  title: string;
  notes: string;
  date: string;
  done: boolean;
  color?: Color; // Legacy backup metadata; never used for presentation.
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
  fontSize: number;
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
// Old notes had a separate title. Fold it into the body once, without losing text.
export function memoText(task: Todo): string {
  if (!task.notes.trim()) return task.title;
  if (memoTitle(task.notes) === task.title) return task.notes;
  return `${task.title}\n\n${task.notes}`;
}
export function memoTitle(body: string): string {
  return body
    .trim()
    .split(/\r?\n/)[0]
    .trim()
    .slice(0, 200)
    .replace(/[\uD800-\uDBFF]$/, '');
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
  const q = query.trim().toLocaleLowerCase();
  return todos
    .filter(
      (t) =>
        (t.list || 'today') === period &&
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
  if (
    !source ||
    !target ||
    source.done !== target.done ||
    (source.list || 'today') !== (target.list || 'today') ||
    sourceId === targetId
  )
    return todos;
  const allowed = new Set(visibleIds);
  const group = todos.filter((t) => allowed.has(t.id) && t.done === source.done);
  const from = group.findIndex((t) => t.id === sourceId),
    to = group.findIndex((t) => t.id === targetId);
  if (from < 0 || to < 0) return todos;
  group.splice(to, 0, group.splice(from, 1)[0]);
  let index = 0;
  return todos.map((t) => (allowed.has(t.id) && t.done === source.done ? group[index++] : t));
}
