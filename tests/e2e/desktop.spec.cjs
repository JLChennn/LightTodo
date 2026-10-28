const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { dateKey } = require('../../src/domain.ts');
const home = path.resolve('.test-data/e2e');
let desktop, page;
async function launch() {
  const env = { ...process.env, LIGHTTODO_TEST_HOME: home };
  delete env.ELECTRON_RUN_AS_NODE;
  desktop = await electron.launch({ args: ['.'], env });
  page = await desktop.firstWindow();
  await expect(page.locator('.period-nav')).toBeVisible();
}
test('real desktop: CRUD, sorting, native settings, scrolling and restart', async () => {
  await fs.rm(home, { recursive: true, force: true });
  await launch();
  try {
    await page.getByRole('button', { name: '开始记录' }).click();
    await page.getByRole('textbox', { name: '想做些什么？' }).fill('读十页书');
    await page.getByRole('textbox', { name: '备注（选填）' }).fill('慢慢来，比较快');
    await page.getByRole('button', { name: '加入清单', exact: true }).click();
    await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '添加待办', exact: true }).click();
    await page.getByRole('textbox', { name: '想做些什么？' }).fill('散步二十分钟');
    await page.getByRole('button', { name: '加入清单', exact: true }).click();
    await page
      .getByTestId('task')
      .filter({ hasText: '读十页书' })
      .getByRole('button', { name: '标记完成', exact: true })
      .click();
    await expect(page.getByTestId('task').last()).toContainText('读十页书');
    await expect(page.getByTestId('task').last()).toHaveClass(/is-done/);
    await page.getByRole('button', { name: '编辑: 散步二十分钟', exact: true }).first().click();
    await page.getByRole('textbox', { name: '想做些什么？' }).fill('散步三十分钟');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.getByRole('textbox', { name: '搜索当前清单…' }).fill('三十');
    await expect(page.getByTestId('task')).toHaveCount(1);
    await page.getByRole('button', { name: '清空搜索' }).click();
    await page.getByRole('button', { name: '置顶窗口', exact: true }).click();
    await expect
      .poll(() =>
        desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()),
      )
      .toBe(true);
    await page.getByRole('button', { name: '偏好设置', exact: true }).click();
    await page.locator('#opacity').fill('75');
    await expect
      .poll(() =>
        desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getOpacity()),
      )
      .toBeCloseTo(0.75, 1);
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Preferences' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Year', exact: true }).click();
    await desktop.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(380, 510),
    );
    await page.screenshot({ path: 'docs/images/app-en.png' });
    await desktop.close();
    await launch();
    await expect(page.getByRole('button', { name: 'Today', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByTestId('task')).toHaveCount(2);
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.getByRole('button', { name: '中文', exact: true }).click();
    await page.locator('#opacity').fill('100');
    await page.getByRole('switch').click();
    await page.locator('.modal').evaluate((el) => (el.scrollTop = 0));
    await page.screenshot({ path: 'docs/images/settings.png' });
    await page.keyboard.press('Escape');
    await page
      .getByTestId('task')
      .filter({ hasText: '读十页书' })
      .getByRole('button', { name: '删除: 读十页书', exact: true })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
    await expect(page.getByTestId('task')).toHaveCount(1);
    await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible();
    const saved = JSON.parse(await fs.readFile(path.join(home, 'data/lighttodo.json'), 'utf8'));
    expect(saved.todos[0].title).toBe('散步三十分钟');
    // Populate demo content through the same exposed, validated persistence API.
    const today = dateKey(),
      yesterday = dateKey(new Date(Date.now() - 86400000));
    const samples = [
      ['给今天留一点阅读时间', '读十页书，也是一点新的收获。', 'mint', false, today],
      ['出门走走，晒晒太阳', '把手机收起来，感受一下风。', 'blue', false, today],
      ['整理书桌的一角', '给喜欢的东西，留一个位置。', 'peach', false, today],
      ['把小想法记下来', '不用完美，先开始。', 'lavender', false, today],
      ['给自己准备一份早餐', '好好吃饭，好好生活。', 'mint', true, today],
      ['回复一封重要邮件', '花五分钟，放下一件心事。', 'peach', false, yesterday],
    ];
    await page.evaluate(async (samples) => {
      await window.lighttodo.save({
        version: 1,
        todos: samples.map((s, i) => ({
          id: `demo-${i}`,
          title: s[0],
          notes: s[1],
          color: s[2],
          done: s[3],
          date: s[4],
          createdAt: new Date().toISOString(),
        })),
      });
    }, samples);
    await desktop.close();
    await launch();
    await desktop.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(440, 780),
    );
    await page.screenshot({ path: 'docs/images/app-zh.png' });
    expect(
      await page.locator('.scroll-area').evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    await page.locator('.scroll-area').evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.getByText('已完成', { exact: true })).toBeVisible();
  } finally {
    await desktop?.close();
  }
});
