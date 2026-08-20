export const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const MAX_REQUESTS = 500;
export const MAX_DEPTH = 64;
export const MAX_NODES = 100_000;
export const PREVIEW_CHARS = 2_000;

export type AnalysisMode = "full" | "summary" | "usage-only" | "document";
export type InputFormat = "auto" | "request" | "markdown";
export type AnalyzeInputOptions = { format?: InputFormat };
export type Confidence = "exact" | "marker" | "derived";
export type MeasureUnit = "estimated_tokens" | "characters";
export type CategoryId =
  | "system"
  | "developer"
  | "memory"
  | "toolDefinitions"
  | "toolCalls"
  | "toolResults"
  | "currentUser"
  | "userHistory"
  | "assistantHistory"
  | "attachments"
  | "document"
  | "other";

export type OfficialUsage = {
  input: number;
  cacheCreation: number;
  cacheRead: number;
  output: number;
};

export type ContentNode = {
  id: string;
  label: string;
  path: string;
  type: string;
  amount: number;
  unit: MeasureUnit;
  confidence: Confidence;
  preview?: string;
  note?: string;
  redacted?: boolean;
  children: ContentNode[];
};

export type CategoryAnalysis = {
  id: CategoryId;
  label: string;
  amount: number;
  unit: MeasureUnit;
  confidence: Confidence;
  nodes: ContentNode[];
};

export type RequestMetadata = {
  sourceName: string;
  format: string;
  requestBytes?: number;
  systemSegments?: number;
  toolsCount?: number;
  messagesCount?: number;
  maxTokens?: number;
  httpStatus?: number;
  sourceIndex: number;
};

export type AnalyzedRequest = {
  id: string;
  label: string;
  mode: AnalysisMode;
  model?: string;
  timestamp?: string;
  usage?: OfficialUsage;
  metadata: RequestMetadata;
  categories: CategoryAnalysis[];
  warnings: string[];
};

export type AnalysisBundle = {
  source: { name: string; bytes: number; format: string };
  requests: AnalyzedRequest[];
  warnings: string[];
};

type JsonRecord = Record<string, unknown>;

const CATEGORY_LABELS: Record<CategoryId, string> = {
  system: "System Prompt",
  developer: "Developer Instructions",
  memory: "Memory",
  toolDefinitions: "Tool Definitions",
  toolCalls: "Tool Calls",
  toolResults: "Tool Results",
  currentUser: "Current User",
  userHistory: "User History",
  assistantHistory: "Assistant History",
  attachments: "Attachments",
  document: "Other Markdown",
  other: "Other / Unattributed",
};

const SENSITIVE_KEYS = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "api-key",
  "apikey",
  "cookie",
  "set-cookie",
]);

const textEncoder = new TextEncoder();
const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const EXPLICIT_MEMORY_PATTERN = /<(memory|claude_memory|project_memory)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const MEMORY_FILE_MARKER = /(?:CLAUDE|MEMORY)\.md/i;
const MARKDOWN_FILE = /\.(?:md|markdown)$/i;
const MARKDOWN_HEADING_CATEGORIES = new Map<string, CategoryId>([
  ...["system", "system prompt", "system prompts", "system instructions", "system message", "\u7cfb\u7edf\u63d0\u793a\u8bcd", "\u7cfb\u7edf\u63d0\u793a", "\u7cfb\u7edf\u6307\u4ee4"].map((heading) => [heading, "system"] as const),
  ...["developer", "developer prompt", "developer instructions", "developer message", "\u5f00\u53d1\u8005\u6307\u4ee4"].map((heading) => [heading, "developer"] as const),
  ...["memory", "memories", "project memory", "claude memory", "\u8bb0\u5fc6"].map((heading) => [heading, "memory"] as const),
  ...["tools", "tool definitions", "available tools", "tool schemas", "functions", "function definitions", "\u5de5\u5177\u5b9a\u4e49", "\u53ef\u7528\u5de5\u5177"].map((heading) => [heading, "toolDefinitions"] as const),
  ...["tool calls", "tool call", "tool use", "tool uses", "function calls", "\u5de5\u5177\u8c03\u7528"].map((heading) => [heading, "toolCalls"] as const),
  ...["tool results", "tool result", "tool outputs", "function results", "function outputs", "\u5de5\u5177\u7ed3\u679c"].map((heading) => [heading, "toolResults"] as const),
  ...["current user", "current user message", "current request", "latest user message", "\u5f53\u524d\u7528\u6237", "\u5f53\u524d\u7528\u6237\u6d88\u606f"].map((heading) => [heading, "currentUser"] as const),
  ...["user history", "previous user messages", "user messages", "\u7528\u6237\u5386\u53f2"].map((heading) => [heading, "userHistory"] as const),
  ...["assistant history", "assistant messages", "assistant responses", "\u52a9\u624b\u5386\u53f2"].map((heading) => [heading, "assistantHistory"] as const),
  ...["attachments", "images", "documents", "files", "\u9644\u4ef6"].map((heading) => [heading, "attachments"] as const),
]);

export class AnalysisError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNumber(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function asOptionalNumber(value: unknown): number | undefined {
  const parsed = asNumber(value);
  return parsed || undefined;
}

function stableText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? "");
  } catch {
    return String(value ?? "");
  }
}

export function estimateTokens(value: unknown): number {
  const text = stableText(value);
  let cjk = 0;
  const remainder = text.replace(CJK_PATTERN, () => {
    cjk += 1;
    return "";
  });
  return Math.ceil(cjk + textEncoder.encode(remainder).length / 4);
}

function inputTokenTotal(usage: OfficialUsage): number {
  return usage.input + usage.cacheCreation + usage.cacheRead;
}

function sensitiveKey(value: string) {
  return SENSITIVE_KEYS.has(value.trim().toLowerCase());
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (isRecord(value) && typeof value.type === "string") return value.type;
  return typeof value;
}

function childPath(parent: string, key: string | number) {
  if (typeof key === "number") return `${parent}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

function maskSensitivePreview(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  if (depth >= 8) return "[Nested content]";
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value.slice(0, 100).map((item) => maskSensitivePreview(item, depth + 1, seen));
    if (value.length > 100) items.push(`[${value.length - 100} more items]`);
    return items;
  }

  const record = value as JsonRecord;
  const namedSensitive = typeof record.name === "string" && sensitiveKey(record.name);
  const entries = Object.entries(record);
  const masked: JsonRecord = {};
  entries.slice(0, 100).forEach(([key, item]) => {
    const shouldRedact = sensitiveKey(key) || (namedSensitive && key.toLowerCase() === "value");
    masked[key] = shouldRedact ? "[REDACTED]" : maskSensitivePreview(item, depth + 1, seen);
  });
  if (entries.length > 100) masked["…"] = `[${entries.length - 100} more fields]`;
  return masked;
}

function preview(value: unknown, redacted: boolean): string {
  if (redacted) return "[REDACTED]";
  const rendered = typeof value === "string" ? value : stableText(maskSensitivePreview(value));
  return rendered.length > PREVIEW_CHARS ? `${rendered.slice(0, PREVIEW_CHARS)}\n… Truncated ${rendered.length - PREVIEW_CHARS} characters` : rendered;
}

function createNode(
  label: string,
  path: string,
  value: unknown,
  confidence: Confidence = "exact",
  note?: string,
  depth = 0,
  redacted = false,
): ContentNode {
  const node: ContentNode = {
    id: path,
    label,
    path,
    type: valueType(value),
    amount: estimateTokens(value),
    unit: "estimated_tokens",
    confidence,
    preview: preview(value, redacted),
    note,
    redacted,
    children: [],
  };

  if (redacted || depth >= 3 || value === null || typeof value !== "object") return node;
  if (Array.isArray(value)) {
    node.children = value.slice(0, 100).map((item, index) =>
      createNode(`[${index}]`, childPath(path, index), item, confidence, undefined, depth + 1),
    );
    if (value.length > 100) node.note = `${node.note ? `${node.note} ` : ""}Only the first 100 items are expandable.`;
    return node;
  }

  const record = value as JsonRecord;
  const namedSensitive = typeof record.name === "string" && sensitiveKey(record.name);
  node.children = Object.entries(record).slice(0, 100).map(([key, item]) => {
    const childRedacted = sensitiveKey(key) || (namedSensitive && key.toLowerCase() === "value");
    return createNode(key, childPath(path, key), item, confidence, undefined, depth + 1, childRedacted);
  });
  if (Object.keys(record).length > 100) node.note = `${node.note ? `${node.note} ` : ""}Only the first 100 fields are expandable.`;
  return node;
}

function isValidSystem(value: unknown): boolean {
  return value === undefined || typeof value === "string" || Array.isArray(value);
}

export function isAnthropicRequestBody(value: unknown): value is JsonRecord {
  if (!isRecord(value) || !Array.isArray(value.messages)) return false;
  if (!isValidSystem(value.system)) return false;
  if (value.tools !== undefined && !Array.isArray(value.tools)) return false;
  return typeof value.model === "string" || value.system !== undefined || value.tools !== undefined;
}

function parseJsonString(value: unknown): unknown | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function requestBodyFromCandidate(value: unknown): JsonRecord | null {
  if (isAnthropicRequestBody(value)) return value;
  if (!isRecord(value)) return null;

  for (const key of ["request", "request_body", "requestBody"]) {
    const candidate = value[key];
    if (isAnthropicRequestBody(candidate)) return candidate;
    const parsed = parseJsonString(candidate);
    if (isAnthropicRequestBody(parsed)) return parsed;
  }

  if (isRecord(value.postData)) {
    const parsed = parseJsonString(value.postData.text);
    if (isAnthropicRequestBody(parsed)) return parsed;
  }

  if (isRecord(value.attributes)) {
    const attributes = value.attributes;
    for (const key of ["body", "request_body", "request.body"]) {
      const candidate = attributes[key];
      if (isAnthropicRequestBody(candidate)) return candidate;
      const parsed = parseJsonString(candidate);
      if (isAnthropicRequestBody(parsed)) return parsed;
    }
  }

  const parsedBody = parseJsonString(value.body);
  if (isAnthropicRequestBody(parsedBody)) return parsedBody;
  if (isAnthropicRequestBody(value.body)) return value.body;
  return null;
}

function usageFromCandidate(value: unknown): OfficialUsage | null {
  if (!isRecord(value)) return null;
  const candidates = [value.usage, value.token_usage, value.tokens, value];
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const hasUsage = [
      "input_tokens",
      "output_tokens",
      "cache_creation_input_tokens",
      "cache_read_input_tokens",
      "input",
      "output",
      "cacheCreation",
      "cacheRead",
    ].some((key) => key in candidate);
    if (!hasUsage) continue;
    const usage = {
      input: asNumber(candidate.input ?? candidate.input_tokens),
      output: asNumber(candidate.output ?? candidate.output_tokens),
      cacheCreation: asNumber(candidate.cacheCreation ?? candidate.cache_creation_input_tokens),
      cacheRead: asNumber(candidate.cacheRead ?? candidate.cache_read_input_tokens),
    };
    if (inputTokenTotal(usage) || usage.output) return usage;
  }
  return null;
}

function usageFromText(text: string): OfficialUsage | null {
  const fields: Record<keyof OfficialUsage, string> = {
    input: "input_tokens",
    output: "output_tokens",
    cacheCreation: "cache_creation_input_tokens",
    cacheRead: "cache_read_input_tokens",
  };
  const usage: OfficialUsage = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  for (const [key, field] of Object.entries(fields) as [keyof OfficialUsage, string][]) {
    const pattern = new RegExp(`(?:^|[^A-Za-z0-9_])["']?${field}["']?\\s*[:=]\\s*(\\d+(?:\\.\\d+)?)`, "gi");
    for (const match of text.matchAll(pattern)) usage[key] = Math.max(usage[key], Number(match[1]));
  }
  return inputTokenTotal(usage) || usage.output ? usage : null;
}

function decodeHarContent(content: JsonRecord): string {
  const text = typeof content.text === "string" ? content.text : "";
  if (content.encoding !== "base64") return text;
  try {
    if (typeof atob === "function") {
      const bytes = Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    const nodeBuffer = (globalThis as { Buffer?: { from(value: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
    return nodeBuffer ? nodeBuffer.from(text, "base64").toString("utf8") : "";
  } catch {
    return "";
  }
}

function toBlocks(content: unknown): unknown[] {
  if (Array.isArray(content)) return content;
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (content === undefined || content === null) return [];
  return [content];
}

function blockType(block: unknown): string {
  return isRecord(block) && typeof block.type === "string" ? block.type : typeof block === "string" ? "text" : "unknown";
}

function blockText(block: unknown): string {
  if (typeof block === "string") return block;
  if (isRecord(block) && typeof block.text === "string") return block.text;
  return "";
}

function hasOrdinaryText(message: JsonRecord): boolean {
  return toBlocks(message.content).some((block) => blockType(block) === "text" && Boolean(blockText(block).trim()));
}

function explicitMemorySource(block: unknown): boolean {
  if (!isRecord(block)) return false;
  const type = typeof block.type === "string" ? block.type.toLowerCase() : "";
  const sourceValue = block.source;
  const source = typeof sourceValue === "string"
    ? sourceValue
    : isRecord(sourceValue)
      ? String(sourceValue.path ?? sourceValue.file ?? sourceValue.type ?? "")
      : String(block.path ?? block.file_path ?? "");
  if (type === "memory" || source.toLowerCase() === "memory") return true;
  return /(?:^|[\\/])(CLAUDE|MEMORY)\.md$/i.test(source.trim());
}

function splitMemoryText(text: string): { memory: string[]; remainder: string } {
  const memory: string[] = [];
  const remainder = text.replace(EXPLICIT_MEMORY_PATTERN, (_match, _tag: string, body: string) => {
    memory.push(body);
    return "";
  });
  return { memory, remainder };
}

function highestConfidence(nodes: ContentNode[]): Confidence {
  return nodes.some((node) => node.confidence === "derived")
    ? "derived"
    : nodes.some((node) => node.confidence === "marker")
      ? "marker"
      : "exact";
}

function buildFullCategories(body: JsonRecord): CategoryAnalysis[] {
  const buckets = new Map<CategoryId, ContentNode[]>();
  const add = (id: CategoryId, node: ContentNode) => buckets.set(id, [...(buckets.get(id) ?? []), node]);

  const systemItems = Array.isArray(body.system) ? body.system : body.system === undefined ? [] : [body.system];
  systemItems.forEach((item, index) => {
    const path = `$.system[${index}]`;
    if (explicitMemorySource(item)) {
      add("memory", createNode(`Memory block ${index + 1}`, path, item, "exact", "Source metadata explicitly identifies this block as Memory."));
      return;
    }
    const text = blockText(item);
    const split = text ? splitMemoryText(text) : { memory: [], remainder: text };
    split.memory.forEach((memoryText, memoryIndex) => {
      add("memory", createNode(`Memory segment ${memoryIndex + 1}`, `${path}.text<memory:${memoryIndex}>`, memoryText, "marker", "Recognized from a supported, fully bounded Memory tag."));
    });
    let systemValue = item;
    if (split.memory.length && isRecord(item)) systemValue = { ...item, text: split.remainder };
    else if (split.memory.length) systemValue = split.remainder;
    const note = MEMORY_FILE_MARKER.test(text) && !split.memory.length
      ? "CLAUDE.md / MEMORY.md is mentioned without a verifiable boundary; this content remains in System."
      : undefined;
    if (stableText(systemValue).trim()) add("system", createNode(`System block ${index + 1}`, path, systemValue, "exact", note));
  });

  for (const key of ["memory", "memories"] as const) {
    if (body[key] !== undefined) add("memory", createNode(key, `$.${key}`, body[key], "exact", "The JSON path explicitly identifies this content as Memory."));
  }
  if (body.developer !== undefined) add("developer", createNode("developer", "$.developer", body.developer));

  const tools = Array.isArray(body.tools) ? body.tools : [];
  tools.forEach((tool, index) => add("toolDefinitions", createNode(`Tool ${index + 1}`, `$.tools[${index}]`, tool)));

  const messages = Array.isArray(body.messages) ? body.messages.filter(isRecord) : [];
  let currentUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user" && hasOrdinaryText(messages[index])) {
      currentUserIndex = index;
      break;
    }
  }

  messages.forEach((message, messageIndex) => {
    const role = typeof message.role === "string" ? message.role : "unknown";
    toBlocks(message.content).forEach((block, blockIndex) => {
      const type = blockType(block);
      const path = `$.messages[${messageIndex}].content[${blockIndex}]`;
      const label = `${role} · ${type}`;
      if (role === "developer") add("developer", createNode(label, path, block));
      else if (type === "tool_use" || type === "server_tool_use") add("toolCalls", createNode(label, path, block));
      else if (type === "tool_result") add("toolResults", createNode(label, path, block));
      else if (type === "image" || type === "document") add("attachments", createNode(label, path, block));
      else if (type === "text" && role === "user" && messageIndex === currentUserIndex) add("currentUser", createNode(label, path, block));
      else if (type === "text" && role === "user") add("userHistory", createNode(label, path, block));
      else if ((type === "text" || type === "thinking" || type === "redacted_thinking") && role === "assistant") add("assistantHistory", createNode(label, path, block));
      else add("other", createNode(label, path, block, "derived", `Unsupported content block type: ${type}`));
    });
  });

  return [...buckets.entries()]
    .map(([id, nodes]) => ({
      id,
      label: CATEGORY_LABELS[id],
      amount: nodes.reduce((sum, node) => sum + node.amount, 0),
      unit: "estimated_tokens" as const,
      confidence: highestConfidence(nodes),
      nodes,
    }))
    .filter((category) => category.amount > 0 || category.nodes.length > 0)
    .sort((a, b) => b.amount - a.amount);
}

function summaryNode(label: string, path: string, amount: number): ContentNode {
  return {
    id: path,
    label,
    path,
    type: "aggregate",
    amount,
    unit: "characters",
    confidence: "derived",
    preview: `${amount.toLocaleString("en-US")} characters; original content was removed during sanitization and cannot be expanded.`,
    note: "Summary mode retains aggregate values only.",
    redacted: true,
    children: [],
  };
}

function buildSummaryCategories(anatomy: JsonRecord): CategoryAnalysis[] {
  const mappings: [CategoryId, string, unknown][] = [
    ["system", "system", anatomy.system],
    ["toolDefinitions", "tools", anatomy.tools],
    ["userHistory", "messages", anatomy.messages],
    ["other", "other", anatomy.other],
  ];
  return mappings
    .map(([id, key, raw]) => {
      const amount = asNumber(raw);
      const nodes = amount ? [summaryNode(CATEGORY_LABELS[id], `$.anatomy.${key}`, amount)] : [];
      return { id, label: CATEGORY_LABELS[id], amount, unit: "characters" as const, confidence: "derived" as const, nodes };
    })
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function makeFullRequest(
  body: JsonRecord,
  sourceName: string,
  sourceIndex: number,
  usage?: OfficialUsage,
  extra: Partial<RequestMetadata> & { label?: string; timestamp?: string } = {},
): AnalyzedRequest {
  const systemSegments = Array.isArray(body.system) ? body.system.length : body.system === undefined ? 0 : 1;
  const toolsCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const messagesCount = Array.isArray(body.messages) ? body.messages.length : 0;
  return {
    id: `${sourceName}-full-${sourceIndex}`,
    label: extra.label ?? `${String(body.model ?? "Claude Request").replace(/^claude-/, "")} · Request ${sourceIndex + 1}`,
    mode: "full",
    model: typeof body.model === "string" ? body.model : undefined,
    timestamp: extra.timestamp,
    usage,
    metadata: {
      sourceName,
      format: extra.format ?? "anthropic-request",
      requestBytes: extra.requestBytes ?? textEncoder.encode(stableText(body)).length,
      systemSegments,
      toolsCount,
      messagesCount,
      maxTokens: asOptionalNumber(body.max_tokens),
      httpStatus: extra.httpStatus,
      sourceIndex,
    },
    categories: buildFullCategories(body),
    warnings: usage ? [] : ["No official Usage could be associated with this input; category values are local estimates only."],
  };
}

type MarkdownHeading = { label: string; level: number; index: number };

function markdownLines(text: string): { text: string; index: number }[] {
  const lines: { text: string; index: number }[] = [];
  for (const match of text.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)) {
    if (!match[0] && match.index === text.length) break;
    lines.push({
      text: match[0].replace(/(?:\r\n|\n|\r)$/, ""),
      index: match.index ?? 0,
    });
  }
  return lines;
}

function collectMarkdownHeadings(text: string): MarkdownHeading[] {
  const lines = markdownLines(text);
  const headings: MarkdownHeading[] = [];
  let scanStart = 0;
  let fenceCharacter: "`" | "~" | null = null;
  let fenceLength = 0;

  if (lines[0]?.text.replace(/^\uFEFF/, "").trim() === "---") {
    const frontmatterEnd = lines.slice(1).findIndex((line) => /^(?:---|\.\.\.)\s*$/.test(line.text.trim()));
    if (frontmatterEnd >= 0) scanStart = frontmatterEnd + 2;
  }

  for (let index = scanStart; index < lines.length; index += 1) {
    const line = lines[index].text;
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      const character = fence[1][0] as "`" | "~";
      if (!fenceCharacter) {
        fenceCharacter = character;
        fenceLength = fence[1].length;
      } else if (character === fenceCharacter && fence[1].length >= fenceLength) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      continue;
    }
    if (fenceCharacter) continue;

    const atx = line.match(/^\s{0,3}(#{1,6})[\t ]+(.+?)(?:[\t ]+#+[\t ]*)?$/);
    if (atx) {
      headings.push({ label: atx[2].trim(), level: atx[1].length, index: lines[index].index });
      continue;
    }

    const underline = lines[index + 1]?.text.match(/^\s{0,3}(=+|-+)\s*$/);
    if (line.trim() && underline) {
      headings.push({ label: line.trim(), level: underline[1][0] === "=" ? 1 : 2, index: lines[index].index });
      index += 1;
    }
  }
  return headings;
}

function normalizeMarkdownHeading(value: string): string {
  return value
    .replace(/[`*_~]/g, "")
    .replace(/^\d+(?:\.\d+)*[.)]?[\t ]+/, "")
    .replace(/[\t ]*[[(](?:≈?[\t ]*)?[\d,.]+[\t ]*(?:tokens?|chars?|characters?)[\])]$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[:：]+$/, "")
    .replace(/\s+/g, " ");
}

function markdownCategory(label: string): CategoryId | undefined {
  return MARKDOWN_HEADING_CATEGORIES.get(normalizeMarkdownHeading(label));
}

function isLikelyMarkdown(text: string): boolean {
  if (collectMarkdownHeadings(text).length) return true;
  if (/^\s*---\s*\r?\n[\s\S]+?\r?\n(?:---|\.\.\.)\s*(?:\r?\n|$)/.test(text)) return true;
  if (/^\s{0,3}(?:`{3,}|~{3,})[^\r\n]*$/m.test(text)) return true;
  const listItems = text.match(/^\s{0,3}(?:[-+*]|\d+[.)])[\t ]+\S/gm)?.length ?? 0;
  const blockQuotes = text.match(/^\s{0,3}>[\t ]+\S/gm)?.length ?? 0;
  return listItems >= 2 || blockQuotes >= 2;
}

function makeMarkdownRequest(text: string, sourceName: string, bytes: number): AnalyzedRequest {
  const headings = collectMarkdownHeadings(text);
  const buckets = new Map<CategoryId, ContentNode[]>();
  const add = (id: CategoryId, node: ContentNode) => buckets.set(id, [...(buckets.get(id) ?? []), node]);

  if (!headings.length) {
    add("document", createNode(sourceName, "$.markdown", text, "exact", "No Markdown headings were found, so the document is kept as one section."));
  } else {
    const introduction = text.slice(0, headings[0].index).trim();
    if (introduction) {
      add("document", createNode("Document introduction", "$.markdown.introduction", introduction, "exact", "Content before the first Markdown heading."));
    }

    const activeHeadings: { level: number; category?: CategoryId; sourceLabel?: string }[] = [];
    headings.forEach((heading, index) => {
      while (activeHeadings.length && activeHeadings.at(-1)!.level >= heading.level) activeHeadings.pop();
      const directCategory = markdownCategory(heading.label);
      const inherited = [...activeHeadings].reverse().find((item) => item.category);
      const category = directCategory ?? inherited?.category ?? "document";
      const sourceLabel = directCategory ? heading.label : inherited?.sourceLabel;
      const confidence: Confidence = directCategory ? "marker" : inherited ? "derived" : "exact";
      const note = directCategory
        ? `Classified from the explicit Markdown heading “${heading.label}”.`
        : inherited
          ? `Inherited from the parent Markdown heading “${sourceLabel}”.`
          : "No supported semantic heading matched; kept as Other Markdown.";
      const start = heading.index;
      const end = headings[index + 1]?.index ?? text.length;
      add(category, createNode(
        heading.label,
        `$.markdown.sections[${index}]`,
        text.slice(start, end).trimEnd(),
        confidence,
        `${note} Markdown H${heading.level} section.`,
      ));
      activeHeadings.push({ level: heading.level, category: directCategory ?? inherited?.category, sourceLabel });
    });
  }

  const categories = [...buckets.entries()]
    .map(([id, nodes]) => ({
      id,
      label: CATEGORY_LABELS[id],
      amount: nodes.reduce((sum, node) => sum + node.amount, 0),
      unit: "estimated_tokens" as const,
      confidence: highestConfidence(nodes),
      nodes,
    }))
    .sort((first, second) => second.amount - first.amount);
  const title = headings[0]?.label.trim();
  return {
    id: `${sourceName}-document-0`,
    label: title ? `${title} · Markdown` : `${sourceName} · Markdown`,
    mode: "document",
    metadata: {
      sourceName,
      format: "markdown",
      requestBytes: bytes,
      sourceIndex: 0,
    },
    categories,
    warnings: [
      "Markdown has no official Usage; only the deterministic local token estimate is shown.",
      "Semantic categories are assigned only from supported headings; unmatched sections remain in Other Markdown.",
    ],
  };
}

function parseSummaryCollection(value: unknown, sourceName: string, offset: number): AnalyzedRequest[] {
  if (!isRecord(value) || !Array.isArray(value.requests)) return [];
  const looksLikeSummary = value.requests.some((item) => isRecord(item) && (isRecord(item.tokens) || isRecord(item.usage) || isRecord(item.anatomy)) && !Array.isArray(item.messages));
  if (!looksLikeSummary) return [];
  if (value.requests.length > MAX_REQUESTS) {
    throw new AnalysisError("TOO_MANY_REQUESTS", `Found ${value.requests.length} requests, exceeding the limit of ${MAX_REQUESTS}.`);
  }
  return value.requests.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const usage = usageFromCandidate(item) ?? undefined;
    const anatomy = isRecord(item.anatomy) ? item.anatomy : null;
    const categories = anatomy ? buildSummaryCategories(anatomy) : [];
    const mode: AnalysisMode = categories.length ? "summary" : "usage-only";
    if (!usage && !categories.length) return [];
    return [{
      id: `${sourceName}-summary-${offset + index}`,
      label: String(item.label ?? `Request ${offset + index + 1}`),
      mode,
      model: typeof item.model === "string" ? item.model : undefined,
      timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
      usage,
      metadata: {
        sourceName,
        format: "summary",
        requestBytes: asOptionalNumber(item.requestBytes),
        systemSegments: asOptionalNumber(item.systemSegments),
        toolsCount: asOptionalNumber(item.toolsCount),
        messagesCount: asOptionalNumber(item.messagesCount),
        maxTokens: asOptionalNumber(item.maxTokens ?? item.max_tokens),
        sourceIndex: offset + index,
      },
      categories,
      warnings: mode === "summary"
        ? ["The original Request Body was removed during sanitization; only character aggregates and official Usage are available."]
        : ["This dataset retains official Usage only, so no content tree can be generated."],
    } satisfies AnalyzedRequest];
  });
}

function parseHar(value: unknown, sourceName: string, offset: number): AnalyzedRequest[] {
  if (!isRecord(value) || !isRecord(value.log) || !Array.isArray(value.log.entries)) return [];
  const requests: AnalyzedRequest[] = [];
  value.log.entries.forEach((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry.request)) return;
    const url = String(entry.request.url ?? "");
    if (!/\/v1\/messages(?:\?|$)/.test(url)) return;
    const body = requestBodyFromCandidate(entry.request);
    if (!body) return;
    const response = isRecord(entry.response) ? entry.response : {};
    const content = isRecord(response.content) ? response.content : {};
    const responseText = decodeHarContent(content);
    const usage = usageFromText(responseText) ?? usageFromCandidate(response) ?? undefined;
    requests.push(makeFullRequest(body, sourceName, offset + requests.length, usage, {
      label: `${String(body.model ?? "Claude").replace(/^claude-/, "")} · HTTP ${asNumber(response.status) || "?"} · flow ${index + 1}`,
      format: "har",
      requestBytes: asOptionalNumber(entry.request.bodySize),
      httpStatus: asOptionalNumber(response.status),
      timestamp: typeof entry.startedDateTime === "string" ? entry.startedDateTime : undefined,
    }));
  });
  return requests;
}

type ObjectEntry = { object: JsonRecord; path: string };

function collectObjects(value: unknown): ObjectEntry[] {
  const output: ObjectEntry[] = [];
  const stack: { value: unknown; path: string; depth: number }[] = [{ value, path: "$", depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > MAX_NODES) throw new AnalysisError("TOO_COMPLEX", `Input contains more than ${MAX_NODES.toLocaleString()} nodes.`);
    if (current.depth > MAX_DEPTH) throw new AnalysisError("TOO_DEEP", `Input nesting exceeds ${MAX_DEPTH} levels.`);
    if (Array.isArray(current.value)) {
      for (let index = current.value.length - 1; index >= 0; index -= 1) stack.push({ value: current.value[index], path: childPath(current.path, index), depth: current.depth + 1 });
    } else if (isRecord(current.value)) {
      output.push({ object: current.value, path: current.path });
      const entries = Object.entries(current.value);
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const [key, item] = entries[index];
        stack.push({ value: item, path: childPath(current.path, key), depth: current.depth + 1 });
      }
    }
  }
  return output;
}

function correlationKeys(value: JsonRecord): Set<string> {
  const keys = new Set<string>();
  const candidates: unknown[] = [value.id, value.request_id, value.requestId, value.prompt_id, value.trace_id, value.span_id, value.timestamp];
  if (isRecord(value.attributes)) {
    const attrs = value.attributes;
    candidates.push(attrs["prompt.id"], attrs.prompt_id, attrs.request_id, attrs.trace_id, attrs.span_id);
  }
  candidates.forEach((candidate) => {
    if (typeof candidate === "string" || typeof candidate === "number") keys.add(String(candidate));
  });
  return keys;
}

function intersects(left: Set<string>, right: Set<string>): boolean {
  for (const value of left) if (right.has(value)) return true;
  return false;
}

function parseStructuredLogs(values: unknown[], sourceName: string, offset: number): AnalyzedRequest[] {
  const objects = values.flatMap(collectObjects);
  const requestCandidates: { body: JsonRecord; entry: ObjectEntry; keys: Set<string> }[] = [];
  const seenBodies = new Set<JsonRecord>();
  objects.forEach((entry) => {
    const eventName = String(entry.object.name ?? entry.object.event ?? "");
    const explicitRequestEvent = eventName === "api_request_body" || eventName === "request" || eventName === "anthropic_request";
    const body = explicitRequestEvent ? requestBodyFromCandidate(entry.object) : isAnthropicRequestBody(entry.object) ? entry.object : null;
    if (body && !seenBodies.has(body)) {
      seenBodies.add(body);
      requestCandidates.push({ body, entry, keys: correlationKeys(entry.object) });
    }
  });
  if (!requestCandidates.length) return [];
  if (requestCandidates.length > MAX_REQUESTS) {
    throw new AnalysisError("TOO_MANY_REQUESTS", `Found ${requestCandidates.length} requests, exceeding the limit of ${MAX_REQUESTS}.`);
  }

  const usageCandidates = objects.flatMap((entry) => {
    const usage = usageFromCandidate(entry.object);
    return usage ? [{ usage, keys: correlationKeys(entry.object) }] : [];
  });
  const uniqueUsage = [...new Map(usageCandidates.map((candidate) => [JSON.stringify(candidate.usage), candidate])).values()];

  return requestCandidates.map((candidate, index) => {
    let usage = uniqueUsage.find((item) => candidate.keys.size && intersects(candidate.keys, item.keys))?.usage;
    if (!usage && requestCandidates.length === 1 && uniqueUsage.length === 1) usage = uniqueUsage[0].usage;
    return makeFullRequest(candidate.body, sourceName, offset + index, usage, {
      format: "structured-log",
      label: `Request ${offset + index + 1}`,
    });
  });
}

function parseValues(text: string): { values: unknown[]; warnings: string[]; format: string } {
  try {
    return { values: [JSON.parse(text)], warnings: [], format: "json" };
  } catch (error) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const values: unknown[] = [];
    let invalid = 0;
    lines.forEach((line) => {
      try {
        values.push(JSON.parse(line));
      } catch {
        invalid += 1;
      }
    });
    if (values.length) {
      return {
        values,
        warnings: invalid ? [`${invalid} JSONL line${invalid === 1 ? "" : "s"} could not be parsed and ${invalid === 1 ? "was" : "were"} skipped.`] : [],
        format: "jsonl",
      };
    }
    const message = error instanceof Error ? error.message : "Unknown JSON error";
    throw new AnalysisError("INVALID_JSON", `Unable to parse JSON or JSONL: ${message}`);
  }
}

export function analyzeInput(text: string, sourceName = "pasted-request.txt", options: AnalyzeInputOptions = {}): AnalysisBundle {
  const trimmed = text.trim();
  if (!trimmed) throw new AnalysisError("EMPTY_INPUT", "Paste Request data or Markdown, or choose a local file first.");
  const bytes = textEncoder.encode(text).length;
  if (bytes > MAX_INPUT_BYTES) throw new AnalysisError("INPUT_TOO_LARGE", `Input size ${(bytes / 1024 / 1024).toFixed(1)} MiB exceeds the 5 MiB limit.`);
  const format = options.format ?? "auto";
  const markdownBundle = (): AnalysisBundle => ({
    source: { name: sourceName, bytes, format: "markdown" },
    requests: [makeMarkdownRequest(text, sourceName, bytes)],
    warnings: [],
  });

  if (format === "markdown") return markdownBundle();

  let parsed: { values: unknown[]; warnings: string[]; format: string };
  try {
    parsed = parseValues(trimmed);
  } catch (error) {
    if (format === "auto" && (MARKDOWN_FILE.test(sourceName) || isLikelyMarkdown(trimmed))) return markdownBundle();
    const fallbackUsage = usageFromText(trimmed);
    if (!fallbackUsage) throw error;
    return {
      source: { name: sourceName, bytes, format: "text-usage" },
      warnings: ["The text is not structured JSON; only Usage fields were identified."],
      requests: [{
        id: `${sourceName}-usage-0`,
        label: "Usage fields",
        mode: "usage-only",
        usage: fallbackUsage,
        metadata: { sourceName, format: "text-usage", sourceIndex: 0 },
        categories: [],
        warnings: ["This text contains Usage only, so no content tree can be generated."],
      }],
    };
  }

  parsed.values.forEach((value) => collectObjects(value));
  const requests: AnalyzedRequest[] = [];
  const unhandled: unknown[] = [];

  parsed.values.forEach((value) => {
    const summary = parseSummaryCollection(value, sourceName, requests.length);
    if (summary.length) {
      requests.push(...summary);
      return;
    }
    const har = parseHar(value, sourceName, requests.length);
    if (har.length) {
      requests.push(...har);
      return;
    }
    if (isRecord(value) && requestBodyFromCandidate(value.request)) {
      const body = requestBodyFromCandidate(value.request)!;
      const usage = usageFromCandidate(value.response) ?? usageFromCandidate(value) ?? undefined;
      requests.push(makeFullRequest(body, sourceName, requests.length, usage, { format: "request-response-envelope" }));
      return;
    }
    if (isAnthropicRequestBody(value)) {
      requests.push(makeFullRequest(value, sourceName, requests.length, usageFromCandidate(value) ?? undefined));
      return;
    }
    unhandled.push(value);
  });

  if (unhandled.length) requests.push(...parseStructuredLogs(unhandled, sourceName, requests.length));
  if (!requests.length) {
    const fallbackUsage = usageFromText(trimmed);
    if (fallbackUsage) {
      requests.push({
        id: `${sourceName}-usage-0`,
        label: "Usage fields",
        mode: "usage-only",
        usage: fallbackUsage,
        metadata: { sourceName, format: "text-usage", sourceIndex: 0 },
        categories: [],
        warnings: ["No Request Body was identified; only Usage can be shown."],
      });
    }
  }
  if (!requests.length) throw new AnalysisError("NO_REQUEST", "The content is readable, but no Anthropic Request, Summary, or Usage was identified.");
  if (requests.length > MAX_REQUESTS) throw new AnalysisError("TOO_MANY_REQUESTS", `Found ${requests.length} requests, exceeding the limit of ${MAX_REQUESTS}.`);

  return {
    source: { name: sourceName, bytes, format: parsed.format },
    requests,
    warnings: parsed.warnings,
  };
}
