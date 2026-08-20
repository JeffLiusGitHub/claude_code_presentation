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

test("server-renders the four-step learning homepage and preserves the workshop", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /四步走完这条学习路线/);
  assert.match(html, /Presentation 大概讲什么/);
  assert.match(html, /打开 Proxyman How-to/);
  assert.match(html, /跳到实际 Workshop/);
  assert.match(html, /href="\/presentation"/);
  assert.match(html, /href="\/proxyman-guide"/);
  assert.match(html, /href="\/workshop#workshop"/);
  assert.match(html, /href="\/field-validation"/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);

  const workshopResponse = await render("/workshop");
  assert.equal(workshopResponse.status, 200);
  const workshopHtml = await workshopResponse.text();
  assert.match(workshopHtml, /一句 Prompt/);
  assert.match(workshopHtml, /AGENT CONTEXT WORKSHOP/);
  assert.match(workshopHtml, /id="workshop"/);
  assert.match(workshopHtml, /href="\/presentation"/);
});

test("homepage reuses the complete presentation palette", async () => {
  const styles = await readFile(
    new URL("../app/home.module.css", import.meta.url),
    "utf8",
  );

  assert.match(styles, /--night:\s*#292622/);
  assert.match(styles, /--paper:\s*#f7e7d2/);
  assert.match(styles, /--accent-cyan:\s*#a9cee2/);
  assert.match(styles, /--accent-indigo:\s*#f1b58e/);
  assert.match(styles, /--sky:\s*#3a6998/);
  assert.match(styles, /--clay:\s*#d37c4f/);
  assert.match(styles, /--sun:\s*#e2b84f/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("server-renders the English Proxyman field validation lab", async () => {
  const response = await render("/field-validation");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Proxyman Field Validation Task Sheet/);
  assert.match(html, /The next section is hands-on/);
  assert.match(html, /Use Proxyman to validate Claude Code network traffic/);
  assert.match(html, /These reference tasks do not depend on a specific project/);
  assert.match(html, /Validation tasks/);
  assert.match(html, /Look for/);
  assert.match(html, /Pass when/);
  assert.match(html, /TRAFFIC-DEMO-01/);
  assert.match(html, /CACHE-DEMO-A/);
  assert.match(html, /CACHE-DEMO-B/);
  assert.match(html, /SUBAGENT-DEMO-01/);
  assert.match(html, /cache_creation_input_tokens/);
  assert.match(html, /cache_read_input_tokens/);
  assert.match(html, /stop_reason: tool_use/);
  assert.match(html, /Authorization/);
  assert.match(html, /FIELD VALIDATION · 20 MIN/);
  assert.match(html, /href="\/presentation"/);
  assert.match(html, /href="\/proxyman-guide"/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("field validation lab reuses the presentation palette", async () => {
  const styles = await readFile(
    new URL("../app/field-validation/validation.module.css", import.meta.url),
    "utf8",
  );

  assert.match(styles, /--night:\s*#292622/);
  assert.match(styles, /--paper:\s*#f7e7d2/);
  assert.match(styles, /--accent-cyan:\s*#a9cee2/);
  assert.match(styles, /--accent-indigo:\s*#f1b58e/);
  assert.match(styles, /--sky:\s*#3a6998/);
  assert.match(styles, /--clay:\s*#d37c4f/);
  assert.match(styles, /--sun:\s*#e2b84f/);
  assert.match(styles, /prefers-reduced-motion/);
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
  assert.match(html, /See the agent loop.*on the wire/s);
  assert.match(html, /Install &amp; Trust/);
  assert.match(html, /Windows trusts the Proxyman root certificate/);
  assert.match(html, /github\.com\/ProxymanApp\/proxyman-windows-linux\/releases\/tag\/3\.17\.0/);
  assert.match(html, /Give Claude an observable job/);
  assert.match(html, /Five signals mean the capture worked/);
  assert.doesNotMatch(html, /og\.png/);
});

test("keeps the deck interactive, accessible, and the evidence sanitized", async () => {
  const [page, styles, layout, presentationPage, homePage, workshopPage, packageJson, sample, legacySample] = await Promise.all([
    readFile(new URL("../app/interactive-presentation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/presentation.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/presentation/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/workshop/page.tsx", import.meta.url), "utf8"),
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
  assert.doesNotMatch(page, /AUTO PLAY/);
  assert.match(page, /requestFullscreen/);
  assert.match(page, /document\.exitFullscreen/);
  assert.match(page, /fullscreenchange/);
  assert.match(page, /Enter fullscreen/);
  assert.match(page, /Exit fullscreen/);
  assert.match(page, /退出全屏（Esc）/);
  assert.match(page, /aria-label="Back to home"/);
  assert.match(page, /router\.push\("\/"\)/);
  assert.match(page, /FROM PROMPT TO TOOLS, CONTEXT, AND FINAL ANSWER/);
  assert.match(workshopPage, /document\.documentElement\.requestFullscreen/);
  assert.match(workshopPage, /router\.push\("\/presentation"\)/);
  assert.match(homePage, /href="\/presentation"/);
  assert.match(homePage, /href="\/proxyman-guide"/);
  assert.match(homePage, /href="\/workshop#workshop"/);
  assert.doesNotMatch(page, /setTimeout\(\(\) => goToSlide\(1\)/);
  assert.match(page, /\[sanitized\]/i);
  assert.match(styles, /scroll-snap-type:\s*y mandatory/);
  assert.match(styles, /min-height:\s*100svh/);
  assert.match(styles, /Presentation-distance readability/);
  assert.match(styles, /\.shell:fullscreen/);
  assert.match(styles, /\.fullscreenGlyph/);
  assert.match(styles, /\.fullscreenActive/);
  assert.match(styles, /\.homeButton/);
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
  assert.match(layout, /Claude Context Learning Lab/);
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
