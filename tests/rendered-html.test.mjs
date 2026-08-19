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

test("server-renders the Agent Context Lab", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Agent Context Lab/);
  assert.match(html, /CONTEXT \/ LAB/);
  assert.match(html, /Token Analyzer/i);
  assert.match(html, /proxyman-sanitized\.json/);
  assert.match(html, /681 · History \/ Cache 首轮/);
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
});

test("keeps the analyzer data local and the starter preview removed", async () => {
  const [page, layout, packageJson, sample, legacySample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/proxyman-live-sanitized.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/proxyman-sanitized.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /function parseTraffic/);
  assert.match(page, /input_tokens\|output_tokens\|cache_creation_input_tokens/);
  assert.match(page, /文件只在你的浏览器内处理，不上传/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /Agent Context Lab/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(sample, /"cacheCreation": 43578/);
  assert.match(sample, /"cacheRead": 44125/);
  assert.doesNotMatch(sample, /Bearer\s+sk-|sk-ant-|"authorization"\s*:/i);
  assert.match(legacySample, /"retryStatuses": \[\s*529,\s*529,\s*200/);
  assert.match(legacySample, /"hasAgentHeader": true/);

  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});
