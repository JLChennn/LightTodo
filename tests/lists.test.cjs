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

test('body-only notes derive summaries and preserve legacy titles when edited', async () => {
  const { memoTitle, memoText } = await import('../src/domain.ts');
  assert.equal(memoTitle('  \n旅行备忘\n护照'), '旅行备忘');
  assert.equal(memoText({ title: '旧标题', notes: '原正文' }), '旧标题\n\n原正文');
  assert.equal(memoText({ title: '新正文', notes: '新正文\n第二行' }), '新正文\n第二行');
  assert.equal(memoText({ title: '仅标题', notes: '' }), '仅标题');
  assert.ok(memoTitle('a'.repeat(300)).length <= 200);
});
