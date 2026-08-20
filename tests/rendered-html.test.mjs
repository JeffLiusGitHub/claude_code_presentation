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

test("server-renders the fully English learning homepage and routes to Workshop", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Follow the complete path in four steps/);
  assert.match(html, /What does the Presentation cover/);
  assert.match(html, /Open the Proxyman How-to/);
  assert.match(html, /Enter the Workshop/);
  assert.match(html, /See what fills the request/);
  assert.match(html, /Open the Request Analyzer/);
  assert.match(html, /use the Analyzer to see how prompts, tool definitions, messages, and cache usage shape the request/);
  assert.doesNotMatch(html, /ABOUT THE TOOL|Review the tool introduction/);
  assert.ok(html.indexOf("INTERACTIVE PRESENTATION") < html.indexOf("PROXYMAN HOW-TO"));
  assert.ok(html.indexOf("PROXYMAN HOW-TO") < html.indexOf("HANDS-ON WORKSHOP"));
  assert.ok(html.indexOf("HANDS-ON WORKSHOP") < html.indexOf("REQUEST ANALYZER"));
  assert.match(html, /href="\/presentation"/);
  assert.match(html, /href="\/proxyman-guide"/);
  assert.match(html, /href="\/request-analyzer"/);
  assert.match(html, /href="\/field-validation"/);
  assert.doesNotMatch(html, /href="\/workshop(?:#workshop)?"/);
  assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
  assert.doesNotMatch(html, /(?:C:|\.vinext[\\/])[^"<]*fonts/i);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
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
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*?\.primaryNav \.navLinks\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.primaryNav \.navLinks a:not\(\.navCta\)\s*\{\s*display:\s*flex/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("server-renders the Proxyman hands-on Workshop", async () => {
  const response = await render("/field-validation");
  assert.equal(response.status, 200);

  const html = await response.text();
  const primaryNavIndex = html.indexOf('aria-label="Primary navigation"');
  const workshopNavIndex = html.indexOf('aria-label="Workshop navigation"');
  assert.ok(primaryNavIndex >= 0);
  assert.ok(workshopNavIndex > primaryNavIndex);
  const renderedNavs = [...html.matchAll(/<nav class="([^"]+)" aria-label="([^"]+)"/g)];
  const primaryNav = renderedNavs.find((match) => match[2] === "Primary navigation");
  const workshopNav = renderedNavs.find((match) => match[2] === "Workshop navigation");
  assert.ok(primaryNav);
  assert.ok(workshopNav);
  assert.ok(primaryNav[1].split(" ").some((className) => workshopNav[1].split(" ").includes(className)));
  assert.match(html, /Workshop/);
  assert.match(html, /WORKSHOP/);
  assert.match(html, /HANDS-ON WORKSHOP/);
  assert.match(html, /Claude Traffic Workshop/);
  assert.match(html, /The next section is hands-on/);
  assert.match(html, /Use Proxyman to validate Claude Code network traffic/);
  assert.match(html, /These reference tasks do not depend on a specific project/);
  assert.match(html, /Workshop tasks/);
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
  assert.match(html, /HANDS-ON WORKSHOP · 20 MIN/);
  assert.doesNotMatch(html, /Proxyman Field Validation|FIELD VALIDATION/);
  assert.match(html, /href="\/presentation"/);
  assert.match(html, /href="\/proxyman-guide"/);
  assert.match(html, /How to set up Proxyman/);
  assert.doesNotMatch(html, /Capture the result|QUICK RECORD|Evidence \/ flow IDs/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("Workshop and shared navigation reuse the presentation palette", async () => {
  const [styles, sharedNavStyles] = await Promise.all([
    readFile(new URL("../app/field-validation/validation.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/home.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--night:\s*#292622/);
  assert.match(styles, /--paper:\s*#f7e7d2/);
  assert.match(styles, /--accent-cyan:\s*#a9cee2/);
  assert.match(styles, /--accent-indigo:\s*#f1b58e/);
  assert.match(styles, /--sky:\s*#3a6998/);
  assert.match(styles, /--clay:\s*#d37c4f/);
  assert.match(styles, /--sun:\s*#e2b84f/);
  assert.match(sharedNavStyles, /\.secondaryNav\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s);
  assert.match(styles, /overflow:\s*visible/);
  assert.match(styles, /scroll-margin-top:\s*68px/);
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
  assert.doesNotMatch(html, /og\.png/);
  assert.doesNotMatch(html, /aria-label="Primary navigation"/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("each major route emits its own title and social metadata", async () => {
  const routes = [
    ["/presentation", "What Happens After You Press Send in Claude Code?"],
    ["/field-validation", "Claude Traffic Workshop"],
    ["/workshop", "Claude Context Lab · Reference &amp; Evidence"],
    ["/proxyman-guide", "Proxyman Setup · Capture the Claude Agent Loop"],
    ["/request-analyzer", "Request Token Explorer · Claude Context Learning Lab"],
  ];

  for (const [pathname, title] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`<title>${title}</title>`), `${pathname} should emit its route title`);
    assert.ok(html.includes(`property="og:title" content="${title}"`), `${pathname} should emit its Open Graph title`);
    assert.ok(html.includes(`name="twitter:title" content="${title}"`), `${pathname} should emit its Twitter title`);
    assert.doesNotMatch(html, /og\.png/, `${pathname} should not inherit the homepage social image`);
  }
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
  assert.match(html, /href="\/field-validation"[^>]*>Enter the Workshop/);
  assert.doesNotMatch(html, /Open the presentation/);
  assert.doesNotMatch(html, /og\.png/);
});

test("Proxyman evidence is lazy-loaded and the CA note collapses without mobile overflow", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/proxyman-guide/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /loading="lazy"/);
  assert.match(page, /sizes="\(max-width: 760px\) 100vw/);
  assert.doesNotMatch(page, /loading="eager"/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.pmg-ca-note\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /\.pmg-ca-note p\s*\{[^}]*overflow-wrap:\s*anywhere/);
});

test("server-renders the local-only Request Token Explorer", async () => {
  const response = await render("/request-analyzer");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Request Token Explorer/);
  assert.match(html, /LOCAL ONLY/);
  assert.match(html, /Paste \/ upload data/);
  assert.match(html, /System Prompt/);
  assert.match(html, /Tool Definitions/);
  assert.match(html, /Official new input/);
  assert.match(html, /Narrow graph panel/);
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /aria-label="Request Analyzer navigation"/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("Request Token Explorer supports Markdown files and a responsive compact Token rail", async () => {
  const [component, styles, core, demo, page] = await Promise.all([
    readFile(new URL("../app/request-analyzer/request-analyzer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/request-analyzer/request-analyzer.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/request-analyzer/core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/request-analyzer/demo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/request-analyzer/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(component, /accept="\.json,\.jsonl,\.har,\.log,\.txt,\.md,\.markdown"/);
  assert.match(component, /<option value="auto">Auto detect<\/option>/);
  assert.match(component, /<option value="request">Request data<\/option>/);
  assert.match(component, /<option value="markdown">Markdown<\/option>/);
  assert.match(component, /aria-label=\{chartCompact \? "Expand graph panel" : "Narrow graph panel"\}/);
  assert.match(component, /chartCompact \? "Expand" : "Narrow"/);
  assert.match(component, /data-compact=\{chartCompact\}/);
  assert.match(component, /Direct field/);
  assert.match(component, /intentionally shortens content while retaining reference usage totals/);
  assert.match(component, /content block\{category\.nodes\.length === 1/);
  assert.doesNotMatch([component, core, demo, page].join("\n"), /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u);
  assert.match(styles, /\.workspaceCompact\s*\{[^}]*76px/s);
  assert.match(styles, /--night:\s*#292622/);
  assert.match(styles, /--paper:\s*#f7e7d2/);
  assert.match(styles, /--cyan:\s*#a9cee2/);
  assert.match(styles, /--peach:\s*#f1b58e/);
  assert.match(styles, /--sun:\s*#e2b84f/);
  assert.match(styles, /linear-gradient\(rgba\(41, 38, 34, \.035\) 1px/);
  assert.match(styles, /\.category:nth-child\(4n \+ 2\)/);
  assert.match(styles, /\.metrics article:nth-child\(3n \+ 2\)/);
  assert.match(styles, /\.bars li:nth-child\(5n \+ 2\)/);
  assert.ok(contrastRatio("292622", "f7e7d2") >= 7);
  assert.ok(contrastRatio("292622", "a9cee2") >= 7);
  assert.ok(contrastRatio("292622", "f1b58e") >= 7);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.workspaceCompact\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(styles, /\.chartToggle\s*\{\s*display:\s*none/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.chartPane\[data-compact="true"\][^}]*flex-direction:\s*row/);
  assert.match(styles, /\.chartPane\[data-compact="true"\][^}]*[\s\S]*?\.chartContent\s*\{\s*display:\s*none/);
});

test("all non-presentation pages share the homepage navigation and keep secondary navigation only where needed", async () => {
  const routes = [
    { pathname: "/", secondary: null },
    { pathname: "/field-validation", secondary: "Workshop navigation" },
    { pathname: "/proxyman-guide", secondary: null },
    { pathname: "/request-analyzer", secondary: "Request Analyzer navigation" },
    { pathname: "/workshop", secondary: "Context Lab navigation" },
  ];

  for (const route of routes) {
    const response = await render(route.pathname);
    assert.equal(response.status, 200);
    const html = await response.text();
    const primaryIndex = html.indexOf('aria-label="Primary navigation"');
    assert.ok(primaryIndex >= 0, `${route.pathname} should render the shared primary navigation`);
    assert.equal((html.match(/aria-label="Primary navigation"/g) ?? []).length, 1);
    if (route.secondary) {
      const secondaryIndex = html.indexOf(`aria-label="${route.secondary}"`);
      assert.ok(secondaryIndex > primaryIndex, `${route.pathname} should render its secondary navigation after the primary navigation`);
    }
    if (route.pathname === "/proxyman-guide") {
      assert.doesNotMatch(html, /aria-label="Proxyman guide navigation"/);
    }
  }
});

test("keeps the deck interactive, accessible, and the evidence sanitized", async () => {
  const [page, styles, globalStyles, layout, presentationPage, homePage, primaryNav, pageNav, workshopPage, workshopContent, packageJson, sample, legacySample] = await Promise.all([
    readFile(new URL("../app/interactive-presentation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/presentation.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/presentation/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/primary-nav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page-nav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/workshop/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/workshop/context-lab-content.tsx", import.meta.url), "utf8"),
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
  assert.match(workshopPage, /href:\s*"\/presentation"/);
  assert.match(homePage, /<PrimaryNav/);
  assert.doesNotMatch(homePage, /href="\/workshop#workshop"/);
  assert.match(primaryNav, /href="\/presentation"/);
  assert.match(primaryNav, /href="\/proxyman-guide"/);
  assert.match(primaryNav, /href="\/request-analyzer"/);
  assert.match(primaryNav, /href="\/field-validation"/);
  assert.match(pageNav, /secondaryNav/);
  assert.match(workshopContent, /打开 Request Token Explorer/);
  assert.doesNotMatch(workshopContent, /<TokenAnalyzer/);
  assert.doesNotMatch(page, /setTimeout\(\(\) => goToSlide\(1\)/);
  assert.match(page, /\[sanitized\]/i);
  assert.match(styles, /scroll-snap-type:\s*y mandatory/);
  assert.match(styles, /min-height:\s*100svh/);
  assert.match(styles, /16:9 projection scale/);
  assert.match(styles, /Large 16:9 canvas/);
  assert.match(styles, /@media \(min-width: 1400px\) and \(min-height: 800px\) and \(min-aspect-ratio: 16 \/ 10\)/);
  assert.match(styles, /width:\s*min\(1780px, calc\(100% - 7vw\)\)/);
  assert.match(styles, /\.loopDiagram\s*\{[^}]*min-height:\s*clamp\(400px, 46vh, 500px\)/);
  assert.match(styles, /\.transportStage,[\s\S]*?min-height:\s*clamp\(370px, 40vh, 460px\)/);
  assert.match(styles, /\.mainAgent\s*\{[^}]*width:\s*min\(100%, 420px\)[^}]*aspect-ratio:\s*1/);
  assert.match(styles, /\.shell:fullscreen/);
  assert.match(styles, /\.fullscreenGlyph/);
  assert.match(styles, /\.fullscreenActive/);
  assert.match(styles, /\.homeButton/);
  assert.doesNotMatch(styles, /@media \(max-width: 900px\)[\s\S]*?\.rail\s*\{\s*display:\s*none/);
  assert.match(globalStyles, /--black:\s*#131313/);
  assert.match(globalStyles, /--light:\s*#f8f8f8/i);
  assert.match(globalStyles, /--grey:\s*#989a9c/i);
  assert.match(globalStyles, /--accent:\s*#00c1d5/i);
  assert.match(globalStyles, /--accent-soft:\s*#99e5ee/i);
  assert.match(globalStyles, /--accent-deep:\s*#006a76/i);
  assert.match(globalStyles, /--display:\s*"Proxima Nova",\s*"Open Sans",\s*"Poppins"/);
  assert.match(globalStyles, /--text:\s*"Crimson Text",\s*Georgia,\s*serif/);
  assert.match(styles, /--night:\s*var\(--black\)/);
  assert.match(styles, /--paper:\s*var\(--light\)/);
  assert.match(styles, /--accent-cyan:\s*var\(--accent\)/);
  assert.match(styles, /--accent-indigo:\s*var\(--accent\)/);
  assert.match(styles, /--font-sans:\s*var\(--display\)/);
  assert.match(styles, /--font-serif:\s*var\(--text\)/);
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}/i);
  assert.match(styles, /\.rail\s*\{[^}]*left:\s*0/);
  assert.match(styles, /\.rail\s*\{[^}]*opacity:\s*\.46[^}]*filter:\s*saturate\(\.28\)/);
  assert.match(styles, /\.rail:hover\s*\{[^}]*opacity:\s*1[^}]*filter:\s*saturate\(1\)/);
  assert.match(styles, /\.rail::before\s*\{[^}]*transform:\s*translateX\(-52px\)/);
  assert.match(styles, /\.rail:hover::before\s*\{[^}]*transform:\s*translateX\(18px\)/);
  assert.match(styles, /\.rail:hover button\s*\{[^}]*transform:\s*translateX\(18px\)/);
  assert.match(styles, /\.rail:hover b\s*\{[^}]*max-width:\s*130px/);
  assert.match(styles, /\.rail:hover button:hover b\s*\{[^}]*color:\s*var\(--sun\)/);
  assert.doesNotMatch(styles, /\.rail \.railActive b/);
  assert.match(styles, /font-family:\s*var\(--text\)/);
  assert.doesNotMatch(styles, /#292622|#f7e7d2|#a9cee2|#f1b58e|#e2b84f|Courier New/i);
  assert.ok(contrastRatio("131313", "00c1d5") >= 7);
  assert.ok(contrastRatio("131313", "f8f8f8") >= 7);
  assert.ok(contrastRatio("f8f8f8", "006a76") >= 4.5);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /lang="en"/);
  assert.match(layout, /Claude Context Learning Lab/);
  assert.match(layout, /fonts\.googleapis\.com\/css2\?family=Crimson\+Text/);
  assert.doesNotMatch(layout, /next\/font\/google|Geist\(/);
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
