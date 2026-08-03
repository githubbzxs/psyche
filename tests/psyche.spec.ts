import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(metrics.body).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport);
}

function failOnConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

test("macOS 工作台与会话审批", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const expectNoConsoleErrors = failOnConsoleErrors(page);
  await page.goto("/");

  await expect(page.locator(".home-page")).toBeVisible();
  await expect(page.getByText("所有 Agent 都在这里。")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/screenshots/macos-home.png", fullPage: true });

  await page.locator(".attention-row.is-critical").click();
  await expect(page.locator(".conversation-pane")).toBeVisible();
  await expect(page.getByText("优化断线重连与增量同步").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "批准修改", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "批准修改", exact: true }).click();
  await expect(page.getByText("你已批准这些修改")).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/macos-session.png", fullPage: true });

  await page.getByRole("button", { name: "主机" }).first().click();
  await expect(page.locator(".hosts-page")).toBeVisible();
  await expect(page.getByText("Studio · Shenzhen").first()).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/macos-hosts.png", fullPage: true });
  expectNoConsoleErrors();
});

test("iPhone 底部导航与单列会话", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const expectNoConsoleErrors = failOnConsoleErrors(page);
  await page.goto("/");

  await expect(page.locator(".bottom-nav")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/screenshots/iphone-home.png", fullPage: true });

  await page.locator(".bottom-nav").getByRole("button", { name: "会话" }).click();
  await expect(page.locator(".session-list-pane")).toBeVisible();
  await page.locator(".session-row").first().click();
  await expect(page.locator(".conversation-pane")).toBeVisible();
  await expect(page.locator(".composer")).toBeVisible();
  await expect(page.locator(".bottom-nav")).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/screenshots/iphone-session.png", fullPage: true });

  await page.getByRole("button", { name: "返回会话列表" }).click();
  await expect(page.locator(".session-list-pane")).toBeVisible();
  expectNoConsoleErrors();
});

test("iPadOS 折叠侧栏与项目双栏", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  const expectNoConsoleErrors = failOnConsoleErrors(page);
  await page.goto("/");

  await expect(page.locator(".primary-sidebar")).toBeVisible();
  await page.getByRole("button", { name: "项目" }).first().click();
  await expect(page.locator(".projects-page")).toBeVisible();
  await expect(page.locator(".entity-list-panel")).toBeVisible();
  await expect(page.locator(".entity-detail-panel")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/screenshots/ipad-projects.png", fullPage: true });
  expectNoConsoleErrors();
});

test("深色主题默认值与本地持久化", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  const expectNoConsoleErrors = failOnConsoleErrors(page);
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.locator(".topbar-new-task").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(10, 132, 255)");
  await page.getByRole("button", { name: "切换到浅色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("psyche-theme"))).toBe("light");
  await expect.poll(() => page.locator(".new-task-button").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(255, 255, 255)");
  await page.screenshot({ path: "artifacts/screenshots/macos-home-light.png", fullPage: true });

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "切换到深色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "设置" }).first().click();
  await expect(page.locator(".theme-control")).toBeVisible();
  await expect(page.locator(".theme-control").getByRole("button", { name: "深色" })).toHaveClass(/is-active/);
  await expect.poll(() => page.locator(".toggle.is-on").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(48, 209, 88)");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "artifacts/screenshots/macos-settings-dark.png", fullPage: true });

  await page.keyboard.press("Control+K");
  await expect(page.locator(".search-dialog")).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/macos-search-dark.png", fullPage: true });
  await page.keyboard.press("Escape");

  await page.locator(".topbar-new-task").click();
  await expect(page.getByRole("dialog", { name: "新建任务" })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/macos-new-task-dark.png", fullPage: true });
  expectNoConsoleErrors();
});
