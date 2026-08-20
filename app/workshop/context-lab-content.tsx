import { ReactNode } from "react";
import Image from "next/image";

const COLORS = {
  input: "#a9cee2",
  cacheCreation: "#e2b84f",
  cacheRead: "#f1b58e",
  output: "#3a6998",
} as const;

function SectionTitle({ kicker, children, id }: { kicker: string; children: ReactNode; id?: string }) {
  return (
    <div className="section-title" id={id}>
      <span>{kicker}</span>
      <h2>{children}</h2>
    </div>
  );
}

const videos = [
  {
    type: "MODEL",
    title: "But what is a GPT?",
    author: "3Blue1Brown",
    href: "https://www.youtube.com/watch?v=wjZofJX0v4M",
    highlight: "token、向量、attention、next-token prediction 的视觉化解释。",
    why: "先理解模型只是做推理，才能看见 harness 才是把模型变成产品行为的那一层。",
  },
  {
    type: "MODEL",
    title: "Intro to Large Language Models",
    author: "Andrej Karpathy",
    href: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
    highlight: "从预训练、微调、推理到 LLM OS 的一小时全景。",
    why: "给非工程听众一张模型能力、限制与应用栈的总地图。",
  },
  {
    type: "HARNESS",
    title: "Claude Agent SDK — Full Workshop",
    author: "Anthropic · Thariq Shihipar",
    href: "https://www.youtube.com/watch?v=TqC1qOfiVcQ",
    highlight: "从零搭 agent loop：Context → Thought → Action → Observation；覆盖 tools、skills、memory、subagents。",
    why: "最直接回答 harness 如何把一次模型调用变成可持续执行的 agent。",
  },
  {
    type: "AGENTS",
    title: "Building more effective AI agents",
    author: "Anthropic",
    href: "https://www.youtube.com/watch?v=uhJJgc-0iTQ",
    highlight: "简单架构、tool use、orchestrator/subagent、并行化、失败模式与 context engineering。",
    why: "帮助判断什么时候用单 agent，什么时候 fan-out 才值得额外 token 和协调成本。",
  },
  {
    type: "CONTEXT",
    title: "Make Claude Code 100× Better",
    author: "Kenny Liao",
    href: "https://www.youtube.com/watch?v=ySA9tJ8RfVM",
    highlight: "09:04 system prompts；21:11 progressive disclosure；24:21 subagents；28:04 compaction；claude-trace。",
    why: "把“上下文工程”拆成可观察、可练习的具体机制。",
  },
  {
    type: "TOKENS",
    title: "How and When to Use Prompt Caching",
    author: "Prompt Engineering",
    href: "https://www.youtube.com/watch?v=_0uiiJfsBPI",
    highlight: "prompt caching 的成本、延迟、代码示例，以及短 prompt 为什么常常缓存不划算。",
    why: "解释 cache read、cache creation 与 input tokens 为什么必须分开看。",
  },
];

const slides = [
  ["01", "一句 prompt 并不等于一次请求", "用真实数字开场：5 个英文词，发出了 57,365 字符的请求体。"],
  ["02", "Model ≠ Harness", "模型负责推理；harness 负责装上下文、暴露工具、循环执行、处理权限与失败。"],
  ["03", "上下文是被组装出来的", "System policy + tool schemas + memory/files + conversation + current request。"],
  ["04", "他们到底在为什么付费", "新增输入、缓存写入、缓存读取、输出；订阅产品可能抽象价格，但底层消耗仍可观察。"],
  ["05", "对话越长，请求如何变化", "历史消息进入下一轮；缓存让“总上下文”与“本轮新增计费”不再相等。"],
  ["06", "为什么同一模型表现不同", "System prompt、工具集、检索、memory、compaction、权限、effort 与错误恢复都会改变结果。"],
  ["07", "Subagent 是独立上下文，不是角色扮演", "主线程给 scoped brief，子线程各自调用模型/工具，再把结果摘要回传；每个分支都有成本。"],
  ["08", "把猜测变成证据", "提出假设 → 运行 prompt → 看请求/usage/tool events → 解释差异。"],
];

const workshopSteps = [
  {
    n: "00",
    title: "隐私与实验边界",
    time: "2 min",
    action: "只对测试 prompt 开启内容级遥测；不放客户文件、凭据或真实 PII。结束后恢复配置并停掉 collector。",
    meaning: "能看到 context 的工具，也能看到最敏感的数据；观测权限本身需要治理。",
    image: "/screenshots/01-ie-gateway-ready.png",
    alt: "Claude Desktop 使用 IE Gateway 的就绪画面",
  },
  {
    n: "01",
    title: "确认推理仍走 IE Gateway",
    time: "2 min",
    action: "Claude Desktop 模型选择器显示 IE Intelligence Model Auto (IE Gateway)。本机 localhost:8787 仅接收 OTLP 镜像，不承载推理。",
    meaning: "把 inference path 与 observation path 分开，避免为了抓流量而改掉正常订阅路径。",
    image: "/screenshots/04-minimal-captured-response.png",
    alt: "Claude 回复极简提示词，模型选择器仍为 IE Gateway",
  },
  {
    n: "02",
    title: "极简请求：先写下你的猜测",
    time: "3 min",
    action: "发送 “Reply with exactly OK.”；在看流量前，每人先猜 system、tools、history 各有多大。",
    meaning: "先形成可证伪假设，避免看完答案后产生“我早就知道”的错觉。",
    image: "/screenshots/02-minimal-prompt.png",
    alt: "Claude Desktop 中的极简提示词",
  },
  {
    n: "03",
    title: "看 OTLP 流量，而不是只看聊天气泡",
    time: "4 min",
    action: "打开 /admin/telemetry?kind=otel，定位 user_prompt、api_request_body、api_response_body、token.usage 与 traces。",
    meaning: "UI 是结果视图；telemetry 才能显示 harness 做了哪些隐形工作。",
    image: "/screenshots/05-traffic-overview.png",
    alt: "本机 OTLP telemetry 事件总览",
  },
  {
    n: "04",
    title: "拆开一次真实请求",
    time: "5 min",
    action: "极简 prompt 触发 57,365 字符请求体：3 个 system segments、27 个 tools、2 条 messages；usage 为 cache read 19,673、input 374、output 4。",
    meaning: "用户 prompt 往往只是 request 的一小块；system 与 tool schema 才是固定底座。",
    image: "/screenshots/06-request-detail.png",
    alt: "api_request_body 等 OTLP 事件明细",
  },
  {
    n: "05",
    title: "让对话增长一轮",
    time: "4 min",
    action: "在同一会话追问。messages 从 2 增到 4；cache read 保持 19,673，cache creation 为 397，新增 input 只有 2。",
    meaning: "总上下文、缓存命中与新增 token 是三个不同的量；不要只盯 input_tokens。",
    image: "/screenshots/07-context-growth.png",
    alt: "Claude 同一会话中的第二轮追问",
  },
  {
    n: "06",
    title: "验证“真的用了 subagent 吗”",
    time: "4 min",
    action: "明确要求两个 subagents 并行。输出按 A/B 排版，但流量只有 1 个主线程 api_request、0 个 tool calls；该 harness 的 27 个工具也没有 Agent。",
    meaning: "文字声称 ≠ 执行事实。要找独立 request/span、query_source=subagent 或 Agent tool event 才能证明 fan-out。",
    image: "/screenshots/09-subagents-result.png",
    alt: "Claude 给出标记为 Subagent A 与 B 的回答",
  },
  {
    n: "07",
    title: "拖入日志，比较全班结果",
    time: "5 min",
    action: "把导出的 JSON/JSONL/HAR/LOG 全部拖入下方工具，比较固定底座、缓存、历史增长与输出差异。",
    meaning: "从单次 anecdote 变成可比较的数据；找出最值得优化的那一段。",
    image: "/screenshots/10-subagents-traffic.png",
    alt: "子代理实验对应的单一主线程请求事件",
  },
];

const proxymanSteps = [
  {
    n: "P0",
    title: "启动 Proxyman，确认监听端口",
    time: "2 min",
    action: "打开 Proxyman，确认顶部为 Listening，端口为 9090。只给本次 Claude Code 测试进程设置 HTTP_PROXY 与 HTTPS_PROXY，不需要把整台机器的所有软件都纳入实验。",
    meaning: "先证明代理链路存在，再讨论解密。此时能看到 CONNECT，但看不到 HTTPS 请求体。",
    image: "/screenshots/proxyman/01-proxyman-listening.jpg",
    alt: "Proxyman 正在本机 9090 端口监听",
    width: 2460,
    height: 1342,
  },
  {
    n: "P1",
    title: "安装并信任 Proxyman CA",
    time: "3 min",
    action: "Certificate → Install Certificate on this Machine → Windows Setup Guide → Install & Trust。完成后在 Current User Root store 中核对 Proxyman Root CA；不要把客户数据带入这次实验。",
    meaning: "HTTPS MITM 能工作，是因为测试进程信任了 Proxyman 的本机 CA。这一步的权限与隐私风险最高。",
    image: "/screenshots/proxyman/02-certificate-setup.jpg",
    alt: "Proxyman Windows CA 安装向导",
    width: 2460,
    height: 1342,
  },
  {
    n: "P2",
    title: "只对 Anthropic 域名开启 SSL Proxying",
    time: "3 min",
    action: "过滤 api.anthropic.com；对该域名启用 SSL Proxying。测试进程额外设置 NODE_EXTRA_CA_CERTS 与 SSL_CERT_FILE，指向 Proxyman 的 ca.pem。",
    meaning: "最小化解密范围。灰色 CONNECT 变成可读的 POST /v1/messages，证明已经从隧道层进入 HTTP 层。",
    image: "/screenshots/proxyman/03-ssl-proxying-enabled.jpg",
    alt: "api.anthropic.com 已启用 SSL Proxying",
    width: 2460,
    height: 1342,
  },
  {
    n: "P3",
    title: "重跑英文验证矩阵",
    time: "10 min",
    action: "依次验证 history/cache/compact、ReAct 工具循环、模型切换、max_tokens、subagent、memory、skill 与 MCP。每组使用固定 session id 与 PXM_* canary，便于在 HAR 中定位。",
    meaning: "同一条 /v1/messages 链路会承载不同 harness 决策；可从 model、max_tokens、system、tools、messages 与响应 usage 逐项验证。",
    image: "/screenshots/proxyman/04-decrypted-flow-list.jpg",
    alt: "Proxyman 中已解密的 Anthropic 请求列表",
    width: 2460,
    height: 1342,
  },
  {
    n: "P4",
    title: "验证失败重试，不靠猜测",
    time: "3 min",
    action: "让本机测试网关前两次返回 HTTP 529，第三次返回 200。Proxyman 捕获到 529 → 529 → 200，最终 Claude 得到 PXM_RETRY_SUCCESS_2026。",
    meaning: "重试是 harness 行为，不是模型能力；一次用户操作可以产生多次模型 API 请求。",
    image: "/screenshots/proxyman/05-retry-chain.jpg",
    alt: "Proxyman 显示两次 529 后一次 200 的重试链",
    width: 2460,
    height: 1342,
  },
  {
    n: "P5",
    title: "区分父线程与真正的子代理",
    time: "4 min",
    action: "父线程请求使用 Sonnet、15 个工具并携带 PXM_PARENT_ONLY_2026；子代理请求使用 Haiku、只有 Read 工具，并带 x-claude-code-agent-id。子代理读取 seed.txt 后，父线程才收到 PXM_SEED_MARKER_2026。",
    meaning: "真正的 subagent 是独立 API request 与独立 context，不是回答里写了“Subagent A/B”。父线程的私有 canary 没有进入子代理请求。",
    image: "/screenshots/proxyman/06-parent-context-filtered-safe.jpg",
    alt: "按父线程 canary 过滤出的三条 Proxyman 请求；请求体已从交付截图中裁掉",
    width: 2460,
    height: 600,
  },
];

// Kept as source material for the previous capture walkthrough.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const proxymanPreviousSteps = [
  {
    n: "00",
    title: "设定抓包边界",
    time: "1 min",
    action: "只使用测试项目与英文 marker；不在分享材料中保留 Authorization、Cookie、组织 ID 或真实业务内容。Proxyman 的 Header 页会显示 Bearer token，所以截图统一切到 Body / Body。",
    meaning: "HTTPS 解密能看到完整 system、tools、messages 与流式响应，也能看到凭据。先定义脱敏规则，再开始录制。",
    image: "/screenshots/proxyman-live/01-certificate-menu.png",
    alt: "Proxyman Certificate 菜单与 Windows 证书入口",
  },
  {
    n: "01",
    title: "确认本机代理监听",
    time: "1 min",
    action: "打开 Setup → Manual Setup，确认 Proxyman 监听 192.168.0.168:9090；抓包期间启用 Override Windows Proxy。",
    meaning: "Claude Desktop 的 HTTPS 请求先经过本机 Proxyman；这里改变的是 observation path，不是模型本身。",
    image: "/screenshots/proxyman-live/02-manual-proxy-settings.png",
    alt: "Proxyman Manual Setup 显示监听地址与端口",
  },
  {
    n: "02",
    title: "为目标域名开启 SSL Proxying",
    time: "2 min",
    action: "在 SSL Proxying List 中加入 api.anthropic.com 与 IE Gateway 域名并勾选。只有列入规则的 HTTPS 域名会被解密。",
    meaning: "只捕获本次实验需要的域名，能减少噪声，也降低无意查看其他应用敏感流量的风险。",
    image: "/screenshots/proxyman-live/03-ssl-proxying-domains.png",
    alt: "SSL Proxying List 中的 Anthropic 与 IE Gateway 域名",
  },
  {
    n: "03",
    title: "运行无工具 Baseline",
    time: "2 min",
    action: "发送英文提示：PROXYMAN_CAPTURE_BASE_20260819_1342，并要求只返回 PROXYMAN_BASE_OK、不得使用工具。",
    meaning: "短、唯一、可搜索的 marker 能把 UI 动作与网络请求一一对应；禁止工具为后续 tool-use 对照建立基线。",
    image: "/screenshots/proxyman-live/04-baseline-prompt.png",
    alt: "Claude Desktop 中的英文 Baseline 提示词",
  },
  {
    n: "04",
    title: "确认 UI 结果与主请求",
    time: "3 min",
    action: "Claude 精确返回 PROXYMAN_BASE_OK。Proxyman 中同一次操作出现 959、963、978 三条 /v1/messages 与六条 /count_tokens；主请求 963 为 166 kB。",
    meaning: "一次用户动作不等于一次 API 调用。harness 还会发控制、计数与 UI 辅助请求。",
    image: "/screenshots/proxyman-live/06-baseline-traffic-body.png",
    alt: "Baseline 主请求的 JSON Body 与 SSE Body",
  },
  {
    n: "05",
    title: "读 Baseline 的 token usage",
    time: "2 min",
    action: "主请求 message_start 显示 input_tokens 10、cache_creation_input_tokens 43,578、cache_read_input_tokens 0；输入合计 43,588。",
    meaning: "用户只写了一句短 prompt，但本轮首次稳定前缀需要被写入缓存；真正的大头是 harness 注入的 context。",
    image: "/screenshots/proxyman-live/05-baseline-response.png",
    alt: "Claude 精确返回 PROXYMAN_BASE_OK",
  },
  {
    n: "06",
    title: "运行真实 Read tool 测试",
    time: "3 min",
    action: "发送英文提示，要求使用 Read 读取 src/api/demo.ts 并只报告 marker。Claude UI 显示 Read demo.ts，并返回 API_FILE_L99J。",
    meaning: "UI 已证明工具确实执行；下一步仍要用流量确认 tool_use 和 tool_result 是如何跨请求传递的。",
    image: "/screenshots/proxyman-live/08-tool-result.png",
    alt: "Claude Desktop 显示 Read demo.ts 与 API_FILE_L99J",
  },
  {
    n: "07",
    title: "定位首次 tool_use 请求",
    time: "3 min",
    action: "用 Request Body Contains PROXYMAN_TOOL_TEST_20260819 过滤到 4 条主请求。1133 为 168 kB，响应含 content_block_start.type=tool_use；usage 为 10 input + 257 cache creation + 43,578 cache read。",
    meaning: "工具调用不是模型在本地直接读文件；模型先返回结构化 tool_use，harness 执行工具后再继续。",
    image: "/screenshots/proxyman-live/09-tool-use-traffic.png",
    alt: "Proxyman 中 1133 请求的 tool_use SSE 与 usage",
  },
  {
    n: "08",
    title: "验证 tool_result 续跑",
    time: "3 min",
    action: "1135 请求增至 170 kB，说明 harness 把工具观察结果追加进 messages；响应返回 API_FILE_L99J。usage 为 8 input + 290 cache creation + 43,835 cache read。",
    meaning: "Agent loop 的核心是 Request → tool_use → 本地执行 → tool_result → 新 Request；它天然比普通聊天多一轮模型调用。",
    image: "/screenshots/proxyman-live/10-tool-result-traffic.png",
    alt: "Proxyman 中 1135 的 tool_result continuation 与最终 marker",
  },
  {
    n: "09",
    title: "识别 UI 辅助请求并清理",
    time: "2 min",
    action: "1136 是 18.7 kB 小型辅助请求；1139 为 172 kB suggestion-generation 请求，cache read 已到 44,125。结束后 Pause，并取消 Tools → Override Windows Proxy；证书与 SSL 规则保留。",
    meaning: "不要把所有 /v1/messages 都当成用户主回答；按 body 中的 mode、tool_use、usage 与时间顺序分类。清理系统代理是 workshop 的必做收尾。",
    image: "/screenshots/proxyman-live/12-proxy-override-off.png",
    alt: "Proxyman 已 Pause，Override Windows Proxy 菜单无勾选",
  },
];

export default function ContextLabContent() {
  return (
    <main lang="zh-CN">
      <header className="hero" id="top">
        <div className="hero-copy">
          <span className="mono-label">AGENT CONTEXT LAB · 60–75 MIN</span>
          <h1>
            一句 Prompt，<br />
            模型到底
            <em>收到了什么？</em>
          </h1>
          <p>
            从 Model、Harness、Context、Tokens 到 Subagents。用真实 Claude Desktop 流量，把“感觉”变成证据。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#workshop">开始练习 ↘</a>
            <a className="secondary-button" href="/request-analyzer">打开 Request Token Explorer</a>
          </div>
        </div>
        <div className="hero-proof">
          <span>PROXYMAN 实测 / 2026-08-19</span>
          <div className="big-number">1</div>
          <p>次用户发送动作</p>
          <div className="proof-arrow">↓</div>
          <div className="big-number coral">166 kB</div>
          <p>Baseline 主 request body</p>
          <div className="proof-grid">
            <span><b>3</b> /v1/messages</span>
            <span><b>6</b> /count_tokens</span>
            <span><b>43,578</b> cache write</span>
            <span><b>10</b> direct input</span>
          </div>
        </div>
      </header>

      <section className="thesis-strip">
        <div><span>MODEL</span><b>推理引擎</b></div>
        <i>＋</i>
        <div><span>HARNESS</span><b>运行系统</b></div>
        <i>＋</i>
        <div><span>CONTEXT</span><b>本轮工作台</b></div>
        <i>＝</i>
        <div className="result"><span>BEHAVIOR</span><b>你实际体验的 Agent</b></div>
      </section>

      <section className="concept-section">
        <SectionTitle kicker="HIGH-LEVEL MENTAL MODEL">先讲清楚：Harness 不是 Model</SectionTitle>
        <div className="loop-diagram">
          <div className="loop-center">
            <span>MODEL</span>
            <strong>预测下一步</strong>
            <small>输入 context → 输出文本 / tool call</small>
          </div>
          <div className="orbit orbit-a"><b>1</b>组装 Context</div>
          <div className="orbit orbit-b"><b>2</b>调用 Model</div>
          <div className="orbit orbit-c"><b>3</b>执行 Tool</div>
          <div className="orbit orbit-d"><b>4</b>追加 Observation</div>
        </div>
        <div className="concept-copy">
          <div>
            <span className="number-tag">MODEL</span>
            <h3>会“想”的部分</h3>
            <p>在给定上下文中生成下一个 token，或选择一次 tool call。它不知道你的 UI、文件权限、重试策略与长期记忆，除非 harness 把这些信息放进 context。</p>
          </div>
          <div>
            <span className="number-tag green">HARNESS</span>
            <h3>让它“做事”的部分</h3>
            <p>拼装 system prompt、工具 schema、文件与历史；运行 agent loop；执行工具；管理安全确认、缓存、压缩、失败恢复、subagent 与 UI。</p>
          </div>
        </div>
      </section>

      <section className="cost-section">
        <SectionTitle kicker="WHAT ARE THEY PAYING FOR?">把“上下文大小”拆成四本账</SectionTitle>
        <div className="cost-grid">
          <article><span style={{ background: COLORS.input }} /><b>01</b><h3>新增输入</h3><p>本轮未被缓存的 system、tools、messages 与用户请求。</p></article>
          <article><span style={{ background: COLORS.cacheCreation }} /><b>02</b><h3>缓存写入</h3><p>新增长前缀被存入 prompt cache，供后续轮次复用。</p></article>
          <article><span style={{ background: COLORS.cacheRead }} /><b>03</b><h3>缓存读取</h3><p>命中的稳定前缀仍占上下文，但通常成本和延迟更低。</p></article>
          <article><span style={{ background: COLORS.output }} /><b>04</b><h3>模型输出</h3><p>回答、推理片段与 tool-use JSON；subagents 的输出也分别计算。</p></article>
        </div>
        <div className="context-growth">
          <div className="growth-copy">
            <span className="mono-label light">CONVERSATION GROWTH</span>
            <h3>每一轮，Harness 都会重新组装请求</h3>
            <p>历史消息越来越多，但稳定前缀可以缓存。于是“模型看到的总量”会增长，而“本轮新增 input”可能很小。</p>
          </div>
          <div className="growth-chart" aria-label="Conversation context growth diagram">
            {[1, 2, 3, 4].map((turn) => (
              <div className="growth-row" key={turn}>
                <b>T{turn}</b>
                <div>
                  <i className="fixed" style={{ width: "52%" }}>system + tools</i>
                  <i className="history" style={{ width: `${turn * 8}%` }}>history</i>
                  <i className="prompt" style={{ width: "7%" }}>ask</i>
                </div>
              </div>
            ))}
            <div className="growth-legend"><span>固定但可缓存</span><span>随对话增长</span><span>当前请求</span></div>
          </div>
        </div>
      </section>

      <section className="deck-section" id="deck">
        <SectionTitle kicker="25-MIN HIGH-LEVEL DECK">建议 PPT：8 页，一条主线</SectionTitle>
        <p className="section-intro">主线不是“Claude 有哪些功能”，而是：用户看到的 Agent 行为，是 model × harness × context 的乘积。</p>
        <div className="slide-list">
          {slides.map(([n, title, copy]) => (
            <article key={n}>
              <span>{n}</span>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
        <div className="talk-timing">
          <b>建议节奏</b>
          <span>Hook 3&apos;</span><i />
          <span>Model vs Harness 5&apos;</span><i className="wide" />
          <span>Cost + Context 8&apos;</span><i className="widest" />
          <span>Subagents 5&apos;</span><i className="wide" />
          <span>Lab setup 4&apos;</span><i />
        </div>
      </section>

      <section className="video-section" id="videos">
        <SectionTitle kicker="VIDEO LEARNING PATH">视频清单：知识点、链接、为什么要看</SectionTitle>
        <div className="video-grid">
          {videos.map((video, index) => (
            <a href={video.href} target="_blank" rel="noreferrer" className="video-card" key={video.href}>
              <div className="video-top"><span>{video.type}</span><b>{String(index + 1).padStart(2, "0")}</b></div>
              <h3>{video.title}</h3>
              <small>{video.author}</small>
              <dl>
                <dt>Highlight</dt><dd>{video.highlight}</dd>
                <dt>Why</dt><dd>{video.why}</dd>
              </dl>
              <strong>观看视频 ↗</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="tooling-section">
        <SectionTitle kicker="SAFE OBSERVATION SETUP">用什么工具看 Claude 流量？</SectionTitle>
        <div className="tooling-grid">
          <div className="tool-card featured">
            <span className="mono-label light">RECOMMENDED</span>
            <h3>Proxyman：看真实 HTTP 请求与响应</h3>
            <p>对测试进程设置代理，并且只给 <code>api.anthropic.com</code> 开 SSL Proxying。它能直接证明 model、max_tokens、system、tools、messages、headers、状态码与 SSE usage。</p>
            <div className="route-diagram">
              <span>Claude Code</span><b>→ Proxyman :9090<br /><small>capture + decrypt</small></b>
              <span className="branch">↘ api.anthropic.com<br /><small>inference</small></span>
            </div>
          </div>
          <div className="tool-card">
            <span className="mono-label">WHAT TO LOOK FOR</span>
            <ul>
              <li><code>POST /v1/messages</code>：真实模型请求</li>
              <li><code>model / max_tokens</code>：运行参数</li>
              <li><code>system / tools / messages</code>：context 组成</li>
              <li><code>cache_* / input / output</code>：四类 token</li>
              <li><code>x-claude-code-agent-id</code>：子代理证据</li>
            </ul>
          </div>
          <div className="tool-card warning">
            <span className="mono-label">PRIVACY</span>
            <h3>HAR 不是普通日志</h3>
            <p>它可能包含 Authorization、完整 system prompt、对话、工具输入与文件片段。演示网站只放脱敏 JSON；原始 HAR 留在 private-captures，不外发。</p>
          </div>
          <div className="tool-card">
            <span className="mono-label">COMPLEMENT / FALLBACK</span>
            <h3>OTLP 或 VS Code</h3>
            <p>OTLP 更容易做结构化遥测、风险更小；Proxyman 更适合证明“线上到底发了什么”。没有 Claude Desktop 时，可在 VS Code/Claude Code 复用同一代理变量与验证矩阵。</p>
          </div>
        </div>
      </section>

      <section className="proxyman-section" id="proxyman">
        <SectionTitle kicker="PROXYMAN · ENGLISH FIELD GUIDE">Install, configure, capture, and explain the Claude agent loop</SectionTitle>
        <div className="privacy-callout">
          <b>New step-by-step guide:</b> follow the complete English walkthrough with the official download link, certificate setup, Claude task prompt, screenshots, and request-by-request explanations. <a href="/proxyman-guide">Open the Proxyman field guide →</a>
        </div>
        <div className="capture-facts">
          <div><b>339</b><span>两份原始 HAR 的 HTTP flows</span></div>
          <div><b>35</b><span>验证矩阵中的 /v1/messages</span></div>
          <div><b>529 → 529 → 200</b><span>真实失败重试链</span></div>
          <div><b>15 → 1</b><span>父线程与子代理工具数</span></div>
        </div>
        <div className="command-strip">
          <span>本次设置</span>
          <code>127.0.0.1:9090 · SSL Proxying: api.anthropic.com · test process only</code>
          <small>英文 canary + 固定 session id；公开网站只读取脱敏结构，不读取原始 HAR 的凭据与正文。</small>
        </div>
        <div className="step-list proxyman-steps">
          {proxymanSteps.map((step) => (
            <article className="step-card" key={`proxyman-${step.n}`}>
              <div className="step-copy">
                <div className="step-meta"><span>STEP {step.n}</span><b>{step.time}</b></div>
                <h3>{step.title}</h3>
                <dl>
                  <dt>怎么做 / 发生了什么</dt><dd>{step.action}</dd>
                  <dt>说明了什么</dt><dd>{step.meaning}</dd>
                </dl>
              </div>
              <figure>
                <Image
                  src={step.image}
                  alt={step.alt}
                  width={2100}
                  height={1342}
                  unoptimized
                />
                <figcaption>{step.alt}</figcaption>
              </figure>
            </article>
          ))}
        </div>
      </section>

      <section className="workshop-section" id="workshop">
        <SectionTitle kicker="35-MIN HANDS-ON LAB · OTLP FALLBACK">没有 Proxyman 时：用遥测做同一套思考练习</SectionTitle>
        <div className="workshop-intro">
          <div><b>5&apos;</b><span>设置与安全边界</span></div>
          <div><b>20&apos;</b><span>个人实验与分析</span></div>
          <div><b>10–20&apos;</b><span>分享发现与讨论</span></div>
        </div>
        <div className="step-list">
          {workshopSteps.map((step) => (
            <article className="step-card" key={step.n}>
              <div className="step-copy">
                <div className="step-meta"><span>STEP {step.n}</span><b>{step.time}</b></div>
                <h3>{step.title}</h3>
                <dl>
                  <dt>怎么做 / 发生了什么</dt><dd>{step.action}</dd>
                  <dt>说明了什么</dt><dd>{step.meaning}</dd>
                </dl>
              </div>
              <figure>
                {/* Workshop screenshots are local, captured from this run. */}
                <Image
                  src={step.image}
                  alt={step.alt}
                  width={1623}
                  height={858}
                  unoptimized
                />
                <figcaption>{step.alt}</figcaption>
              </figure>
            </article>
          ))}
        </div>
      </section>

      <section className="subagent-section">
        <SectionTitle kicker="SUBAGENTS: WHEN & WHAT CHANGES">什么时候明确要求 subagents？</SectionTitle>
        <div className="agent-flow">
          <div className="primary-agent"><span>PRIMARY THREAD</span><b>目标、约束、汇总与最终责任</b></div>
          <div className="fanout"><i /><i /><i /></div>
          <div className="child-agents">
            <div><span>A</span><b>Scoped brief</b><small>独立 context + tools</small></div>
            <div><span>B</span><b>Scoped brief</b><small>独立 context + tools</small></div>
            <div><span>C</span><b>Scoped brief</b><small>独立 context + tools</small></div>
          </div>
          <div className="return-line">只把结果 / 证据摘要回主线程 ↑</div>
        </div>
        <div className="when-grid">
          <div className="yes"><h3>明确要 subagents</h3><ul><li>两个以上独立、可并行的研究或实现分支</li><li>需要不同专业视角或互相验证</li><li>主线程 context 已拥挤，需要隔离探索噪声</li><li>每个分支都有清晰交付物与停止条件</li></ul></div>
          <div className="no"><h3>不要为了“更 agentic”而用</h3><ul><li>一步就能完成的任务</li><li>分支高度依赖、需要频繁共享状态</li><li>工具或 harness 根本不支持 fan-out</li><li>协调和重复 context 成本高于并行收益</li></ul></div>
        </div>
        <div className="finding-banner"><b>两次实测并不矛盾：</b> 早先 Claude Desktop harness 只在文字中写 Subagent A/B，流量没有 fan-out；本次 Claude Code harness 确实产生了两条带 agent-id 的 Haiku 子请求。证明要验证具体 harness，而不是把“Claude”当成一种固定行为。</div>
      </section>

      <section className="analyzer" id="analyzer">
        <div className="analyzer-copy">
          <div>
            <span className="mono-label light">NEW · LOCAL ONLY</span>
            <h2>逐层拆解一个真实 Request</h2>
            <p>
              粘贴 JSON、JSONL、HAR、LOG 或 TXT，查看 System、Tools、对话历史、Tool Calls、
              Tool Results 与官方 Usage。全部分析仅在当前浏览器中完成。
            </p>
          </div>
          <a className="primary-button" href="/request-analyzer">
            打开 Request Token Explorer →
          </a>
        </div>
      </section>

      <section className="discussion-section">
        <SectionTitle kicker="10–20 MIN DISCUSSION">分享时，不只问“花了多少 token”</SectionTitle>
        <div className="question-grid">
          <div><b>01</b><p>哪一部分最大？它是必要上下文，还是 harness 的固定税？</p></div>
          <div><b>02</b><p>第二轮增加了什么？为什么总请求变大，但新增 input 反而很小？</p></div>
          <div><b>03</b><p>你看到真正的 tool call / subagent fan-out，还是模型只在文字中声称发生了？</p></div>
          <div><b>04</b><p>如果要优化，你会删 context、做 progressive disclosure、缓存，还是换工作流？</p></div>
        </div>
      </section>

      <footer>
        <div><span className="mono-label light">CONTEXT / LAB</span><h2>看见 Harness，才能设计 Agent。</h2></div>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
