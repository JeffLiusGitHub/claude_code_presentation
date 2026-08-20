import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the full-screen Claude Code request anatomy", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /What happens after/);
  assert.match(html, /The Anatomy of a Claude Code Request/);
  assert.match(html, /The model decides/);
  assert.match(html, /One request/);
  assert.match(html, /Prompt Cache/i);
  assert.match(html, /Persistent Memory/i);
  assert.match(html, /Subagents/i);
  assert.match(html, /Inspect a real request/i);
  assert.match(html, /cache_creation_input_tokens/);
  assert.match(html, /CLAUDE_CANARY_123/);
  assert.match(html, /https:\/\/agent-context-proxyman-guide\.jeffliujeffliu\.chatgpt\.site\/og\.png/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("server-renders the standalone Proxyman setup guide", async () => {
  const response = await render("/proxyman-guide");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /把 HTTPS.*变成可读证据/s);
  assert.match(html, /Install &amp; Trust/);
  assert.match(html, /Trusted Root Certification Authorities/);
  assert.match(html, /https:\/\/proxyman\.com\/download/);
  assert.match(html, /第一次 HTTPS 抓包/);
  assert.match(html, /结束时恢复网络/);
  assert.doesNotMatch(html, /og\.png/);
});

test("keeps the deck interactive, accessible, and the evidence sanitized", async () => {
  const [page, styles, layout, packageJson, sample, legacySample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/presentation.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/proxyman-live-sanitized.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/proxyman-sanitized.json", import.meta.url), "utf8"),
  ]);

  assert.equal((page.match(/data-index=/g) ?? []).length, 11);
  assert.match(page, /ArrowDown/);
  assert.match(page, /PageDown/);
  assert.match(page, /scrollIntoView/);
  assert.match(page, /aria-label="Slides"/);
  assert.match(page, /\[sanitized\]/i);
  assert.match(styles, /scroll-snap-type:\s*y mandatory/);
  assert.match(styles, /min-height:\s*100svh/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /lang="en"/);
  assert.match(layout, /What Happens After You Press Send in Claude Code/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(sample, /"cacheCreation": 43578/);
  assert.match(sample, /"cacheRead": 44125/);
  assert.doesNotMatch(sample, /Bearer\s+sk-|sk-ant-|"authorization"\s*:/i);
  assert.match(legacySample, /"retryStatuses": \[\s*529,\s*529,\s*200/);
  assert.match(legacySample, /"hasAgentHeader": true/);

  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});
