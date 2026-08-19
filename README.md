# Agent Context Lab

一套可直接用于演讲和 hands-on workshop 的中文网站，主题是：

- Model 与 harness 的区别
- system、tools、messages 如何组成 context
- input、cache creation、cache read、output token
- 对话增长与 prompt caching
- primary thread 与 subagent fan-out
- 如何用真实 Claude Desktop OTLP 流量验证，而不是靠 UI 猜测

## 打开网站

需要 Node.js 22.13 或更新版本。

```powershell
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

```powershell
npm run lint
npm run build
```

## Token Analyzer

网站底部的工具支持多文件拖放：

- `.json`
- `.jsonl`
- `.har`
- `.log`
- `.txt`

解析顺序：

1. Anthropic/API 风格的 `usage`
2. OTLP `claude_code.token.usage`
3. `api_request_body` 中的 system / tools / messages
4. 正则回退：`input_tokens`、`output_tokens`、`cache_creation_input_tokens`、`cache_read_input_tokens`

所有解析都在浏览器本地执行，不上传文件。脱敏样例位于
`public/data/workshop-sanitized.json`。

## 本次 workshop 的安全观测方式

推理路径保持：

`Claude Desktop → IE Azure Gateway`

观测路径临时增加：

`Claude Desktop → OTLP http://127.0.0.1:8787`

这不是 HTTPS MITM，本机 collector 不承载推理。内容捕获会包含 system
prompt、tool schema、conversation 与潜在文件片段，因此只应用测试 prompt。

工作区辅助脚本：

```powershell
& "C:\Projects\claude presentation\tools\configure-claude-workshop-capture.ps1" -Action Enable
& "C:\Projects\claude presentation\tools\configure-claude-workshop-capture.ps1" -Action Restore
```

`Enable` 会先做时间戳备份；`Restore` 会恢复 workshop 前的配置。恢复前需要完全
退出 Claude Desktop，恢复后重新打开。

## 实测结论

- 5 个英文词的 prompt 产生 57,365 字符 request body。
- request 含 3 个 system segments、27 个 tool schemas、2 条 messages。
- 第一轮 usage：19,673 cache-read、374 input、4 output tokens。
- 同会话第二轮 messages 变为 4；19,673 cache-read、397 cache-creation、
  2 input、12 output tokens。
- 要求“两名 subagents”后，输出按 A/B 排版，但 telemetry 只有一个主线程
  request、零 tool calls。文字中的角色标签不能证明发生了 subagent fan-out。

## 目录

- `app/page.tsx`：内容、workshop 步骤、视频与解析器
- `app/globals.css`：网站视觉与响应式布局
- `public/screenshots/`：本次实操截图
- `public/data/`：脱敏流量样例
