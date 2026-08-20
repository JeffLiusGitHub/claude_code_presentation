"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  CSSProperties,
  useMemo,
  useRef,
  useState,
} from "react";
import PageNav from "../page-nav";
import PrimaryNav from "../primary-nav";
import {
  AnalysisBundle,
  AnalysisError,
  AnalyzedRequest,
  CategoryAnalysis,
  ContentNode,
  MAX_INPUT_BYTES,
  MAX_REQUESTS,
  OfficialUsage,
  analyzeInput,
} from "./core";
import { DEMO_REQUEST_TEXT } from "./demo";
import styles from "./request-analyzer.module.css";

const DEMO_BUNDLE = analyzeInput(DEMO_REQUEST_TEXT, "sanitized-demo.json");
const ACCEPTED_FILE = /\.(jsonl?|har|log|txt)$/i;

const modeLabels: Record<AnalyzedRequest["mode"], string> = {
  full: "完整 Request",
  summary: "Summary",
  "usage-only": "Usage only",
};

const confidenceLabels: Record<CategoryAnalysis["confidence"], string> = {
  exact: "确定",
  marker: "明确标记",
  derived: "派生",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(value));
}

function formatBytes(value?: number) {
  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function officialInput(usage?: OfficialUsage) {
  return usage ? usage.input + usage.cacheCreation + usage.cacheRead : undefined;
}

function amountLabel(amount: number, unit: CategoryAnalysis["unit"]) {
  return unit === "estimated_tokens" ? `≈${formatNumber(amount)}` : `${formatNumber(amount)} chars`;
}

function ContentNodeView({ node, depth = 0 }: { node: ContentNode; depth?: number }) {
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(node.preview || node.note || node.children.length);

  if (!hasDetails) {
    return (
      <div className={styles.leafNode} style={{ "--node-depth": depth } as CSSProperties}>
        <code>{node.path}</code><span>{confidenceLabels[node.confidence]} · {amountLabel(node.amount, node.unit)}</span>
      </div>
    );
  }

  return (
    <details className={styles.contentNode} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span><b>{node.label}</b><code>{node.path}</code></span>
        <span className={styles.nodeMeta}><i>{node.type} · {confidenceLabels[node.confidence]}</i><strong>{amountLabel(node.amount, node.unit)}</strong></span>
      </summary>
      {open && (
        <div className={styles.nodeBody}>
          {node.note && <p className={styles.nodeNote}>{node.note}</p>}
          {node.preview && <pre className={node.redacted ? styles.redactedPreview : ""}>{node.preview}</pre>}
          {node.children.length > 0 && (
            <div className={styles.childNodes}>
              {node.children.map((child) => <ContentNodeView key={child.id} node={child} depth={depth + 1} />)}
            </div>
          )}
        </div>
      )}
    </details>
  );
}

function CategoryView({ category, index, selected, onSelect }: {
  category: CategoryAnalysis;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className={`${styles.category} ${selected ? styles.selected : ""}`}
      onToggle={(event) => {
        const isOpen = event.currentTarget.open;
        setOpen(isOpen);
        if (isOpen) onSelect();
      }}
    >
      <summary>
        <span className={styles.order}>{String(index + 1).padStart(2, "0")}</span>
        <span className={styles.categoryCopy}>
          <b>{category.label}</b>
          <small>{category.nodes.length} 个内容块 · {confidenceLabels[category.confidence]}</small>
        </span>
        <span className={styles.categoryValue}>
          <b>{amountLabel(category.amount, category.unit)}</b>
          <small>{category.unit === "estimated_tokens" ? "估算 Token" : "字符聚合"}</small>
        </span>
      </summary>
      {open && <div className={styles.categoryNodes}>{category.nodes.map((node) => <ContentNodeView key={node.id} node={node} />)}</div>}
    </details>
  );
}

function combineBundles(bundles: AnalysisBundle[], sourceName: string): AnalysisBundle {
  const requests = bundles.flatMap((bundle, bundleIndex) => bundle.requests.map((request) => ({
    ...request,
    id: `${bundleIndex}-${request.id}`,
  })));
  if (requests.length > MAX_REQUESTS) {
    throw new AnalysisError("TOO_MANY_REQUESTS", `识别到 ${requests.length} 个请求，超过 ${MAX_REQUESTS} 个限制。`);
  }
  return {
    source: {
      name: sourceName,
      bytes: bundles.reduce((sum, bundle) => sum + bundle.source.bytes, 0),
      format: bundles.length === 1 ? bundles[0].source.format : "multiple-files",
    },
    requests,
    warnings: bundles.flatMap((bundle) => bundle.warnings),
  };
}

export default function RequestAnalyzer() {
  const [bundle, setBundle] = useState<AnalysisBundle>(DEMO_BUNDLE);
  const [selectedRequestId, setSelectedRequestId] = useState(DEMO_BUNDLE.requests[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [notice, setNotice] = useState("已加载结构脱敏的本地 Demo");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const request = bundle.requests.find((item) => item.id === selectedRequestId) ?? bundle.requests[0];
  const categoryTotal = useMemo(() => request.categories.reduce((sum, category) => sum + category.amount, 0), [request]);
  const maxCategory = Math.max(...request.categories.map((category) => category.amount), 1);
  const inputTotal = officialInput(request.usage);
  const reconciliation = request.mode === "full" && inputTotal !== undefined ? inputTotal - categoryTotal : undefined;
  const reconciliationPercent = reconciliation !== undefined && inputTotal ? Math.abs(reconciliation) / inputTotal * 100 : undefined;

  function applyBundle(next: AnalysisBundle, nextNotice: string, demo = false) {
    setBundle(next);
    setSelectedRequestId(next.requests[0].id);
    setSelectedCategory(null);
    setNotice(nextNotice);
    setError(null);
    setIsDemo(demo);
  }

  function resetDemo() {
    applyBundle(DEMO_BUNDLE, "已恢复结构脱敏的本地 Demo", true);
    setPastedText("");
    setPasteOpen(false);
  }

  function parsePasted(event: FormEvent) {
    event.preventDefault();
    try {
      const next = analyzeInput(pastedText, "pasted-request.json");
      applyBundle(next, `已在浏览器本地识别 ${next.requests.length} 个请求`);
      setPasteOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法解析这段内容。 ");
    }
  }

  async function ingestFiles(files: File[]) {
    const accepted = files.filter((file) => ACCEPTED_FILE.test(file.name));
    if (!accepted.length) {
      setError("请选择 .json、.jsonl、.har、.log 或 .txt 文件。 ");
      return;
    }
    if (accepted.some((file) => file.size > MAX_INPUT_BYTES)) {
      setError("至少一个文件超过 5 MiB 限制。 ");
      return;
    }
    const totalBytes = accepted.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_INPUT_BYTES) {
      setError("所选文件总大小超过 5 MiB 限制。 ");
      return;
    }
    const successes: AnalysisBundle[] = [];
    const failures: string[] = [];
    for (const file of accepted) {
      try {
        successes.push(analyzeInput(await file.text(), file.name));
      } catch (caught) {
        failures.push(`${file.name}: ${caught instanceof Error ? caught.message : "解析失败"}`);
      }
    }
    if (!successes.length) {
      setError(failures.join("；"));
      return;
    }
    const next = combineBundles(successes, accepted.map((file) => file.name).join(", "));
    next.warnings.push(...failures);
    applyBundle(next, `已在浏览器本地读取 ${successes.length} 个文件、${next.requests.length} 个请求`);
    setPasteOpen(false);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    void ingestFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void ingestFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <main className={styles.page} id="request-analyzer" lang="zh-CN">
      <PrimaryNav />
      <PageNav
        label="REQUEST ANALYZER"
        detail="LOCAL TOKEN EXPLORER"
        ariaLabel="Request Analyzer navigation"
        brandHref="#request-analyzer"
      >
        <div className={styles.topActions}>
          <span className={styles.localStatus}><i /> LOCAL ONLY</span>
          <button className={styles.secondaryButton} type="button" onClick={resetDemo}>恢复 Demo</button>
          <button className={styles.primaryButton} type="button" onClick={() => setPasteOpen((value) => !value)}>粘贴实际 Request</button>
        </div>
      </PageNav>

      <section className={styles.demoBanner} data-demo={isDemo}>
        <p><b>{isDemo ? "Demo 数据" : "本地数据"}</b>{" "}{notice}</p>
        <span>{modeLabels[request.mode]} · {request.metadata.toolsCount ?? 0} tools · {request.metadata.messagesCount ?? 0} messages</span>
      </section>

      {pasteOpen && (
        <form className={styles.pastePanel} aria-label="粘贴 Request" onSubmit={parsePasted}>
          <label htmlFor="request-json">Request JSON、JSONL、HAR 或日志文本</label>
          <textarea id="request-json" value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder={'{ "model": "claude-…", "system": […], "tools": […], "messages": […] }'} />
          <div
            className={`${styles.fileDrop} ${dragging ? styles.dragging : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input ref={fileInputRef} type="file" multiple accept=".json,.jsonl,.har,.log,.txt" onChange={onFileChange} />
            <b>也可以拖入本地文件</b>
            <span>JSON · JSONL · HAR · LOG · TXT，单文件最大 5 MiB</span>
            <button className={styles.secondaryButton} type="button" onClick={() => fileInputRef.current?.click()}>选择文件</button>
          </div>
          <div className={styles.pasteActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => { setPasteOpen(false); setError(null); }}>取消</button>
            <button className={styles.primaryButton} type="submit">解析 Request</button>
          </div>
          <p>内容只在当前浏览器内处理，不上传或保存。Authorization、API Key 与 Cookie 字段默认遮罩。</p>
        </form>
      )}

      {(error || bundle.warnings.length > 0 || request.warnings.length > 0) && (
        <section className={styles.messages} aria-live="polite">
          {error && <p className={styles.errorMessage}><b>无法更新分析：</b>{error}</p>}
          {[...bundle.warnings, ...request.warnings].map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}
        </section>
      )}

      <div className={styles.requestToolbar}>
        <label htmlFor="request-select">当前 Request</label>
        <select id="request-select" value={request.id} onChange={(event) => { setSelectedRequestId(event.target.value); setSelectedCategory(null); }}>
          {bundle.requests.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.label}</option>)}
        </select>
        <span>{bundle.requests.length} 个请求</span><span>{modeLabels[request.mode]}</span><span>{request.model ?? "model unknown"}</span><span>{formatBytes(request.metadata.requestBytes)}</span>
      </div>

      <div className={styles.workspace}>
        <section className={styles.treePane} aria-labelledby="content-structure-title">
          <div className={styles.sectionHead}>
            <div>
              <span>{request.mode.toUpperCase()} · {request.metadata.format}</span>
              <h1 id="content-structure-title">内容结构</h1>
              <p>{request.mode === "full" ? "按本地估算 Token 从大到小排列" : request.mode === "summary" ? "原始正文已移除，显示字符聚合" : "当前数据只保留官方 Usage"}</p>
            </div>
            <div className={styles.total}>
              <b>{request.mode === "usage-only" ? "—" : amountLabel(categoryTotal, request.categories[0]?.unit ?? "estimated_tokens")}</b>
              <span>{request.mode === "full" ? "分类估算" : request.mode === "summary" ? "字符聚合" : "无内容树"}</span>
            </div>
          </div>

          {request.categories.length ? (
            <div className={styles.tree}>
              {request.categories.map((category, index) => <CategoryView category={category} index={index} key={`${request.id}-${category.id}`} selected={selectedCategory === category.id} onSelect={() => setSelectedCategory(category.id)} />)}
            </div>
          ) : (
            <div className={styles.emptyState}><b>这份数据没有保留 Request Body</b><p>仍可以查看官方 Input、Cache 与 Output，但不能可靠生成 System、Tools 或 Messages 内容树。</p></div>
          )}
        </section>

        <aside className={styles.chartPane} aria-labelledby="token-usage-title">
          <div className={styles.sectionHead}>
            <div><span>OFFICIAL USAGE + LOCAL ATTRIBUTION</span><h2 id="token-usage-title">Token 用量</h2><p>官方 Usage 与本地分类估算分开表达</p></div>
          </div>

          <div className={styles.metrics}>
            <article><span>官方新增 Input</span><b>{request.usage ? formatNumber(request.usage.input) : "—"}</b><small>input_tokens</small></article>
            <article><span>Cache Creation</span><b>{request.usage ? formatNumber(request.usage.cacheCreation) : "—"}</b><small>缓存写入</small></article>
            <article><span>Cache Read</span><b>{request.usage ? formatNumber(request.usage.cacheRead) : "—"}</b><small>缓存读取</small></article>
            <article><span>官方总输入上下文</span><b>{inputTotal !== undefined ? formatNumber(inputTotal) : "—"}</b><small>Input + 两类 Cache</small></article>
            <article><span>Output</span><b>{request.usage ? formatNumber(request.usage.output) : "—"}</b><small>output_tokens</small></article>
            <article><span>{request.mode === "summary" ? "本地字符聚合" : "本地分类估算总量"}</span><b>{request.mode === "usage-only" ? "—" : amountLabel(categoryTotal, request.categories[0]?.unit ?? "estimated_tokens")}</b><small>{request.mode === "full" ? "CJK + UTF-8 bytes ÷ 4" : request.mode === "summary" ? "不是 Token" : "无 Request Body"}</small></article>
          </div>

          <div className={styles.chartHead}><h3>{request.mode === "summary" ? "按字符占比" : "按分类占比"}</h3><span>{request.mode === "summary" ? "characters" : "estimated tokens"}</span></div>
          {request.categories.length ? (
            <ol className={`${styles.bars} ${selectedCategory ? styles.hasSelection : ""}`}>
              {request.categories.map((category) => {
                const share = categoryTotal ? category.amount / categoryTotal * 100 : 0;
                return (
                  <li className={selectedCategory === category.id ? styles.activeBar : ""} key={category.id}>
                    <button type="button" onClick={() => setSelectedCategory(category.id)}>{category.label}</button>
                    <i aria-hidden="true"><b style={{ width: `${Math.max(2, category.amount / maxCategory * 100)}%` }} /></i>
                    <strong>{share.toFixed(1)}%</strong><small>{amountLabel(category.amount, category.unit)}</small>
                  </li>
                );
              })}
            </ol>
          ) : <p className={styles.noChart}>Usage-only 模式没有可绘制的内容分类。</p>}

          <div className={styles.reconcile}>
            {reconciliation !== undefined ? (
              <><b>官方总输入 − 分类估算 = {reconciliation > 0 ? "+" : ""}{formatNumber(reconciliation)}</b><p>差值约为官方总输入的 {reconciliationPercent?.toFixed(1)}%。它可能来自模型 Tokenizer、协议边界或本地估算误差。</p></>
            ) : request.mode === "summary" ? (
              <><b>Summary 只保留字符聚合</b><p>字符数不能转换为官方计费 Token，因此不会伪造分类 Token。</p></>
            ) : request.mode === "usage-only" ? (
              <><b>Usage 可用，内容归因不可用</b><p>需要完整 Request Body 才能分析 System、Tools、Messages 与 Tool Result。</p></>
            ) : (
              <><b>当前 Request 没有官方 Usage</b><p>分类值仍可帮助理解上下文来源，但不能用于核对实际计费。</p></>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
