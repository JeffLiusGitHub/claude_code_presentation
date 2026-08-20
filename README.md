# Claude Code Request Anatomy

这是 Agent Context Lab 与《What Happens After You Press Send in Claude Code?》互动演示的本地项目。

英文首页是一条四步学习路线：认识工具、打开 11 页互动 Presentation、完成 Proxyman How-to，然后进入实际 Workshop。Workshop 的现有地址仍为 `/field-validation`，原 Agent Context Lab 参考内容保留在 `/workshop`。所有内容都在本机运行；启动后不需要登录线上网站。

## 最简单的打开方式

双击项目根目录中的：

`启动本地演示.cmd`

脚本会检查本地依赖；首次运行时如有需要会自动安装，然后启动网站。终端出现本地地址后，浏览器打开：

`http://localhost:3000`

关闭启动脚本的终端窗口即可停止网站。

## 命令行启动

需要 Node.js 22.13 或更新版本。

```powershell
cd "C:\Projects\claude presentation\claude-context-workshop"
npm install
npm run local
```

然后打开 `http://localhost:3000`。各入口的直接地址是：

- Presentation：`http://localhost:3000/presentation`
- Proxyman How-to：`http://localhost:3000/proxyman-guide`
- 实际 Workshop：`http://localhost:3000/field-validation`
- Context Lab 参考内容：`http://localhost:3000/workshop`

## 演示控制

- 鼠标滚轮或触控板：切换页面
- `↑` / `↓`、`Page Up` / `Page Down`：上一页/下一页
- `Home` / `End`：第一页/最后一页
- 页面中的按钮和代码卡片：触发互动讲解

## 项目结构

- `app/page.tsx`：四步学习路线首页
- `app/home.module.css`：首页视觉、色板与响应式布局
- `app/field-validation/page.tsx`：实际 Workshop（保留旧地址以兼容现有链接）
- `app/workshop/page.tsx`：原 Agent Context Lab 参考内容
- `app/interactive-presentation.tsx`：新版 11 页演示内容与交互
- `app/presentation/page.tsx`：新版演示入口
- `app/presentation.module.css`：演示视觉、动画和响应式布局
- `app/proxyman-guide/`：Proxyman 安装与抓包指南
- `public/og.png`：项目封面图
- `tests/rendered-html.test.mjs`：渲染结果测试

## 检查项目

```powershell
npm run build
npm test
```

本项目仍保留原有 Sites 发布配置，方便未来同步更新线上版本；本地运行不依赖线上部署。
