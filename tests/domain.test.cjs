const { test } = require('node:test');
const assert = require('node:assert/strict');
const domain = import('../src/domain.ts');
const todo = (id, date, done = false, title = id) => ({
  id,
  date,
  done,
  title,
  notes: '备注 Notes',
  color: 'mint',
  createdAt: '2026-01-01T00:00:00Z',
});
test('week starts Monday and spans month/year boundaries', async () => {
  const { periodRange } = await domain;
  assert.deepEqual(periodRange('week', new Date(2027, 0, 3)), ['2026-12-28', '2027-01-03']);
  assert.deepEqual(periodRange('week', new Date(2026, 9, 26)), ['2026-10-26', '2026-11-01']);
});
test('month/year ranges handle leap year and December', async () => {
  const { periodRange } = await domain;
  assert.deepEqual(periodRange('month', new Date(2028, 1, 15)), ['2028-02-01', '2028-02-29']);
  assert.deepEqual(periodRange('month', new Date(2026, 11, 31)), ['2026-12-01', '2026-12-31']);
  assert.deepEqual(periodRange('year', new Date(2026, 11, 31)), ['2026-01-01', '2026-12-31']);
});
test('today includes unfinished overdue; completed tasks follow all pending', async () => {
  const { selectTodos } = await domain;
  const rows = [
    todo('done', '2026-10-28', true),
    todo('future', '2026-10-29'),
    todo('old', '2025-12-31'),
    todo('old-done', '2026-10-27', true),
    todo('now', '2026-10-28'),
  ];
  assert.deepEqual(
    selectTodos(rows, 'today', '', new Date(2026, 9, 28)).map((x) => x.id),
    ['old', 'now', 'done'],
  );
});
test('search matches titles/notes case-insensitively and stays within period', async () => {
  const { selectTodos } = await domain;
  const rows = [todo('a', '2026-10-28', false, 'Hello'), todo('b', '2026-11-28', false, 'Hello')];
  assert.equal(selectTodos(rows, 'month', ' HELLO ', new Date(2026, 9, 28)).length, 1);
  assert.equal(selectTodos(rows, 'month', '备注', new Date(2026, 9, 28)).length, 1);
  assert.equal(selectTodos(rows, 'month', 'missing', new Date(2026, 9, 28)).length, 0);
});
test('manual order survives filters and complete/undo; hidden slots are unchanged', async () => {
  const { selectTodos, reorderTodos } = await domain;
  const rows = [
    todo('a', '2026-10-28'),
    todo('hidden', '2026-11-01'),
    todo('b', '2026-10-27'),
    todo('c', '2026-10-28'),
    todo('done', '2026-10-28', true),
  ];
  const next = reorderTodos(rows, ['a', 'b', 'c', 'done'], 'c', 'a');
  assert.deepEqual(
    next.map((t) => t.id),
    ['c', 'hidden', 'a', 'b', 'done'],
  );
  assert.deepEqual(
    selectTodos(next, 'today', '', new Date(2026, 9, 28)).map((t) => t.id),
    ['c', 'a', 'b', 'done'],
  );
  assert.equal(reorderTodos(next, ['a', 'done'], 'a', 'done'), next);
  assert.equal(reorderTodos(next, ['a', 'b'], 'c', 'a'), next);
  const complete = next.map((t) => (t.id === 'c' ? { ...t, done: true } : t));
  assert.deepEqual(
    selectTodos(complete, 'today', '', new Date(2026, 9, 28)).map((t) => t.id),
    ['a', 'b', 'c', 'done'],
  );
  assert.deepEqual(
    selectTodos(
      complete.map((t) => (t.id === 'c' ? { ...t, done: false } : t)),
      'today',
      '',
      new Date(2026, 9, 28),
    ).map((t) => t.id),
    ['c', 'a', 'b', 'done'],
  );
});
