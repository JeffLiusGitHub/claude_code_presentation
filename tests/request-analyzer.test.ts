import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  AnalysisError,
  MAX_INPUT_BYTES,
  MAX_REQUESTS,
  analyzeInput,
  estimateTokens,
  isAnthropicRequestBody,
  type AnalyzedRequest,
  type ContentNode,
} from "../app/request-analyzer/core.ts";

function category(request: AnalyzedRequest, id: string) {
  return request.categories.find((item) => item.id === id);
}

function allPreviews(nodes: ContentNode[]): string {
  return nodes.map((node) => `${node.preview ?? ""}\n${allPreviews(node.children)}`).join("\n");
}

function minimalRequest(overrides: Record<string, unknown> = {}) {
  return {
    model: "claude-test",
    system: "System",
    tools: [],
    messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
    ...overrides,
  };
}

test("uses the deterministic CJK and UTF-8 estimator", () => {
  assert.equal(estimateTokens("中文"), 2);
  assert.equal(estimateTokens("abcd"), 1);
  assert.equal(estimateTokens("🙂"), 1);
  assert.equal(estimateTokens("中文abcd🙂"), 4);
});

test("analyzes Markdown files as sectioned local token estimates", () => {
  const markdown = `Front matter\n\n# Token guide\n中文正文 and text.\n\n## Details\nMore content.`;
  const bundle = analyzeInput(markdown, "token-guide.md");
  const request = bundle.requests[0];

  assert.equal(bundle.source.format, "markdown");
  assert.equal(request.mode, "document");
  assert.equal(request.label, "Token guide · Markdown");
  assert.equal(request.usage, undefined);
  assert.equal(category(request, "document")?.label, "Other Markdown");
  assert.equal(category(request, "document")?.nodes.length, 3);
  assert.deepEqual(category(request, "document")?.nodes.map((node) => node.path), [
    "$.markdown.introduction",
    "$.markdown.sections[0]",
    "$.markdown.sections[1]",
  ]);
  assert.ok((category(request, "document")?.amount ?? 0) > 0);
  assert.match(request.warnings[0], /no official Usage/i);
});

test("auto-detects pasted Markdown and classifies supported semantic headings", () => {
  const markdown = `# Request Anatomy
Overview.

## System Prompt
Core instructions.

### Guardrails
Inherited system instructions.

## Tool Definitions
Tool schemas.

## Memory
Explicit memory section.

## Current User
The latest user request.

## Notes about MEMORY.md
This mention is not an explicit Memory heading.`;
  const request = analyzeInput(markdown, "pasted-content.txt", { format: "auto" }).requests[0];

  assert.equal(request.mode, "document");
  assert.equal(request.metadata.format, "markdown");
  assert.equal(category(request, "system")?.nodes.length, 2);
  assert.equal(category(request, "toolDefinitions")?.nodes.length, 1);
  assert.equal(category(request, "memory")?.nodes.length, 1);
  assert.equal(category(request, "currentUser")?.nodes.length, 1);
  assert.deepEqual(category(request, "document")?.nodes.map((node) => node.label), ["Request Anatomy", "Notes about MEMORY.md"]);
  assert.match(category(request, "system")?.nodes[1].note ?? "", /Inherited from the parent Markdown heading/);
});

test("handles .markdown Setext headings and ignores headings inside fenced code", () => {
  const markdown = `System Prompt
=============
Follow the rules.

\`\`\`markdown
# Tool Calls
This is an example, not request anatomy.
\`\`\`

Available Tools
---------------
Read and Search.`;
  const request = analyzeInput(markdown, "anatomy.markdown").requests[0];

  assert.ok(category(request, "system"));
  assert.ok(category(request, "toolDefinitions"));
  assert.equal(category(request, "toolCalls"), undefined);
});

test("supports exact Chinese semantic headings while keeping front matter unattributed", () => {
  const markdown = `---
title: Local analysis
---
# 系统提示词
遵循明确规则。

## 工具调用
调用 Read。`;
  const request = analyzeInput(markdown, "localized.txt").requests[0];

  assert.ok(category(request, "system"));
  assert.ok(category(request, "toolCalls"));
  assert.deepEqual(category(request, "document")?.nodes.map((node) => node.label), ["Document introduction"]);
});

test("supports explicit Markdown mode for headingless text and strict Request mode", () => {
  const headingless = "A plain Markdown note with **emphasis**, but no headings.";
  const markdownRequest = analyzeInput(headingless, "pasted-content.txt", { format: "markdown" }).requests[0];
  assert.equal(markdownRequest.mode, "document");
  assert.equal(category(markdownRequest, "document")?.nodes.length, 1);

  assert.throws(
    () => analyzeInput("# System Prompt\nRules", "pasted-content.txt", { format: "request" }),
    (error) => error instanceof AnalysisError && error.code === "INVALID_JSON",
  );
});

test("routes JSON, JSONL, HAR, LOG, TXT, MD, and MARKDOWN inputs without cross-format false positives", () => {
  const requestWithMarkdownText = minimalRequest({ system: "# System Prompt\nThis remains JSON request content." });
  assert.equal(analyzeInput(JSON.stringify(requestWithMarkdownText), "request.json").requests[0].mode, "full");
  assert.equal(analyzeInput(JSON.stringify(requestWithMarkdownText), "traffic.md").requests[0].mode, "full");
  assert.equal(analyzeInput(JSON.stringify(requestWithMarkdownText), "traffic.md").source.format, "json");

  const jsonl = `${JSON.stringify(minimalRequest())}\n${JSON.stringify(minimalRequest({ model: "claude-second" }))}`;
  assert.equal(analyzeInput(jsonl, "requests.jsonl").requests.length, 2);

  const log = "input_tokens: 12\ncache_read_input_tokens: 34\noutput_tokens: 5";
  assert.equal(analyzeInput(log, "usage.log").requests[0].mode, "usage-only");

  const listMarkdown = "- first item\n- second item";
  assert.equal(analyzeInput(listMarkdown, "notes.txt").requests[0].mode, "document");
  assert.equal(analyzeInput("No headings here", "notes.md").requests[0].mode, "document");
  assert.equal(analyzeInput("No headings here", "notes.markdown").requests[0].mode, "document");
});

test("only accepts strict Anthropic request bodies", () => {
  assert.equal(isAnthropicRequestBody(minimalRequest()), true);
  assert.equal(isAnthropicRequestBody({ anatomy: { system: 100 }, messages: 12 }), false);
  assert.equal(isAnthropicRequestBody({ model: "claude-test", messages: [], tools: 42 }), false);
  assert.equal(isAnthropicRequestBody({ model: "claude-test", messages: "not-an-array" }), false);
});

test("classifies full requests, current user, tool calls, and tool results", () => {
  const body = minimalRequest({
    system: ["Short system", "Longer system instructions"],
    tools: [{ name: "lookup", description: "Look up a value", input_schema: { type: "object" } }],
    messages: [
      { role: "user", content: [{ type: "text", text: "Earlier question" }] },
      { role: "assistant", content: [{ type: "tool_use", id: "tool_1", name: "lookup", input: { q: "x" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "tool_1", content: "result" }] },
      { role: "assistant", content: [{ type: "text", text: "Earlier answer" }] },
      { role: "user", content: [{ type: "text", text: "Current question" }] },
    ],
  });
  const request = analyzeInput(JSON.stringify(body), "full.json").requests[0];

  assert.equal(request.mode, "full");
  assert.equal(request.metadata.toolsCount, 1);
  assert.equal(request.metadata.messagesCount, 5);
  for (const id of ["system", "toolDefinitions", "toolCalls", "toolResults", "currentUser", "userHistory", "assistantHistory"]) {
    assert.ok(category(request, id), `missing ${id}`);
  }
  assert.deepEqual(
    request.categories.map((item) => item.amount),
    [...request.categories.map((item) => item.amount)].sort((a, b) => b - a),
  );
});

test("does not infer Memory from file-name mentions without a deterministic boundary", () => {
  const body = minimalRequest({
    system: [{ type: "text", text: "Skills may mention CLAUDE.md and MEMORY.md, but this entire block is System." }],
  });
  const request = analyzeInput(JSON.stringify(body), "memory-marker.json").requests[0];

  assert.equal(category(request, "memory"), undefined);
  assert.match(category(request, "system")?.nodes[0].note ?? "", /remains in System/);
});

test("separates explicit Memory paths, sources, and bounded tags", () => {
  const body = minimalRequest({
    memory: "top-level memory",
    system: [
      { type: "text", text: "Before <memory>bounded memory</memory> after" },
      { type: "text", text: "memory file", source: { path: "/project/MEMORY.md" } },
    ],
  });
  const request = analyzeInput(JSON.stringify(body), "explicit-memory.json").requests[0];

  assert.equal(category(request, "memory")?.nodes.length, 3);
  assert.ok(category(request, "system"));
});

test("masks secrets in both leaf and parent previews", () => {
  const secret = "Bearer sk-ant-do-not-show";
  const body = minimalRequest({
    tools: [{
      name: "http",
      description: "demo",
      input_schema: {
        type: "object",
        example: {
          authorization: secret,
          headers: [{ name: "X-API-Key", value: "another-secret" }],
          cookie: "session=secret",
        },
      },
    }],
  });
  const request = analyzeInput(JSON.stringify(body), "secrets.json").requests[0];
  const previews = allPreviews(category(request, "toolDefinitions")?.nodes ?? []);

  assert.doesNotMatch(previews, /sk-ant-do-not-show|another-secret|session=secret/);
  assert.match(previews, /\[REDACTED\]/);
});

test("parses HAR request bodies and SSE usage", () => {
  const har = {
    log: {
      entries: [{
        startedDateTime: "2026-08-20T00:00:00Z",
        request: {
          url: "https://api.anthropic.com/v1/messages",
          postData: { text: JSON.stringify(minimalRequest()) },
        },
        response: {
          status: 200,
          content: {
            text: 'data: {"type":"message_start","message":{"usage":{"input_tokens":10,"cache_creation_input_tokens":20,"cache_read_input_tokens":30,"output_tokens":4}}}',
          },
        },
      }],
    },
  };
  const request = analyzeInput(JSON.stringify(har), "capture.har").requests[0];

  assert.equal(request.metadata.format, "har");
  assert.equal(request.metadata.httpStatus, 200);
  assert.deepEqual(request.usage, { input: 10, cacheCreation: 20, cacheRead: 30, output: 4 });
});

test("keeps valid JSONL records and warns about damaged lines", () => {
  const text = `${JSON.stringify(minimalRequest())}\n{broken line\n`;
  const bundle = analyzeInput(text, "partial.jsonl");

  assert.equal(bundle.requests.length, 1);
  assert.equal(bundle.source.format, "jsonl");
  assert.match(bundle.warnings[0], /1 JSONL line could not be parsed/);
});

test("reports distinct empty, invalid, missing, depth, size, and request-count errors", () => {
  const expectCode = (run: () => unknown, code: string) => assert.throws(run, (error) => error instanceof AnalysisError && error.code === code);
  expectCode(() => analyzeInput(""), "EMPTY_INPUT");
  expectCode(() => analyzeInput("not json"), "INVALID_JSON");
  expectCode(() => analyzeInput(JSON.stringify({ hello: "world" })), "NO_REQUEST");
  expectCode(() => analyzeInput("x".repeat(MAX_INPUT_BYTES + 1)), "INPUT_TOO_LARGE");

  let nested: Record<string, unknown> = {};
  for (let index = 0; index < 66; index += 1) nested = { child: nested };
  expectCode(() => analyzeInput(JSON.stringify(nested)), "TOO_DEEP");

  const requests = Array.from({ length: MAX_REQUESTS + 1 }, (_, index) => ({
    label: `Request ${index + 1}`,
    tokens: { input: 1, output: 1 },
  }));
  expectCode(() => analyzeInput(JSON.stringify({ requests })), "TOO_MANY_REQUESTS");
});

const localRaw = new URL("../../test.json.txt", import.meta.url);
test("matches the local full-request regression sample", { skip: !existsSync(fileURLToPath(localRaw)) }, async () => {
  const request = analyzeInput(await readFile(localRaw, "utf8"), "test.json.txt").requests[0];
  const amounts = Object.fromEntries(request.categories.map((item) => [item.id, item.amount]));

  assert.equal(request.mode, "full");
  assert.equal(request.metadata.systemSegments, 4);
  assert.equal(request.metadata.toolsCount, 42);
  assert.equal(request.metadata.messagesCount, 5);
  assert.deepEqual(amounts, {
    toolDefinitions: 29113,
    system: 7669,
    userHistory: 4474,
    assistantHistory: 872,
    toolResults: 137,
    toolCalls: 51,
    currentUser: 32,
  });
  assert.equal(category(request, "memory"), undefined);
});

const summaryFixtures = [
  ["../public/data/proxyman-sanitized.json", 18, "summary"],
  ["../public/data/workshop-sanitized.json", 3, "summary"],
  ["../public/data/proxyman-live-sanitized.json", 4, "usage-only"],
] as const;

for (const [fixture, count, mode] of summaryFixtures) {
  test(`uses ${mode} mode for ${fixture}`, async () => {
    const url = new URL(fixture, import.meta.url);
    const bundle = analyzeInput(await readFile(url, "utf8"), url.pathname.split("/").at(-1) ?? "fixture.json");
    assert.equal(bundle.requests.length, count);
    assert.ok(bundle.requests.every((request) => request.mode === mode));
  });
}
