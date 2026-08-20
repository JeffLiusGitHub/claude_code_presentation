"use client";

import {
  ChangeEvent,
  DragEvent,
  MouseEvent,
  ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type TokenParts = {
  input: number;
  cacheCreation: number;
  cacheRead: number;
  output: number;
};

type Anatomy = {
  system: number;
  tools: number;
  messages: number;
  other: number;
};

type RequestRow = {
  id: string;
  label: string;
  source: string;
  bodyChars?: number;
  requestBytes?: number;
  systemSegments?: number;
  toolsCount?: number;
  messagesCount?: number;
  tokens: TokenParts;
  anatomy?: Anatomy;
  estimated?: boolean;
};

const COLORS: Record<keyof TokenParts, string> = {
  cacheRead: "#c9f05f",
  cacheCreation: "#ffb45e",
  input: "#ff6b4a",
  output: "#62a7ff",
};

const ANATOMY_COLORS: Record<keyof Anatomy, string> = {
  system: "#ff6b4a",
  tools: "#c9f05f",
  messages: "#62a7ff",
  other: "#b7aea0",
};

const SAMPLE_ROWS: RequestRow[] = [
  {
    id: "pxm-681-history",
    label: "681 · History / Cache 首轮",
    source: "proxyman-sanitized.json",
    requestBytes: 109386,
    tokens: { input: 10, cacheCreation: 6626, cacheRead: 21936, output: 344 },
  },
  {
    id: "pxm-871-parent",
    label: "871 · Sonnet 父线程",
    source: "proxyman-sanitized.json",
    tokens: { input: 2, cacheCreation: 8591, cacheRead: 29644, output: 318 },
  },
  {
    id: "pxm-915-subagent",
    label: "915 · Haiku 子代理",
    source: "proxyman-sanitized.json",
    tokens: { input: 2282, cacheCreation: 0, cacheRead: 0, output: 76 },
  },
  {
    id: "pxm-916-parent-result",
    label: "916 · 父线程接收结果",
    source: "proxyman-sanitized.json",
    tokens: { input: 2, cacheCreation: 435, cacheRead: 38235, output: 74 },
  },
];

const tokenKeys: (keyof TokenParts)[] = [
  "cacheRead",
  "cacheCreation",
  "input",
  "output",
];

const anatomyKeys: (keyof Anatomy)[] = ["system", "tools", "messages", "other"];

const labels: Record<keyof TokenParts, string> = {
  cacheRead: "缓存读取",
  cacheCreation: "缓存写入",
  input: "新增输入",
  output: "输出",
};

const anatomyLabels: Record<keyof Anatomy, string> = {
  system: "System",
  tools: "Tools",
  messages: "Messages",
  other: "Other",
};

function totalTokens(tokens: TokenParts) {
  return tokenKeys.reduce((sum, key) => sum + tokens[key], 0);
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}

function emptyTokens(): TokenParts {
  return { input: 0, cacheCreation: 0, cacheRead: 0, output: 0 };
}

function usageFromObject(value: unknown): TokenParts | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  for (const encoded of [obj.text, obj.body]) {
    if (typeof encoded !== "string" || !encoded.trim().startsWith("{")) continue;
    try {
      const nested = usageFromObject(JSON.parse(encoded));
      if (nested) return nested;
    } catch {
      // HAR and log bodies are not guaranteed to contain JSON.
    }
  }
  const candidates = [obj.usage, obj.token_usage, obj];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const usage = candidate as Record<string, unknown>;
    const hasUsage = [
      "input_tokens",
      "output_tokens",
      "cache_creation_input_tokens",
      "cache_read_input_tokens",
    ].some((key) => key in usage);
    if (hasUsage) {
      return {
        input: asNumber(usage.input_tokens),
        output: asNumber(usage.output_tokens),
        cacheCreation: asNumber(usage.cache_creation_input_tokens),
        cacheRead: asNumber(usage.cache_read_input_tokens),
      };
    }
  }
  return null;
}

function requestBodyFromEvent(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.messages) || Array.isArray(obj.tools) || obj.system) return obj;
  const postData = obj.postData;
  if (postData && typeof postData === "object") {
    const text = (postData as Record<string, unknown>).text;
    if (typeof text === "string") {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        return null;
      }
    }
  }
  const attrs = obj.attributes;
  if (attrs && typeof attrs === "object") {
    const body = (attrs as Record<string, unknown>).body;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        return null;
      }
    }
    if (body && typeof body === "object") return body as Record<string, unknown>;
  }
  return null;
}

function anatomyFromBody(body: Record<string, unknown>): Anatomy {
  const system = JSON.stringify(body.system ?? "").length;
  const tools = JSON.stringify(body.tools ?? []).length;
  const messages = JSON.stringify(body.messages ?? []).length;
  const total = JSON.stringify(body).length;
  return { system, tools, messages, other: Math.max(0, total - system - tools - messages) };
}

function collectObjects(value: unknown, output: Record<string, unknown>[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjects(item, output));
    return;
  }
  const obj = value as Record<string, unknown>;
  output.push(obj);
  Object.values(obj).forEach((item) => collectObjects(item, output));
}

function parseJsonValues(text: string): unknown[] {
  try {
    return [JSON.parse(text)];
  } catch {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
  }
}

function parseCustomSummary(value: unknown, source: string): RequestRow[] {
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  const requests = Array.isArray(obj.requests) ? obj.requests : [];
  return requests.flatMap((request, index) => {
    if (!request || typeof request !== "object") return [];
    const item = request as Record<string, unknown>;
    const tokenSource = (item.tokens ?? item.usage) as Record<string, unknown> | undefined;
    if (!tokenSource) return [];
    return [
      {
        id: `${source}-summary-${index}`,
        label: String(item.label ?? `Request ${index + 1}`),
        source,
        bodyChars: asNumber(item.bodyChars) || undefined,
        requestBytes: asNumber(item.requestBytes) || undefined,
        systemSegments: asNumber(item.systemSegments) || undefined,
        toolsCount: asNumber(item.toolsCount) || undefined,
        messagesCount: asNumber(item.messagesCount) || undefined,
        tokens: {
          input: asNumber(tokenSource.input ?? tokenSource.input_tokens),
          output: asNumber(tokenSource.output ?? tokenSource.output_tokens),
          cacheCreation: asNumber(
            tokenSource.cacheCreation ?? tokenSource.cache_creation_input_tokens,
          ),
          cacheRead: asNumber(tokenSource.cacheRead ?? tokenSource.cache_read_input_tokens),
        },
        anatomy:
          item.anatomy && typeof item.anatomy === "object"
            ? {
                system: asNumber((item.anatomy as Record<string, unknown>).system),
                tools: asNumber((item.anatomy as Record<string, unknown>).tools),
                messages: asNumber((item.anatomy as Record<string, unknown>).messages),
                other: asNumber((item.anatomy as Record<string, unknown>).other),
              }
            : undefined,
      },
    ];
  });
}

function maxTokenField(text: string, field: string): number {
  const pattern = new RegExp(`"${field}"\\s*:\\s*(\\d+)`, "g");
  let maximum = 0;
  for (const match of text.matchAll(pattern)) maximum = Math.max(maximum, Number(match[1]));
  return maximum;
}

function decodeHarContent(content: Record<string, unknown>): string {
  const text = typeof content.text === "string" ? content.text : "";
  if (content.encoding !== "base64" || typeof atob !== "function") return text;
  try {
    const bytes = Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function parseHarTraffic(value: unknown, source: string): RequestRow[] {
  if (!value || typeof value !== "object") return [];
  const log = (value as Record<string, unknown>).log;
  if (!log || typeof log !== "object") return [];
  const entries = (log as Record<string, unknown>).entries;
  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const event = entry as Record<string, unknown>;
    const request = event.request;
    const response = event.response;
    if (!request || typeof request !== "object" || !response || typeof response !== "object") return [];
    const requestObject = request as Record<string, unknown>;
    const responseObject = response as Record<string, unknown>;
    const url = String(requestObject.url ?? "");
    if (!/\/v1\/messages(?:\?|$)/.test(url)) return [];

    const body = requestBodyFromEvent(requestObject);
    if (!body) return [];
    const content = responseObject.content;
    const responseText =
      content && typeof content === "object"
        ? decodeHarContent(content as Record<string, unknown>)
        : "";
    const tokens: TokenParts = {
      input: maxTokenField(responseText, "input_tokens"),
      output: maxTokenField(responseText, "output_tokens"),
      cacheCreation: maxTokenField(responseText, "cache_creation_input_tokens"),
      cacheRead: maxTokenField(responseText, "cache_read_input_tokens"),
    };
    const serialized = JSON.stringify(body);
    const model = String(body.model ?? "unknown model").replace(/^claude-/, "");
    const status = asNumber(responseObject.status);
    return [
      {
        id: `${source}-har-${String(event._id ?? index)}`,
        label: `${model} · HTTP ${status || "?"} · flow ${String(event._id ?? index)}`,
        source,
        bodyChars: serialized.length,
        requestBytes: asNumber(requestObject.bodySize) || serialized.length,
        systemSegments: Array.isArray(body.system) ? body.system.length : body.system ? 1 : 0,
        toolsCount: Array.isArray(body.tools) ? body.tools.length : 0,
        messagesCount: Array.isArray(body.messages) ? body.messages.length : 0,
        tokens,
        anatomy: anatomyFromBody(body),
        estimated: totalTokens(tokens) === 0,
      },
    ];
  });
}

function parseTraffic(text: string, source: string): RequestRow[] {
  const values = parseJsonValues(text);
  const custom = values.flatMap((value) => parseCustomSummary(value, source));
  if (custom.length) return custom;

  const harRows = values.flatMap((value) => parseHarTraffic(value, source));
  if (harRows.length) return harRows;

  const objects: Record<string, unknown>[] = [];
  values.forEach((value) => collectObjects(value, objects));

  const requestBodies = objects
    .filter((obj) => obj.name === "api_request_body" || obj.event === "api_request_body")
    .map((obj) => ({ event: obj, body: requestBodyFromEvent(obj) }))
    .filter((entry): entry is { event: Record<string, unknown>; body: Record<string, unknown> } => Boolean(entry.body));

  if (!requestBodies.length) {
    objects.forEach((obj) => {
      const body = requestBodyFromEvent(obj);
      if (body && !requestBodies.some((entry) => entry.body === body)) {
        requestBodies.push({ event: obj, body });
      }
    });
  }

  const metricGroups = new Map<string, TokenParts>();
  objects.forEach((obj) => {
    if (obj.name !== "claude_code.token.usage") return;
    const attrs = (obj.attributes ?? {}) as Record<string, unknown>;
    const type = String(attrs.type ?? "");
    const metric = (obj.body ?? {}) as Record<string, unknown>;
    const nestedMetric = (metric.metric ?? metric) as Record<string, unknown>;
    const value = asNumber(nestedMetric.value);
    const key = String(obj.timestamp ?? attrs["prompt.id"] ?? "usage");
    const group = metricGroups.get(key) ?? emptyTokens();
    if (type === "input") group.input += value;
    if (type === "output") group.output += value;
    if (type === "cacheRead") group.cacheRead += value;
    if (type === "cacheCreation") group.cacheCreation += value;
    metricGroups.set(key, group);
  });

  const exactUsage = [
    ...new Map(
      objects
        .map(usageFromObject)
        .filter((item): item is TokenParts => Boolean(item))
        .map((item) => [JSON.stringify(item), item]),
    ).values(),
  ];
  const metricUsage = [...metricGroups.values()].filter((tokens) => totalTokens(tokens) > 0);
  const usages = metricUsage.length
    ? metricUsage
    : exactUsage.filter((tokens) => totalTokens(tokens) > 0);

  const rows: RequestRow[] = requestBodies.map(({ event, body }, index) => {
    const serialized = JSON.stringify(body);
    return {
      id: `${source}-request-${index}`,
      label: `Request ${index + 1}`,
      source,
      bodyChars: serialized.length,
      requestBytes: asNumber(event.request_bytes) || undefined,
      systemSegments: Array.isArray(body.system) ? body.system.length : body.system ? 1 : 0,
      toolsCount: Array.isArray(body.tools) ? body.tools.length : 0,
      messagesCount: Array.isArray(body.messages) ? body.messages.length : 0,
      tokens: usages[index] ?? emptyTokens(),
      anatomy: anatomyFromBody(body),
      estimated: !usages[index],
    };
  });

  if (rows.length) return rows;
  if (usages.length) {
    return usages.map((tokens, index) => ({
      id: `${source}-usage-${index}`,
      label: `Usage ${index + 1}`,
      source,
      tokens,
    }));
  }

  const tokenRegex = /["']?(input_tokens|output_tokens|cache_creation_input_tokens|cache_read_input_tokens)["']?\s*[:=]\s*(\d+(?:\.\d+)?)/gi;
  const fallback = emptyTokens();
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(text))) {
    const key = match[1];
    const value = Number(match[2]);
    if (key === "input_tokens") fallback.input += value;
    if (key === "output_tokens") fallback.output += value;
    if (key === "cache_creation_input_tokens") fallback.cacheCreation += value;
    if (key === "cache_read_input_tokens") fallback.cacheRead += value;
  }
  return totalTokens(fallback)
    ? [{ id: `${source}-regex`, label: "Regex 汇总", source, tokens: fallback }]
    : [];
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

function SectionTitle({ kicker, children, id }: { kicker: string; children: ReactNode; id?: string }) {
  return (
    <div className="section-title" id={id}>
      <span>{kicker}</span>
      <h2>{children}</h2>
    </div>
  );
}

function TokenAnalyzer() {
  const [rows, setRows] = useState<RequestRow[]>(SAMPLE_ROWS);
  const [fileNames, setFileNames] = useState<string[]>(["proxyman-sanitized.json"]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("已加载本次 Proxyman 复抓的脱敏样例");
  const inputRef = useRef<HTMLInputElement>(null);

  const maxTotal = useMemo(
    () => Math.max(...rows.map((row) => totalTokens(row.tokens)), 1),
    [rows],
  );

  async function ingest(files: File[]) {
    const accepted = files.filter((file) => /\.(jsonl?|txt|log|har)$/i.test(file.name));
    const parsed = (
      await Promise.all(
        accepted.map(async (file) => parseTraffic(await file.text(), file.name)),
      )
    ).flat();
    if (!accepted.length) {
      setNotice("没有识别到 .json / .jsonl / .har / .log / .txt 文件");
      return;
    }
    if (!parsed.length) {
      setNotice("文件已读取，但未识别到 usage 指标或 request body");
      return;
    }
    setRows(parsed);
    setFileNames(accepted.map((file) => file.name));
    setNotice(`已在浏览器本地解析 ${accepted.length} 个文件、${parsed.length} 组请求`);
  }

  async function loadSanitizedFile() {
    const response = await fetch("/data/proxyman-live-sanitized.json");
    const parsed = parseTraffic(await response.text(), "proxyman-live-sanitized.json");
    setRows(parsed);
    setFileNames(["proxyman-live-sanitized.json"]);
    setNotice(`旧版验证矩阵解析成功：${parsed.length} 组请求`);
  }

  async function loadProxymanFile() {
    const response = await fetch("/data/proxyman-sanitized.json");
    const parsed = parseTraffic(await response.text(), "proxyman-sanitized.json");
    setRows(parsed);
    setFileNames(["proxyman-sanitized.json"]);
    setNotice(`本次 Proxyman 复抓解析成功：${parsed.length} 组关键请求`);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void ingest(Array.from(event.dataTransfer.files));
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    void ingest(Array.from(event.target.files ?? []));
  }

  return (
    <section className="analyzer" id="analyzer">
      <div className="analyzer-copy">
        <div>
          <span className="mono-label light">INTERACTIVE · LOCAL ONLY</span>
          <h2>把所有 request 拖进来</h2>
          <p>
            支持 JSON、JSONL、HAR、LOG 与纯文本。优先读取精确 usage；没有结构化字段时再用正则识别。文件只在你的浏览器内处理，不上传。
          </p>
        </div>
        <div className="regex-box">
          <strong>识别字段</strong>
          <code>input_tokens · output_tokens</code>
          <code>cache_creation_input_tokens</code>
          <code>cache_read_input_tokens</code>
          <code>claude_code.token.usage</code>
        </div>
      </div>

      <div
        className={`drop-zone ${dragging ? "dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json,.jsonl,.har,.log,.txt"
          onChange={onChange}
        />
        <span className="drop-icon">↳</span>
        <strong>拖入流量文件，或点击选择</strong>
        <small>{notice}</small>
        <div className="file-chips">
          {fileNames.map((name) => (
            <Chip key={name}>{name}</Chip>
          ))}
        </div>
        <div className="sample-actions">
          <button
            type="button"
            className="sample-button"
            onClick={(event) => {
              event.stopPropagation();
              void loadProxymanFile();
            }}
          >
            试跑本次 Proxyman 抓包
          </button>
          <button
            type="button"
            className="sample-button"
            onClick={(event) => {
              event.stopPropagation();
              void loadSanitizedFile();
            }}
          >
            试跑旧版验证矩阵
          </button>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <div>
            <span className="mono-label">TOKEN BAR CHART</span>
            <h3>每次请求的 token 构成</h3>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setRows(SAMPLE_ROWS);
              setFileNames(["proxyman-sanitized.json"]);
              setNotice("已恢复本次 Proxyman 复抓的脱敏样例");
            }}
          >
            恢复样例
          </button>
        </div>
        <div className="legend">
          {tokenKeys.map((key) => (
            <span key={key}>
              <i style={{ background: COLORS[key] }} /> {labels[key]}
            </span>
          ))}
        </div>
        <div className="bars" aria-label="Token stacked bar chart">
          {rows.map((row) => {
            const total = totalTokens(row.tokens);
            return (
              <div className="bar-row" key={row.id}>
                <div className="bar-label">
                  <strong>{row.label}</strong>
                  <small>{total.toLocaleString()} tokens</small>
                </div>
                <div className="bar-track">
                  <div className="bar-scale" style={{ width: `${Math.max(4, (total / maxTotal) * 100)}%` }}>
                    {tokenKeys.map((key) => {
                      const width = total ? (row.tokens[key] / total) * 100 : 0;
                      return width ? (
                        <span
                          key={key}
                          className="bar-segment"
                          style={{ width: `${width}%`, background: COLORS[key] }}
                          title={`${labels[key]}: ${row.tokens[key].toLocaleString()}`}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="metric-grid">
                  {tokenKeys.map((key) => (
                    <span key={key}>
                      <b style={{ color: COLORS[key] }}>{row.tokens[key].toLocaleString()}</b>
                      {labels[key]}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {rows.some((row) => row.anatomy) && (
        <div className="chart-card anatomy-card">
          <div className="chart-head">
            <div>
              <span className="mono-label">REQUEST ANATOMY</span>
              <h3>请求体的字符占比（不是 token 计费）</h3>
            </div>
          </div>
          <div className="legend">
            {anatomyKeys.map((key) => (
              <span key={key}>
                <i style={{ background: ANATOMY_COLORS[key] }} /> {anatomyLabels[key]}
              </span>
            ))}
          </div>
          {rows
            .filter((row) => row.anatomy)
            .map((row) => {
              const anatomy = row.anatomy as Anatomy;
              const total = anatomyKeys.reduce((sum, key) => sum + anatomy[key], 0);
              return (
                <div className="anatomy-row" key={`${row.id}-anatomy`}>
                  <div>
                    <strong>{row.label}</strong>
                    <span>
                      {row.systemSegments} system · {row.toolsCount} tools · {row.messagesCount} messages
                    </span>
                  </div>
                  <div className="anatomy-track">
                    {anatomyKeys.map((key) => (
                      <span
                        key={key}
                        style={{ width: `${(anatomy[key] / total) * 100}%`, background: ANATOMY_COLORS[key] }}
                        title={`${anatomyLabels[key]}: ${anatomy[key].toLocaleString()} chars`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          <p className="chart-note">
            只有 usage 字段能说明计费 token；字符图用来解释“上下文从哪里来”。中文、代码与特殊 token 都会让 chars ÷ 4 的粗估偏离真实值。
          </p>
        </div>
      )}
    </section>
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

export default function WorkshopPage() {
  const router = useRouter();

  async function openFullscreenPresentation(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    try {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen can be denied by browser policy; navigation should still work.
    }
    router.push("/presentation");
  }

  return (
    <main>
      <nav className="top-nav">
        <a className="brand" href="#top">CONTEXT / LAB</a>
        <div>
          <a href="#deck">演讲</a>
          <a href="#videos">视频</a>
          <a href="#proxyman">Proxyman</a>
          <a href="/proxyman-guide">Install Guide</a>
          <a href="/field-validation">Field Lab</a>
          <a href="#workshop">Workshop</a>
          <a href="#analyzer">Token 工具</a>
          <a className="nav-cta" href="/presentation" onClick={openFullscreenPresentation}>互动演示 ↗</a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="hero-copy">
          <span className="mono-label">AGENT CONTEXT WORKSHOP · 60–75 MIN</span>
          <h1>
            一句 Prompt，<br />
            模型到底
            <em>收到了什么？</em>
          </h1>
          <p>
            从 Model、Harness、Context、Tokens 到 Subagents。用真实 Claude Desktop 流量，把“感觉”变成证据。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#workshop">开始 Workshop ↘</a>
            <a className="secondary-button" href="#analyzer">打开 Token Analyzer</a>
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
          <span>Workshop setup 4&apos;</span><i />
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
        <SectionTitle kicker="35-MIN HANDS-ON WORKSHOP · OTLP FALLBACK">没有 Proxyman 时：用遥测做同一套思考练习</SectionTitle>
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

      <TokenAnalyzer />

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
