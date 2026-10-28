import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Check,
  Plus,
  Search,
  Settings2,
  Pin,
  Minus,
  X,
  ArrowUpRight,
  FolderOpen,
  Download,
  Upload,
  ChevronRight,
  Pencil,
  Trash2,
  CalendarDays,
  Leaf,
  CheckCheck,
  Sun,
  Sparkles,
} from 'lucide-react';
import { dateKey, selectTodos } from './domain';
import type { Color, Period, Settings, Snapshot, Todo } from './domain';
import './styles.css';

const copy = {
  zh: {
    today: '今日',
    week: '本周',
    month: '本月',
    year: '今年',
    title: {
      today: '今天，慢慢来。',
      week: '这一周，有条不紊。',
      month: '这个月，稳步向前。',
      year: '这一年，心有所向。',
    },
    subtitle: '留一点空间，给重要的小事。',
    add: '添加待办',
    search: '搜索当前清单…',
    settings: '偏好设置',
    pin: '置顶窗口',
    unpin: '取消置顶',
    minimize: '最小化',
    close: '关闭',
    task: '待办',
    pending: '待完成',
    completed: '已完成',
    overdue: '之前未完成',
    empty: '清单很轻，心也很轻。',
    emptySub: '添加一件小事，从这里开始。',
    noResults: '没有找到相关待办',
    noResultsSub: '试试其他关键词，或切换时间范围。',
    progress: '今日份的小小进步',
    footer: '一步一步，也是在向前。',
    newTask: '记下一件小事',
    editTask: '编辑待办',
    taskTitle: '想做些什么？',
    notes: '备注（选填）',
    date: '计划日期',
    color: '卡片颜色',
    cancel: '取消',
    save: '保存',
    create: '加入清单',
    edit: '编辑',
    delete: '删除',
    deleteTitle: '删除这条待办？',
    deleteSub: '删除后无法撤销。',
    language: '界面语言',
    opacity: '窗口不透明度',
    opacityHint: '向左拖动，让窗口更轻透',
    storage: '本地数据',
    folder: '更换文件夹',
    openFolder: '打开文件夹',
    backup: '导出备份',
    restore: '恢复备份',
    local: '仅在本机保存，不上传个人清单',
    saved: '已保存到本机',
    saving: '正在保存…',
    failed: '保存失败，请重试',
    retry: '重试',
    error: '操作失败',
    doneToast: '已导出备份',
    recovered: '已从自动备份恢复清单，原文件已保留。',
    firstTitle: '给小事，一个安静的角落。',
    firstSub: '欢迎使用 LightTodo。清单默认保存在本机，你也可以选择自己的数据文件夹。',
    begin: '开始记录',
    defaultFolder: '使用默认文件夹',
    loading: '正在打开清单…',
    markDone: '标记完成',
    markUndone: '标记未完成',
    settingsNote: '窗口大小、位置和偏好会自动记住。',
    allDone: '都完成了，给自己一点掌声。',
    palette: { mint: '薄荷绿', blue: '雾蓝', peach: '奶杏', lavender: '淡紫' },
  },
  en: {
    today: 'Today',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    title: {
      today: 'A little less rush.',
      week: 'One gentle week.',
      month: 'Make room to grow.',
      year: 'A year of little steps.',
    },
    subtitle: 'Make space for the little things that matter.',
    add: 'Add a task',
    search: 'Search this list…',
    settings: 'Preferences',
    pin: 'Keep on top',
    unpin: 'Unpin window',
    minimize: 'Minimize',
    close: 'Close',
    task: 'tasks',
    pending: 'TO DO',
    completed: 'COMPLETED',
    overdue: 'OVERDUE',
    empty: 'A little space to breathe.',
    emptySub: 'Start with one small thing.',
    noResults: 'No matching tasks',
    noResultsSub: 'Try another keyword or time range.',
    progress: 'A little progress, every day',
    footer: 'Small steps still move you forward.',
    newTask: 'One small thing',
    editTask: 'Edit task',
    taskTitle: 'What’s on your mind?',
    notes: 'Notes (optional)',
    date: 'Planned date',
    color: 'Card color',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Add to list',
    edit: 'Edit',
    delete: 'Delete',
    deleteTitle: 'Delete this task?',
    deleteSub: 'This cannot be undone.',
    language: 'Language',
    opacity: 'Window opacity',
    opacityHint: 'Slide left for a lighter window',
    storage: 'Local data',
    folder: 'Change folder',
    openFolder: 'Open folder',
    backup: 'Export backup',
    restore: 'Restore backup',
    local: 'Saved on this device. Your list stays private.',
    saved: 'Saved on this device',
    saving: 'Saving…',
    failed: 'Save failed. Please retry.',
    retry: 'Retry',
    error: 'Something went wrong',
    doneToast: 'Backup exported',
    recovered: 'List recovered from the automatic backup. Original file preserved.',
    firstTitle: 'A quiet corner for your day.',
    firstSub:
      'Welcome to LightTodo. Your list is saved on this device. You can choose a different folder anytime.',
    begin: 'Start your list',
    defaultFolder: 'Use default folder',
    loading: 'Opening your list…',
    markDone: 'Mark complete',
    markUndone: 'Mark incomplete',
    settingsNote: 'Window size, position and preferences are remembered.',
    allDone: 'All done. Take a little bow.',
    palette: { mint: 'Mint', blue: 'Blue', peach: 'Peach', lavender: 'Lavender' },
  },
};
const colors: Color[] = ['mint', 'blue', 'peach', 'lavender'];
type Editor = { task?: Todo; title: string; notes: string; date: string; color: Color };

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [fatal, setFatal] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [settings, setSettings] = useState<Settings>({
    language: 'zh',
    alwaysOnTop: false,
    opacity: 1,
  });
  const [period, setPeriod] = useState<Period>('today');
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const [status, setStatus] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [now, setNow] = useState(new Date());
  const latest = useRef(todos),
    saveQueue = useRef(Promise.resolve()),
    revision = useRef(0),
    settingsQueue = useRef(Promise.resolve()),
    settingsRef = useRef(settings),
    saveFailed = useRef(false);
  const t = copy[settings.language],
    zh = settings.language === 'zh';
  function accept(next: Snapshot) {
    setSnapshot(next);
    setTodos(next.data.todos);
    latest.current = next.data.todos;
    setSettings(next.settings);
    settingsRef.current = next.settings;
  }
  useEffect(() => {
    window.lighttodo
      .load()
      .then((s) => {
        accept(s);
        setWelcome(s.data.todos.length === 0);
        if (s.recovered) setNotice(copy[s.settings.language].recovered);
      })
      .catch((e) => setFatal(String(e)));
  }, []);
  useEffect(() => {
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
  }, [zh]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditor(null);
        setPanel(false);
        setDeleting(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openEditor();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
  function report(e: unknown) {
    setNotice(`${copy[settingsRef.current.language].error}: ${String(e)}`);
  }
  function persist(next: Todo[]) {
    latest.current = next;
    setTodos(next);
    setStatus('saving');
    const rev = ++revision.current;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => window.lighttodo.save({ version: 1, todos: next }))
      .then(() => {
        saveFailed.current = false;
        if (rev === revision.current) setStatus('saved');
      })
      .catch((e) => {
        saveFailed.current = true;
        if (rev === revision.current) setStatus('failed');
        report(e);
      });
  }
  function updateSettings(patch: Partial<Settings>) {
    const previous = settingsRef.current,
      next = { ...previous, ...patch };
    settingsRef.current = next;
    setSettings(next);
    settingsQueue.current = settingsQueue.current
      .catch(() => {})
      .then(() => window.lighttodo.settings(next))
      .then(() => {})
      .catch((e) => {
        if (settingsRef.current === next) {
          settingsRef.current = previous;
          setSettings(previous);
        }
        report(e);
      });
  }
  async function fileAction(fn: () => Promise<Snapshot | null | boolean | void>) {
    setBusy(true);
    try {
      await saveQueue.current;
      await settingsQueue.current;
      if (saveFailed.current) throw new Error(t.failed);
      const result = await fn();
      if (result && typeof result === 'object') accept(result);
      if (result === true) setNotice(t.doneToast);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  function openEditor(task?: Todo) {
    setEditor({
      task,
      title: task?.title || '',
      notes: task?.notes || '',
      date: task?.date || dateKey(),
      color: task?.color || 'mint',
    });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editor || !editor.title.trim()) return;
    const task: Todo = {
      id: editor.task?.id || crypto.randomUUID(),
      title: editor.title.trim(),
      notes: editor.notes.trim(),
      date: editor.date,
      color: editor.color,
      done: editor.task?.done || false,
      createdAt: editor.task?.createdAt || new Date().toISOString(),
    };
    persist(
      editor.task
        ? latest.current.map((x) => (x.id === task.id ? task : x))
        : [...latest.current, task],
    );
    setEditor(null);
    setWelcome(false);
  }
  const visible = selectTodos(todos, period, query, now),
    pending = visible.filter((x) => !x.done),
    done = visible.filter((x) => x.done);
  const overdue = period === 'today' ? pending.filter((x) => x.date < dateKey(now)) : [],
    active = pending.filter((x) => !overdue.includes(x));
  const progress = visible.length ? Math.round((done.length / visible.length) * 100) : 0;
  const dateLabel = new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);
  function Task({ task }: { task: Todo }) {
    return (
      <article className={`task ${task.color} ${task.done ? 'is-done' : ''}`} data-testid="task">
        <button
          className="checkbox"
          aria-label={task.done ? t.markUndone : t.markDone}
          aria-pressed={task.done}
          onClick={() =>
            persist(latest.current.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))
          }
        >
          {task.done && <Check size={13} strokeWidth={3} />}
        </button>
        <button
          className="task-content"
          onClick={() => openEditor(task)}
          aria-label={`${t.edit}: ${task.title}`}
        >
          <span className="task-title">{task.title}</span>
          {task.notes && <span className="task-notes">{task.notes}</span>}
          <span className="task-date">
            <CalendarDays size={11} />
            {task.date}
          </span>
        </button>
        <div className="task-actions">
          <button
            className="icon-button"
            title={t.edit}
            aria-label={`${t.edit}: ${task.title}`}
            onClick={() => openEditor(task)}
          >
            <Pencil size={13} />
          </button>
          <button
            className="icon-button delete"
            title={t.delete}
            aria-label={`${t.delete}: ${task.title}`}
            onClick={() => setDeleting(task)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </article>
    );
  }
  function section(label: string, items: Todo[], className = '') {
    return (
      items.length > 0 && (
        <section className={`task-group ${className}`}>
          <div className="section-heading">
            <span>{label}</span>
            <span className="count">{items.length}</span>
            <span className="hairline" />
          </div>
          {items.map((task) => (
            <Task key={task.id} task={task} />
          ))}
        </section>
      )
    );
  }
  const modalOpen = !!(editor || panel || deleting);
  if (fatal)
    return (
      <div className="fatal">
        <Leaf size={32} />
        <h2>LightTodo</h2>
        <p>{fatal}</p>
        <button onClick={() => location.reload()}>重试 / Retry</button>
      </div>
    );
  if (!snapshot)
    return (
      <div className="loading">
        <Leaf size={30} />
        <span>{t.loading}</span>
      </div>
    );
  return (
    <div className="app-shell">
      <div className="main-surface" inert={modalOpen || undefined}>
        <header className="titlebar">
          <div className="brand">
            <span className="brand-icon">
              <Check size={15} strokeWidth={3} />
            </span>
            LightTodo
            <span className="brand-dot" />
          </div>
          <div className="window-controls">
            <button
              className={`icon-button ${settings.alwaysOnTop ? 'selected' : ''}`}
              aria-label={settings.alwaysOnTop ? t.unpin : t.pin}
              title={settings.alwaysOnTop ? t.unpin : t.pin}
              onClick={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
            >
              <Pin size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={t.settings}
              title={t.settings}
              onClick={() => setPanel(true)}
            >
              <Settings2 size={16} />
            </button>
            <span className="control-divider" />
            <button
              className="icon-button"
              aria-label={t.minimize}
              onClick={() => window.lighttodo.minimize().catch(report)}
            >
              <Minus size={15} />
            </button>
            <button
              className="icon-button close-control"
              aria-label={t.close}
              onClick={() => {
                if (status === 'failed') {
                  report(t.failed);
                  return;
                }
                void saveQueue.current.then(() => window.lighttodo.close()).catch(report);
              }}
            >
              <X size={15} />
            </button>
          </div>
        </header>
        <nav className="period-nav" aria-label={zh ? '时间范围' : 'Time range'}>
          {(['today', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              className={period === p ? 'active' : ''}
              aria-current={period === p ? 'page' : undefined}
              onClick={() => {
                setPeriod(p);
                setQuery('');
              }}
            >
              {t[p]}
            </button>
          ))}
        </nav>
        <main className="scroll-area">
          <div className="hero">
            <div className="eyebrow">
              <Sun size={13} />
              <span>{dateLabel}</span>
            </div>
            <h1>{t.title[period]}</h1>
            <p>{t.subtitle}</p>
            <div className="hero-orb orb-one" />
            <div className="hero-orb orb-two" />
            <span className="hero-spark">
              <Sparkles size={25} strokeWidth={1.2} />
            </span>
          </div>
          <div className="progress-card">
            <div className="progress-top">
              <span>{t.progress}</span>
              <strong>
                {done.length}
                <small> / {visible.length}</small>
              </strong>
            </div>
            <div className="progress-track">
              <div style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-bottom">
              <span>
                {visible.length > 0 && pending.length === 0
                  ? t.allDone
                  : zh
                    ? `还有 ${pending.length} 件小事，按自己的节奏来`
                    : `${pending.length} little things. At your own pace.`}
              </span>
              <span>{progress}%</span>
            </div>
          </div>
          <div className="list-toolbar">
            <label className="search">
              <Search size={15} />
              <input
                aria-label={t.search}
                placeholder={t.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label={zh ? '清空搜索' : 'Clear search'}
                  onClick={() => setQuery('')}
                >
                  <X size={13} />
                </button>
              )}
            </label>
            <button className="add-button" onClick={() => openEditor()}>
              <Plus size={16} />
              <span>{t.add}</span>
            </button>
          </div>
          {section(t.overdue, overdue, 'overdue-group')}
          {section(t.pending, active)}
          {section(t.completed, done, 'completed-group')}
          {visible.length === 0 && (
            <div className="empty-state">
              <div className="empty-art">
                <CheckCheck size={36} strokeWidth={1.3} />
                <span />
                <i />
              </div>
              <h2>{query ? t.noResults : t.empty}</h2>
              <p>{query ? t.noResultsSub : t.emptySub}</p>
              {!query && (
                <button className="text-button" onClick={() => openEditor()}>
                  {t.add}
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          )}
          <div className="gentle-note">
            <Leaf size={12} />
            {t.footer}
          </div>
        </main>
        <footer className="statusbar">
          <span className={`save-status ${status}`} role="status">
            <span />
            {t[status]}
          </span>
          {status === 'failed' ? (
            <button className="text-button" onClick={() => persist(latest.current)}>
              {t.retry}
            </button>
          ) : (
            <span className="local-label">LOCAL FIRST</span>
          )}
          <span className="resize-hint" />
        </footer>
      </div>
      {welcome && !modalOpen && (
        <div className="welcome-card" role="region" aria-label="Welcome">
          <button
            className="welcome-close icon-button"
            aria-label={t.close}
            onClick={() => setWelcome(false)}
          >
            <X size={14} />
          </button>
          <span className="welcome-icon">
            <Leaf size={20} />
          </span>
          <h2>{t.firstTitle}</h2>
          <p>{t.firstSub}</p>
          <div className="welcome-path">{snapshot.dataDir}</div>
          <div className="welcome-buttons">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => fileAction(() => window.lighttodo.chooseFolder())}
            >
              {t.folder}
            </button>
            <button
              className="primary"
              onClick={() => {
                setWelcome(false);
                openEditor();
              }}
            >
              {t.begin}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {editor && (
        <Modal
          title={editor.task ? t.editTask : t.newTask}
          close={() => setEditor(null)}
          closeLabel={t.close}
        >
          <form onSubmit={submit}>
            <input
              className="title-input"
              aria-label={t.taskTitle}
              autoFocus
              placeholder={t.taskTitle}
              value={editor.title}
              maxLength={200}
              required
              onChange={(e) => setEditor({ ...editor, title: e.target.value })}
            />
            <textarea
              aria-label={t.notes}
              placeholder={t.notes}
              value={editor.notes}
              maxLength={5000}
              rows={4}
              onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
            />
            <label className="field-label">
              {t.date}
              <input
                type="date"
                aria-label={t.date}
                value={editor.date}
                required
                min="0001-01-01"
                max="9999-12-31"
                onChange={(e) => setEditor({ ...editor, date: e.target.value })}
              />
            </label>
            <label className="field-label">{t.color}</label>
            <div className="palette">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch ${c} ${editor.color === c ? 'chosen' : ''}`}
                  title={t.palette[c]}
                  aria-label={t.palette[c]}
                  aria-pressed={editor.color === c}
                  onClick={() => setEditor({ ...editor, color: c })}
                >
                  {editor.color === c && <Check size={16} />}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setEditor(null)}>
                {t.cancel}
              </button>
              <button className="primary" type="submit" disabled={!editor.title.trim()}>
                {editor.task ? t.save : t.create}
                <Check size={14} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {panel && (
        <Modal title={t.settings} close={() => setPanel(false)} closeLabel={t.close}>
          <div className="settings-row">
            <span>{t.language}</span>
            <div className="language-control">
              <button
                className={zh ? 'active' : ''}
                onClick={() => updateSettings({ language: 'zh' })}
              >
                中文
              </button>
              <button
                className={!zh ? 'active' : ''}
                onClick={() => updateSettings({ language: 'en' })}
              >
                EN
              </button>
            </div>
          </div>
          <div className="settings-row">
            <span>
              <Pin size={14} />
              {t.pin}
            </span>
            <button
              className={`toggle ${settings.alwaysOnTop ? 'on' : ''}`}
              role="switch"
              aria-checked={settings.alwaysOnTop}
              aria-label={t.pin}
              onClick={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
            >
              <span />
            </button>
          </div>
          <div className="opacity-settings">
            <label htmlFor="opacity">
              {t.opacity}
              <strong>{Math.round(settings.opacity * 100)}%</strong>
            </label>
            <input
              id="opacity"
              type="range"
              min="35"
              max="100"
              value={Math.round(settings.opacity * 100)}
              onChange={(e) => updateSettings({ opacity: Number(e.target.value) / 100 })}
            />
            <p>{t.opacityHint}</p>
          </div>
          <div className="storage-heading">
            <FolderOpen size={15} />
            {t.storage}
          </div>
          <div className="path-box">{snapshot.dataDir}</div>
          <div className="storage-buttons">
            <button
              className="secondary"
              disabled={busy || status === 'failed'}
              onClick={() => fileAction(() => window.lighttodo.chooseFolder())}
            >
              <FolderOpen size={13} />
              {t.folder}
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => fileAction(() => window.lighttodo.openFolder())}
            >
              <ArrowUpRight size={13} />
              {t.openFolder}
            </button>
            <button
              className="secondary"
              disabled={busy || status === 'failed'}
              onClick={() => fileAction(() => window.lighttodo.exportBackup())}
            >
              <Download size={13} />
              {t.backup}
            </button>
            <button
              className="secondary"
              disabled={busy || status === 'failed'}
              onClick={() => fileAction(() => window.lighttodo.importBackup())}
            >
              <Upload size={13} />
              {t.restore}
            </button>
          </div>
          <p className="settings-note">{t.settingsNote}</p>
          <div className="settings-footer">
            <Leaf size={13} />
            {t.local}
            <span>v{snapshot.version}</span>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal title={t.deleteTitle} close={() => setDeleting(null)} closeLabel={t.close}>
          <p className="delete-name">{deleting.title}</p>
          <p className="settings-note">{t.deleteSub}</p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDeleting(null)} autoFocus>
              {t.cancel}
            </button>
            <button
              className="danger-button"
              onClick={() => {
                persist(latest.current.filter((x) => x.id !== deleting.id));
                setDeleting(null);
              }}
            >
              {t.delete}
            </button>
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="alert">
          <span>{notice}</span>
          <button className="icon-button" aria-label={t.close} onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function Modal({
  title,
  close,
  closeLabel,
  children,
}: {
  title: string;
  close: () => void;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea, [tabindex="0"]',
        ) || [],
      );
    const focus = focusable();
    (ref.current?.querySelector<HTMLElement>('[autofocus]') || focus[1] || focus[0])?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable(),
        first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    const dialog = ref.current;
    dialog?.addEventListener('keydown', trap);
    return () => {
      dialog?.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label={closeLabel} onClick={close}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
