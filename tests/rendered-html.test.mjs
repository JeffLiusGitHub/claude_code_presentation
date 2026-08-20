import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

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

test("server-renders the legacy Agent Context Lab with a presentation link", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /一句 Prompt/);
  assert.match(html, /AGENT CONTEXT WORKSHOP/);
  assert.match(html, /href="\/presentation"/);
  assert.match(html, /互动演示/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("server-renders the full-screen Claude Code request anatomy", async () => {
  const response = await render("/presentation");
  assert.equal(response.status, 200);

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
  const [page, styles, layout, presentationPage, packageJson, sample, legacySample] = await Promise.all([
    readFile(new URL("../app/interactive-presentation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/presentation.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/presentation/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/proxyman-live-sanitized.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/proxyman-sanitized.json", import.meta.url), "utf8"),
  ]);

  assert.equal((page.match(/data-index=/g) ?? []).length, 11);
  assert.match(page, /ArrowDown/);
  assert.match(page, /PageDown/);
  assert.match(page, /scrollIntoView/);
  assert.match(page, /aria-label="Slides"/);
  assert.match(page, /AUTO_TIMINGS/);
  assert.match(page, /window\.setInterval/);
  assert.match(page, /AUTO PLAY/);
  assert.match(page, /requestFullscreen/);
  assert.match(page, /document\.exitFullscreen/);
  assert.match(page, /fullscreenchange/);
  assert.match(page, /Enter fullscreen/);
  assert.match(page, /Exit fullscreen/);
  assert.match(page, /退出全屏（Esc）/);
  assert.doesNotMatch(page, /setTimeout\(\(\) => goToSlide\(1\)/);
  assert.match(page, /\[sanitized\]/i);
  assert.match(styles, /scroll-snap-type:\s*y mandatory/);
  assert.match(styles, /min-height:\s*100svh/);
  assert.match(styles, /Presentation-distance readability/);
  assert.match(styles, /\.shell:fullscreen/);
  assert.match(styles, /\.fullscreenGlyph/);
  assert.match(styles, /\.fullscreenActive/);
  assert.doesNotMatch(styles, /@media \(max-width: 900px\)[\s\S]*?\.rail\s*\{\s*display:\s*none/);
  assert.match(styles, /--night:\s*#292622/);
  assert.match(styles, /--paper:\s*#f7e7d2/);
  assert.match(styles, /--accent-cyan:\s*#a9cee2/);
  assert.match(styles, /--accent-indigo:\s*#f1b58e/);
  assert.match(styles, /--sky:\s*#3a6998/);
  assert.match(styles, /--clay:\s*#d37c4f/);
  assert.match(styles, /--sun:\s*#e2b84f/);
  assert.match(styles, /\.rail\s*\{[^}]*left:\s*0/);
  assert.match(styles, /\.rail\s*\{[^}]*opacity:\s*\.46[^}]*filter:\s*saturate\(\.28\)/);
  assert.match(styles, /\.rail:hover\s*\{[^}]*opacity:\s*1[^}]*filter:\s*saturate\(1\)/);
  assert.match(styles, /\.rail::before\s*\{[^}]*transform:\s*translateX\(-52px\)/);
  assert.match(styles, /\.rail:hover::before\s*\{[^}]*transform:\s*translateX\(18px\)/);
  assert.match(styles, /\.rail:hover button\s*\{[^}]*transform:\s*translateX\(18px\)/);
  assert.match(styles, /\.rail:hover b\s*\{[^}]*max-width:\s*130px/);
  assert.match(styles, /\.rail:hover button:hover b\s*\{[^}]*color:\s*var\(--sun\)/);
  assert.doesNotMatch(styles, /\.rail \.railActive b/);
  assert.match(styles, /SF Pro Display/);
  assert.match(styles, /SFMono-Regular/);
  assert.doesNotMatch(styles, /#ff7356|#c9f45b|#8fd3c8|#aeb7f2|Courier New/i);
  assert.ok(contrastRatio("292622", "a9cee2") >= 7);
  assert.ok(contrastRatio("292622", "f1b58e") >= 7);
  assert.ok(contrastRatio("f7e7d2", "3a6998") >= 4.5);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /Agent Context Lab/);
  assert.match(presentationPage, /What Happens After You Press Send in Claude Code/);
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
