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
  Pencil,
  Trash2,
  CalendarDays,
  Leaf,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Power,
} from 'lucide-react';
import { dateKey, selectTodos, reorderTodos } from './domain';
import type { Color, Period, Settings, Snapshot, Todo } from './domain';
import './styles.css';

const copy = {
  zh: {
    today: '今日',
    week: '本周',
    month: '本月',
    year: '今年',
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
    empty: '暂无待办',
    noResults: '没有找到相关待办',
    noResultsSub: '试试其他关键词，或切换时间范围。',
    newTask: '新增待办',
    editTask: '编辑待办',
    taskTitle: '待办标题',
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
    fontSize: '字号大小',
    theme: '界面配色',
    appearance: '界面材质',
    solid: '纯色',
    glass: '透明玻璃',
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
    loading: '正在打开清单…',
    markDone: '标记完成',
    markUndone: '标记未完成',
    autoStart: '开机自启动',
    installedOnly: '安装后可用',
    moveUp: '上移',
    moveDown: '下移',
    drag: '拖动排序',
    palette: { mint: '薄荷绿', blue: '雾蓝', peach: '奶杏', lavender: '淡紫' },
  },
  en: {
    today: 'Today',
    week: 'Week',
    month: 'Month',
    year: 'Year',
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
    empty: 'No tasks',
    noResults: 'No matching tasks',
    noResultsSub: 'Try another keyword or time range.',
    newTask: 'New task',
    editTask: 'Edit task',
    taskTitle: 'Task title',
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
    fontSize: 'Font size',
    theme: 'Interface color',
    appearance: 'Material',
    solid: 'Solid',
    glass: 'Glass',
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
    loading: 'Opening your list…',
    markDone: 'Mark complete',
    markUndone: 'Mark incomplete',
    autoStart: 'Launch at login',
    installedOnly: 'Available after installation',
    moveUp: 'Move up',
    moveDown: 'Move down',
    drag: 'Drag to reorder',
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
    autoStart: false,
    fontSize: 13,
    theme: 'mint',
    appearance: 'solid',
  });
  const [period, setPeriod] = useState<Period>('today');
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const [status, setStatus] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const latest = useRef(todos),
    dragging = useRef<string | null>(null),
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
        if (s.recovered) setNotice(copy[s.settings.language].recovered);
      })
      .catch((e) => setFatal(String(e)));
  }, []);
  useEffect(() => {
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
  }, [zh]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.fontSize}px`;
    root.dataset.theme = settings.theme;
    root.dataset.appearance = settings.appearance;
  }, [settings.fontSize, settings.theme, settings.appearance]);
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
      .then((actual) => {
        if (settingsRef.current === next) {
          settingsRef.current = actual;
          setSettings(actual);
        }
      })
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
  }
  const visible = selectTodos(todos, period, query, now),
    pending = visible.filter((x) => !x.done),
    done = visible.filter((x) => x.done);
  const dateLabel = new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);
  function move(source: string, target: string) {
    const next = reorderTodos(
      latest.current,
      visible.map((t) => t.id),
      source,
      target,
    );
    if (next !== latest.current) persist(next);
  }
  function renderTask(task: Todo) {
    const group = task.done ? done : pending,
      index = group.findIndex((t) => t.id === task.id);
    return (
      <article
        key={task.id}
        className={`task ${task.color} ${task.done ? 'is-done' : ''}`}
        data-testid="task"
        data-id={task.id}
        onDragOver={(e) => {
          if (
            dragging.current &&
            latest.current.find((t) => t.id === dragging.current)?.done === task.done
          ) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.classList.add('drop-target');
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            e.currentTarget.classList.remove('drop-target');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drop-target');
          const source = dragging.current;
          dragging.current = null;
          if (source) move(source, task.id);
        }}
      >
        <button
          className="drag-handle"
          draggable
          title={t.drag}
          aria-label={`${t.drag}: ${task.title}`}
          onDragStart={(e) => {
            dragging.current = task.id;
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => {
            dragging.current = null;
            document
              .querySelectorAll('.drop-target')
              .forEach((el) => el.classList.remove('drop-target'));
          }}
        >
          <GripVertical size={13} />
        </button>
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
          <span
            className={`task-date ${!task.done && task.date < dateKey(now) ? 'overdue-date' : ''}`}
          >
            <CalendarDays size={11} />
            {task.date}
          </span>
        </button>
        <div className="task-actions">
          <button
            className="icon-button"
            disabled={index === 0}
            aria-label={`${t.moveUp}: ${task.title}`}
            title={t.moveUp}
            onClick={() => move(task.id, group[index - 1].id)}
          >
            <ChevronUp size={13} />
          </button>
          <button
            className="icon-button"
            disabled={index === group.length - 1}
            aria-label={`${t.moveDown}: ${task.title}`}
            title={t.moveDown}
            onClick={() => move(task.id, group[index + 1].id)}
          >
            <ChevronDown size={13} />
          </button>
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
          {items.map(renderTask)}
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
          <div className="list-summary">
            <span>{dateLabel}</span>
            <span>
              {done.length} / {visible.length}
            </span>
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
          {section(t.pending, pending)}
          {section(t.completed, done, 'completed-group')}
          {visible.length === 0 && (
            <div className="empty-state">
              <h2>{query ? t.noResults : t.empty}</h2>
              {query && <p>{t.noResultsSub}</p>}
              {!query && (
                <button className="text-button" onClick={() => openEditor()}>
                  {t.add}
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          )}
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
          ) : null}
          <span className="resize-hint" />
        </footer>
      </div>
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
          <div className="appearance-settings">
            <div className="settings-row">
              <span>{t.appearance}</span>
              <div className="language-control" role="group" aria-label={t.appearance}>
                {(['solid', 'glass'] as const).map((appearance) => (
                  <button
                    key={appearance}
                    aria-pressed={settings.appearance === appearance}
                    className={settings.appearance === appearance ? 'active' : ''}
                    onClick={() => updateSettings({ appearance })}
                  >
                    {t[appearance]}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-row theme-row">
              <span>{t.theme}</span>
              <div className="palette" role="group" aria-label={t.theme}>
                {colors.map((theme) => (
                  <button
                    key={theme}
                    className={`swatch ${theme} ${settings.theme === theme ? 'chosen' : ''}`}
                    aria-label={t.palette[theme]}
                    aria-pressed={settings.theme === theme}
                    onClick={() => updateSettings({ theme })}
                  >
                    {settings.theme === theme && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="opacity-settings font-settings">
              <label htmlFor="font-size">
                {t.fontSize}
                <strong>{settings.fontSize} px</strong>
              </label>
              <input
                id="font-size"
                type="range"
                min="12"
                max="20"
                step="1"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              />
            </div>
          </div>
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
          <div className="settings-row">
            <span>
              <Power size={14} />
              {t.autoStart}
            </span>
            <button
              className={`toggle ${settings.autoStart ? 'on' : ''}`}
              role="switch"
              aria-label={t.autoStart}
              aria-checked={settings.autoStart}
              disabled={!snapshot.startupSupported}
              title={!snapshot.startupSupported ? t.installedOnly : undefined}
              onClick={() => updateSettings({ autoStart: !settings.autoStart })}
            >
              <span />
            </button>
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
