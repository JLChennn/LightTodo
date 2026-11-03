const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises'),
  path = require('node:path');
test('independent lists and notes survive editing, completion, backup and restart', async () => {
  const home = path.resolve('.test-data/lists');
  await fs.rm(home, { recursive: true, force: true });
  const env = { ...process.env, LIGHTTODO_TEST_HOME: home };
  delete env.ELECTRON_RUN_AS_NODE;
  let app;
  const launch = async () => {
    app = await electron.launch({ args: ['.'], env });
    const p = await app.firstWindow();
    await expect(p.locator('.period-nav')).toBeVisible();
    return p;
  };
  try {
    let p = await launch();
    for (const list of ['今日', '本周', '本月', '今年']) {
      await p.getByRole('button', { name: list, exact: true }).click();
      await expect(p.getByTestId('task')).toHaveCount(0);
      await p.getByRole('button', { name: '添加待办', exact: true }).first().click();
      await p.getByRole('textbox', { name: '待办标题' }).fill(list + '独立任务');
      await p.getByRole('button', { name: '加入清单', exact: true }).click();
      await expect(p.getByTestId('task')).toHaveCount(1);
    }
    await p.getByRole('button', { name: '今日', exact: true }).click();
    await expect(p.getByTestId('task')).toContainText('今日独立任务');
    await p.getByRole('button', { name: '标记完成', exact: true }).click();
    await p.getByRole('button', { name: '本周', exact: true }).click();
    await expect(p.getByRole('button', { name: '标记完成', exact: true })).toHaveCount(1);
    await p.getByRole('button', { name: '便签', exact: true }).click();
    await p.getByRole('button', { name: '新建便签', exact: true }).first().click();
    await p.getByRole('textbox', { name: '便签标题' }).fill('旅行备忘');
    await p.getByRole('textbox', { name: '便签正文' }).fill('护照\n充电器');
    await p.getByRole('button', { name: '加入清单', exact: true }).click();
    await expect(p.getByTestId('task')).toContainText('充电器');
    await expect(p.locator('.checkbox')).toBeHidden();
    await p.getByRole('button', { name: '编辑: 旅行备忘', exact: true }).first().click();
    await p.getByRole('textbox', { name: '便签正文' }).fill('护照\n充电器\n机票');
    await p.getByRole('button', { name: '保存', exact: true }).click();
    await expect(p.getByText('已保存到本机', { exact: true })).toBeVisible();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(440, 660));
    await p.locator('.list-summary').click();
    await p.screenshot({ path: 'test-results/notes-v1.3.png', animations: 'disabled' });
    await app.close();
    p = await launch();
    await expect(p.getByTestId('task')).toHaveCount(1);
    await p.getByRole('button', { name: '便签', exact: true }).click();
    await expect(p.getByTestId('task')).toContainText('机票');
    await p.getByRole('button', { name: '删除: 旅行备忘', exact: true }).click();
    await p.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
    await expect(p.getByTestId('task')).toHaveCount(0);
    await p.getByRole('button', { name: '今年', exact: true }).click();
    await expect(p.getByTestId('task')).toContainText('今年独立任务');
  } finally {
    await app?.close();
  }
});
