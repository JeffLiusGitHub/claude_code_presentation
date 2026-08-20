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
  InputFormat,
  MAX_INPUT_BYTES,
  MAX_REQUESTS,
  OfficialUsage,
  analyzeInput,
} from "./core";
import { DEMO_REQUEST_TEXT } from "./demo";
import styles from "./request-analyzer.module.css";

const DEMO_BUNDLE = analyzeInput(DEMO_REQUEST_TEXT, "sanitized-demo.json");
const ACCEPTED_FILE = /\.(jsonl?|har|log|txt|md|markdown)$/i;

const modeLabels: Record<AnalyzedRequest["mode"], string> = {
  full: "Full Request",
  summary: "Summary",
  "usage-only": "Usage only",
  document: "Markdown document",
};

const confidenceLabels: Record<CategoryAnalysis["confidence"], string> = {
  exact: "Direct field",
  marker: "Explicit marker",
  derived: "Derived",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
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
          <small>{category.nodes.length} content block{category.nodes.length === 1 ? "" : "s"} · {confidenceLabels[category.confidence]}</small>
        </span>
        <span className={styles.categoryValue}>
          <b>{amountLabel(category.amount, category.unit)}</b>
          <small>{category.unit === "estimated_tokens" ? "Estimated tokens" : "Character aggregate"}</small>
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
    throw new AnalysisError("TOO_MANY_REQUESTS", `Found ${requests.length} requests, exceeding the limit of ${MAX_REQUESTS}.`);
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
  const [pasteFormat, setPasteFormat] = useState<InputFormat>("auto");
  const [dragging, setDragging] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [notice, setNotice] = useState("Loaded a shortened, structure-only sanitized demo");
  const [error, setError] = useState<string | null>(null);
  const [chartCompact, setChartCompact] = useState(false);
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
    applyBundle(DEMO_BUNDLE, "Restored the shortened, structure-only sanitized demo", true);
    setPastedText("");
    setPasteFormat("auto");
    setPasteOpen(false);
  }

  function parsePasted(event: FormEvent) {
    event.preventDefault();
    try {
      const sourceName = pasteFormat === "markdown" ? "pasted-content.md" : "pasted-content.txt";
      const next = analyzeInput(pastedText, sourceName, { format: pasteFormat });
      applyBundle(next, `Identified ${next.requests.length} request${next.requests.length === 1 ? "" : "s"} locally in this browser`);
      setPasteOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to parse this content.");
    }
  }

  async function ingestFiles(files: File[]) {
    const accepted = files.filter((file) => ACCEPTED_FILE.test(file.name));
    if (!accepted.length) {
      setError("Choose a .json, .jsonl, .har, .log, .txt, .md, or .markdown file.");
      return;
    }
    if (accepted.some((file) => file.size > MAX_INPUT_BYTES)) {
      setError("At least one file exceeds the 5 MiB limit.");
      return;
    }
    const totalBytes = accepted.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_INPUT_BYTES) {
      setError("The selected files exceed the 5 MiB total size limit.");
      return;
    }
    const successes: AnalysisBundle[] = [];
    const failures: string[] = [];
    for (const file of accepted) {
      try {
        successes.push(analyzeInput(await file.text(), file.name));
      } catch (caught) {
        failures.push(`${file.name}: ${caught instanceof Error ? caught.message : "Parsing failed"}`);
      }
    }
    if (!successes.length) {
      setError(failures.join("; "));
      return;
    }
    const next = combineBundles(successes, accepted.map((file) => file.name).join(", "));
    next.warnings.push(...failures);
    applyBundle(next, `Loaded ${successes.length} file${successes.length === 1 ? "" : "s"} and ${next.requests.length} request${next.requests.length === 1 ? "" : "s"} locally in this browser`);
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
    <main className={styles.page} id="request-analyzer" lang="en">
      <PrimaryNav />
      <PageNav
        label="REQUEST ANALYZER"
        detail="LOCAL TOKEN EXPLORER"
        ariaLabel="Request Analyzer navigation"
        brandHref="#request-analyzer"
      >
        <div className={styles.topActions}>
          <span className={styles.localStatus}><i /> LOCAL ONLY</span>
          <button className={styles.demoButton} type="button" onClick={resetDemo}>
            <span aria-hidden="true">↻</span><b>Reset demo</b>
          </button>
          <button
            className={styles.importButton}
            type="button"
            aria-expanded={pasteOpen}
            aria-controls="request-input-panel"
            onClick={() => setPasteOpen((value) => !value)}
          >
            <span aria-hidden="true">＋</span><b>{pasteOpen ? "Close data input" : "Paste / upload data"}</b>
          </button>
        </div>
      </PageNav>

      <section className={styles.demoBanner} data-demo={isDemo}>
        <p><b>{isDemo ? "Demo data" : "Local data"}</b>{" "}{notice}</p>
        <span>{modeLabels[request.mode]} · {request.metadata.toolsCount ?? 0} tools · {request.metadata.messagesCount ?? 0} messages</span>
      </section>

      {pasteOpen && (
        <form id="request-input-panel" className={styles.pastePanel} aria-label="Add request data" onSubmit={parsePasted}>
          <div className={styles.pasteIntro}>
            <span>ADD REQUEST DATA</span>
            <h2>Paste text or choose local files</h2>
            <p>Use either input method below. Analysis happens locally in this browser.</p>
          </div>
          <div className={styles.formatField}>
            <label htmlFor="input-format">Input format</label>
            <select id="input-format" value={pasteFormat} onChange={(event) => setPasteFormat(event.target.value as InputFormat)}>
              <option value="auto">Auto detect</option>
              <option value="request">Request data</option>
              <option value="markdown">Markdown</option>
            </select>
            <small>Auto detects JSON, JSONL, HAR, Usage logs, and structured Markdown.</small>
          </div>
          <div className={styles.pasteField}>
            <label htmlFor="request-content"><span>01</span> Paste request text</label>
            <textarea
              id="request-content"
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              placeholder={pasteFormat === "markdown" ? "# System Prompt\n\nAdd instructions here.\n\n## Memory\n\nAdd explicit memory here." : "Paste Request JSON, logs, HAR content, or structured Markdown here…"}
            />
          </div>
          <div
            className={`${styles.fileDrop} ${dragging ? styles.dragging : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input ref={fileInputRef} type="file" multiple accept=".json,.jsonl,.har,.log,.txt,.md,.markdown" onChange={onFileChange} />
            <strong><span>02</span> Upload local files</strong>
            <b>Drop files anywhere in this box</b>
            <p>JSON · JSONL · HAR · LOG · TXT · MD<br />Up to 5 MiB total</p>
            <button className={styles.fileButton} type="button" onClick={() => fileInputRef.current?.click()}>Choose local files</button>
          </div>
          <div className={styles.pasteActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => { setPasteOpen(false); setError(null); }}>Cancel</button>
            <button className={styles.primaryButton} type="submit">Analyze request data →</button>
          </div>
          <p className={styles.privacyNote}><b>Local and private:</b> content stays in this browser. Authorization, API key, and Cookie fields are masked by default.</p>
        </form>
      )}

      {(error || bundle.warnings.length > 0 || request.warnings.length > 0) && (
        <section className={styles.messages} aria-live="polite">
          {error && <p className={styles.errorMessage}><b>Unable to update analysis: </b>{error}</p>}
          {[...bundle.warnings, ...request.warnings].map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}
        </section>
      )}

      <div className={styles.requestToolbar}>
        <label htmlFor="request-select">Current request</label>
        <select id="request-select" value={request.id} onChange={(event) => { setSelectedRequestId(event.target.value); setSelectedCategory(null); }}>
          {bundle.requests.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.label}</option>)}
        </select>
        <span>{bundle.requests.length} request{bundle.requests.length === 1 ? "" : "s"}</span><span>{modeLabels[request.mode]}</span><span>{request.model ?? "model unknown"}</span><span>{formatBytes(request.metadata.requestBytes)}</span>
      </div>

      <div className={`${styles.workspace} ${chartCompact ? styles.workspaceCompact : ""}`}>
        <section className={styles.treePane} aria-labelledby="content-structure-title">
          <div className={styles.sectionHead}>
            <div>
              <span>{request.mode.toUpperCase()} · {request.metadata.format}</span>
              <h1 id="content-structure-title">Content structure</h1>
              <p>{request.mode === "full" ? "Sorted by locally estimated tokens" : request.mode === "summary" ? "Original content removed; showing character aggregates" : request.mode === "document" ? "Split by Markdown headings with local token estimates" : "Only official usage data is available"}</p>
            </div>
            <div className={styles.total}>
              <b>{request.mode === "usage-only" ? "—" : amountLabel(categoryTotal, request.categories[0]?.unit ?? "estimated_tokens")}</b>
              <span>{request.mode === "full" ? "Category estimate" : request.mode === "summary" ? "Character aggregate" : request.mode === "document" ? "Document estimate" : "No content tree"}</span>
            </div>
          </div>

          {request.categories.length ? (
            <div className={styles.tree}>
              {request.categories.map((category, index) => <CategoryView category={category} index={index} key={`${request.id}-${category.id}`} selected={selectedCategory === category.id} onSelect={() => setSelectedCategory(category.id)} />)}
            </div>
          ) : (
            <div className={styles.emptyState}><b>This dataset does not include the Request Body</b><p>You can still inspect official Input, Cache, and Output usage, but System, Tools, or Messages cannot be reconstructed reliably.</p></div>
          )}
        </section>

        <aside className={styles.chartPane} data-compact={chartCompact} aria-label="Token usage graph">
          <button
            className={styles.chartToggle}
            type="button"
            aria-label={chartCompact ? "Expand graph panel" : "Narrow graph panel"}
            aria-pressed={chartCompact}
            onClick={() => setChartCompact((value) => !value)}
          >
            <span aria-hidden="true">{chartCompact ? "←" : "→"}</span>
            <small>{chartCompact ? "Expand" : "Narrow"}</small>
          </button>

          <div className={styles.compactChartSummary} aria-hidden={!chartCompact}>
            <strong>Token graph</strong>
            <span>{request.mode === "usage-only" ? (inputTotal !== undefined ? formatNumber(inputTotal) : "—") : amountLabel(categoryTotal, request.categories[0]?.unit ?? "estimated_tokens")}</span>
          </div>

          <div className={styles.chartContent}>
            <div className={styles.sectionHead}>
              <div><span>OFFICIAL USAGE + LOCAL ATTRIBUTION</span><h2>Token usage</h2><p>Official usage and local category estimates are shown separately</p></div>
            </div>

          <div className={styles.metrics}>
            <article><span>Official new input</span><b>{request.usage ? formatNumber(request.usage.input) : "—"}</b><small>input_tokens</small></article>
            <article><span>Cache Creation</span><b>{request.usage ? formatNumber(request.usage.cacheCreation) : "—"}</b><small>cache write</small></article>
            <article><span>Cache Read</span><b>{request.usage ? formatNumber(request.usage.cacheRead) : "—"}</b><small>cache read</small></article>
            <article><span>Official total input context</span><b>{inputTotal !== undefined ? formatNumber(inputTotal) : "—"}</b><small>Input + both Cache types</small></article>
            <article><span>Output</span><b>{request.usage ? formatNumber(request.usage.output) : "—"}</b><small>output_tokens</small></article>
            <article><span>{request.mode === "summary" ? "Local character aggregate" : "Local category estimate"}</span><b>{request.mode === "usage-only" ? "—" : amountLabel(categoryTotal, request.categories[0]?.unit ?? "estimated_tokens")}</b><small>{request.mode === "full" || request.mode === "document" ? "CJK + UTF-8 bytes ÷ 4" : request.mode === "summary" ? "Not tokens" : "No Request Body"}</small></article>
          </div>

          <div className={styles.chartHead}><h3>{request.mode === "summary" ? "Breakdown by characters" : "Breakdown by category"}</h3><span>{request.mode === "summary" ? "characters" : "estimated tokens"}</span></div>
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
          ) : <p className={styles.noChart}>Usage-only mode has no content categories to chart.</p>}

          <div className={styles.reconcile}>
            {reconciliation !== undefined ? (
              <>
                <b>Official total input − category estimate = {reconciliation > 0 ? "+" : ""}{formatNumber(reconciliation)}</b>
                <p>
                  {isDemo
                    ? "The sanitized demo keeps representative structure but intentionally shortens content while retaining reference usage totals. This gap is expected and is not a tokenizer benchmark."
                    : `The difference is about ${reconciliationPercent?.toFixed(1)}% of official total input. It may come from the model tokenizer, protocol boundaries, or local estimation error.`}
                </p>
              </>
            ) : request.mode === "summary" ? (
              <><b>Summary retains character aggregates only</b><p>Character counts cannot be converted into official billable tokens, so no category tokens are fabricated.</p></>
            ) : request.mode === "document" ? (
              <><b>Markdown uses a local token estimate</b><p>Markdown files have no official usage. Headings, body text, and syntax characters all contribute to the estimate.</p></>
            ) : request.mode === "usage-only" ? (
              <><b>Usage is available; content attribution is not</b><p>A complete Request Body is required to analyze System, Tools, Messages, and Tool Results.</p></>
            ) : (
              <><b>This Request has no official usage</b><p>Category estimates still help explain context sources, but cannot be used to reconcile actual billing.</p></>
            )}
          </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
