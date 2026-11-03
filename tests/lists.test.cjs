const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateData } = require('../electron/store.cjs');
test('independent lists and memo bodies survive backup validation without leaking between lists', async () => {
  const { selectTodos } = await import('../src/domain.ts');
  const todos = ['today', 'week', 'month', 'year', 'memo'].map((list) => ({
    id: list,
    list,
    title: 'same',
    notes: '第一行\n第二行',
    date: '2026-11-03',
    done: false,
    color: 'mint',
    createdAt: '2026-11-03T00:00:00Z',
  }));
  const restored = validateData(JSON.parse(JSON.stringify({ version: 1, todos })));
  assert.deepEqual(restored.todos, todos);
  for (const list of ['today', 'week', 'month', 'year', 'memo'])
    assert.deepEqual(
      selectTodos(restored.todos, list, '').map((t) => t.id),
      [list],
    );
  assert.throws(() => validateData({ version: 1, todos: [{ ...todos[0], list: 'bad' }] }));
});
