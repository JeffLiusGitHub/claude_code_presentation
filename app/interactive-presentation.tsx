"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./presentation.module.css";

const slideLabels = [
  "Press Send",
  "Model vs Harness",
  "ReAct Loop",
  "Context Assembly",
  "Tool Loop",
  "Streaming & Compact",
  "Prompt Cache",
  "Prefix Order",
  "Memory",
  "Subagents",
  "Final Model",
] as const;

const agentTrace = [
  { layer: "HARNESS", label: "Assemble context", code: 'POST /v1/messages  ·  messages: 1' },
  { layer: "MODEL", label: "Choose a tool", code: 'stop_reason: "tool_use"' },
  { layer: "HARNESS", label: "Check + execute", code: 'execute_tool("[sanitized]")' },
  { layer: "REQUEST", label: "Return observation", code: 'tool_use_id: "toolu_demo_01"' },
  { layer: "MODEL", label: "Reason again", code: 'messages: 3  ·  continue' },
  { layer: "MODEL", label: "Finish", code: 'stop_reason: "end_turn"' },
] as const;

const AUTO_TIMINGS = {
  modelHarness: 7000,
  reactStep: 4200,
  contextLayer: 6000,
  agentTrace: 3600,
  transportMode: 7000,
  cacheState: 7000,
  prefixOrder: 7500,
  memoryType: 6500,
  delegation: 7000,
} as const;

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return <span aria-hidden="true">{direction === "up" ? "↑" : "↓"}</span>;
}

function FullscreenIcon({ active }: { active: boolean }) {
  return <span className={styles.fullscreenGlyph} aria-hidden="true">{active ? "×" : "⛶"}</span>;
}

export default function InteractivePresentation() {
  const router = useRouter();
  const shellRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sent, setSent] = useState(false);
  const [focus, setFocus] = useState<"model" | "harness">("model");
  const [loopStep, setLoopStep] = useState(0);
  const [contextLayer, setContextLayer] = useState<"system" | "project" | "conversation">("system");
  const [agentStep, setAgentStep] = useState(0);
  const [transportMode, setTransportMode] = useState<"stream" | "compact" | "stop">("stream");
  const [cacheActive, setCacheActive] = useState(false);
  const [orderOptimized, setOrderOptimized] = useState(true);
  const [memoryType, setMemoryType] = useState<"claude" | "auto" | "session">("claude");
  const [delegated, setDelegated] = useState(false);

  const goToSlide = useCallback((index: number) => {
    const next = Math.max(0, Math.min(slideLabels.length - 1, index));
    slideRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* Slide changes intentionally reset each visual demo before scheduling its animation. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const slides = slideRefs.current.filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        setActiveSlide(Number((visible.target as HTMLElement).dataset.index ?? 0));
      },
      { root: deckRef.current, threshold: [0.45, 0.7] },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "BUTTON" && (event.key === " " || event.key === "Enter")) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goToSlide(activeSlide + 1);
      }
      if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goToSlide(activeSlide - 1);
      }
      if (event.key === "Home") goToSlide(0);
      if (event.key === "End") goToSlide(slideLabels.length - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlide, goToSlide]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    onFullscreenChange();
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timeouts: number[] = [];
    const intervals: number[] = [];
    const after = (delay: number, action: () => void) => {
      timeouts.push(window.setTimeout(action, delay));
    };
    const every = (delay: number, action: () => void) => {
      intervals.push(window.setInterval(action, delay));
    };

    switch (activeSlide) {
      case 0:
        setSent(false);
        after(2400, () => setSent(true));
        every(12000, () => {
          setSent(false);
          after(450, () => setSent(true));
        });
        break;
      case 1:
        setFocus("model");
        every(AUTO_TIMINGS.modelHarness, () => {
          setFocus((current) => (current === "model" ? "harness" : "model"));
        });
        break;
      case 2:
        setLoopStep(0);
        every(AUTO_TIMINGS.reactStep, () => {
          setLoopStep((current) => (current + 1) % 4);
        });
        break;
      case 3: {
        const layers = ["system", "project", "conversation"] as const;
        let layerIndex = 0;
        setContextLayer(layers[layerIndex]);
        every(AUTO_TIMINGS.contextLayer, () => {
          layerIndex = (layerIndex + 1) % layers.length;
          setContextLayer(layers[layerIndex]);
        });
        break;
      }
      case 4:
        setAgentStep(0);
        every(AUTO_TIMINGS.agentTrace, () => {
          setAgentStep((current) => (current + 1) % agentTrace.length);
        });
        break;
      case 5: {
        const modes = ["stream", "compact", "stop"] as const;
        let modeIndex = 0;
        setTransportMode(modes[modeIndex]);
        every(AUTO_TIMINGS.transportMode, () => {
          modeIndex = (modeIndex + 1) % modes.length;
          setTransportMode(modes[modeIndex]);
        });
        break;
      }
      case 6:
        setCacheActive(false);
        every(AUTO_TIMINGS.cacheState, () => {
          setCacheActive((current) => !current);
        });
        break;
      case 7:
        setOrderOptimized(false);
        every(AUTO_TIMINGS.prefixOrder, () => {
          setOrderOptimized((current) => !current);
        });
        break;
      case 8: {
        const memoryTypes = ["claude", "auto", "session"] as const;
        let memoryIndex = 0;
        setMemoryType(memoryTypes[memoryIndex]);
        every(AUTO_TIMINGS.memoryType, () => {
          memoryIndex = (memoryIndex + 1) % memoryTypes.length;
          setMemoryType(memoryTypes[memoryIndex]);
        });
        break;
      }
      case 9:
        setDelegated(false);
        every(AUTO_TIMINGS.delegation, () => {
          setDelegated((current) => !current);
        });
        break;
    }

    return () => {
      timeouts.forEach((timer) => window.clearTimeout(timer));
      intervals.forEach((timer) => window.clearInterval(timer));
    };
  }, [activeSlide]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function sendRequest() {
    setSent(false);
    window.setTimeout(() => setSent(true), 40);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (typeof shellRef.current?.requestFullscreen === "function") {
      await shellRef.current.requestFullscreen();
    }
  }

  async function returnHome() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Route home even if the browser exits fullscreen on its own.
    }
    router.push("/");
  }

  return (
    <main className={styles.shell} ref={shellRef}>
      <header className={styles.chrome} aria-label="Presentation controls">
        <div className={styles.headerStart}>
          <button className={styles.homeButton} onClick={() => { void returnHome(); }} aria-label="Back to home" title="Back to home">
            <span aria-hidden="true">←</span>
          </button>
          <button className={styles.wordmark} onClick={() => goToSlide(0)}>
            <span>CLAUDE CODE</span>
            <b>REQUEST ANATOMY</b>
          </button>
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.counter} aria-live="polite">
            <span>{String(activeSlide + 1).padStart(2, "0")}</span><i /><span>{String(slideLabels.length).padStart(2, "0")}</span>
          </div>
        </div>
      </header>

      <nav className={styles.rail} aria-label="Slides">
        {slideLabels.map((label, index) => (
          <button key={label} className={index === activeSlide ? styles.railActive : ""} onClick={() => goToSlide(index)} aria-label={`Go to slide ${index + 1}: ${label}`} aria-current={index === activeSlide ? "step" : undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span><i /><b>{label}</b>
          </button>
        ))}
      </nav>

      <div className={styles.arrowControls}>
        <button onClick={() => goToSlide(activeSlide - 1)} aria-label="Previous slide"><ArrowIcon direction="up" /></button>
        <button onClick={() => goToSlide(activeSlide + 1)} aria-label="Next slide"><ArrowIcon direction="down" /></button>
        <button className={`${styles.fullscreenButton} ${isFullscreen ? styles.fullscreenActive : ""}`} onClick={() => { void toggleFullscreen(); }} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={isFullscreen} title={isFullscreen ? "退出全屏（Esc）" : "进入全屏"}>
          <FullscreenIcon active={isFullscreen} />
        </button>
      </div>
      <div className={styles.progress} aria-hidden="true"><i style={{ transform: `scaleX(${(activeSlide + 1) / slideLabels.length})` }} /></div>

      <section className={styles.deck} ref={deckRef} aria-label="Claude Code presentation">
        <article className={`${styles.slide} ${styles.hero}`} data-index="0" ref={(node) => { slideRefs.current[0] = node; }}>
          <div className={styles.gridLines} aria-hidden="true" />
          <div className={styles.heroOrb} aria-hidden="true"><span /><span /><span /></div>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>FROM PROMPT TO TOOLS, CONTEXT, AND FINAL ANSWER</p>
            <h1>What happens after<br />you press <em>send?</em></h1>
            <p className={styles.subtitle}>The Anatomy of a Claude Code Request</p>
            <button className={`${styles.sendButton} ${sent ? styles.sent : ""}`} onClick={sendRequest}>
              <span>{sent ? "REQUEST IN FLIGHT" : "PRESS SEND"}</span><b aria-hidden="true">↗</b><i aria-hidden="true" />
            </button>
          </div>
          <div className={`${styles.signal} ${sent ? styles.signalActive : ""}`} aria-hidden="true">
            <span>USER REQUEST</span><i /><span>HARNESS</span><i /><span>MODEL</span>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.dualSlide}`} data-index="1" ref={(node) => { slideRefs.current[1] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>01 · TWO LAYERS, ONE AGENT</p>
            <h2>The model decides.<br />The harness makes it real.</h2>
            <div className={styles.dualStage} data-focus={focus}>
              <button className={styles.modelPanel} onClick={() => setFocus("model")}>
                <span className={styles.panelIndex}>A</span><div><small>CLAUDE MODEL</small><h3>Reasoning</h3><ul><li>Understands the task</li><li>Chooses the next step</li><li>Requests a tool</li></ul></div>
              </button>
              <div className={styles.bridge} aria-hidden="true"><span className={styles.requestPacket}>tool_use</span><i /><span className={styles.resultPacket}>tool_result</span></div>
              <button className={styles.harnessPanel} onClick={() => setFocus("harness")}>
                <span className={styles.panelIndex}>B</span><div><small>CLAUDE CODE HARNESS</small><h3>Orchestration</h3><ul><li>Assembles context</li><li>Checks permissions</li><li>Executes the tool</li></ul></div>
              </button>
            </div>
            <div className={styles.focusNote}><span>{focus === "model" ? "MODEL" : "HARNESS"}</span><p>{focus === "model" ? "The API response can ask for a tool — but it cannot touch your machine." : "The local harness turns that request into an action, then returns the observation."}</p></div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.loopSlide}`} data-index="2" ref={(node) => { slideRefs.current[2] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>02 · REACT-LIKE AGENT LOOP</p>
            <div className={styles.loopHeader}><h2>Work happens<br />in a loop.</h2><p>Reason → Act → Observe → Reason again</p></div>
            <div className={styles.loopExperience}>
              <div className={styles.loopDiagram} data-step={loopStep}>
                <div className={`${styles.loopNode} ${styles.reasonNode}`}><span>01</span><b>REASON</b><small>What do I need?</small></div>
                <div className={`${styles.loopNode} ${styles.actNode}`}><span>02</span><b>ACT</b><small>Request a tool</small></div>
                <div className={`${styles.loopNode} ${styles.observeNode}`}><span>03</span><b>OBSERVE</b><small>Read the result</small></div>
                <div className={styles.loopTrack} aria-hidden="true"><i /></div>
                <button className={styles.loopTrigger} onClick={() => setLoopStep((current) => (current + 1) % 4)}><span>RUN ONE STEP</span><b>{String(loopStep + 1).padStart(2, "0")}</b></button>
              </div>
              <div className={styles.tracePanel}>
                <span className={styles.traceLabel}>LIVE TRACE · SANITIZED</span>
                <ol>
                  <li className={styles.traceActive}><i>MODEL</i><code>decide_next_step()</code></li>
                  <li className={loopStep >= 1 ? styles.traceActive : ""}><i>RESPONSE</i><code>stop_reason: &quot;tool_use&quot;</code></li>
                  <li className={loopStep >= 2 ? styles.traceActive : ""}><i>HARNESS</i><code>execute([sanitized])</code></li>
                  <li className={loopStep >= 3 ? styles.traceActive : ""}><i>REQUEST</i><code>type: &quot;tool_result&quot;</code></li>
                </ol>
                <p>The trace advances automatically through each request layer.</p>
              </div>
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.contextSlide}`} data-index="3" ref={(node) => { slideRefs.current[3] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>03 · BEFORE THE MODEL IS CALLED</p>
            <div className={styles.splitHeading}>
              <h2>The harness builds<br />the request.</h2>
              <p>Each layer highlights automatically; click anytime to revisit it.</p>
            </div>
            <div className={styles.contextExperience}>
              <div className={styles.contextStack}>
                <button className={contextLayer === "system" ? styles.contextActive : ""} onClick={() => setContextLayer("system")}>
                  <span>01</span><div><b>SYSTEM</b><small>Core instructions · tools · output style</small></div><i>STABLE</i>
                </button>
                <button className={contextLayer === "project" ? styles.contextActive : ""} onClick={() => setContextLayer("project")}>
                  <span>02</span><div><b>PROJECT CONTEXT</b><small>CLAUDE.md · Auto Memory · rules</small></div><i>SEMI-STABLE</i>
                </button>
                <button className={contextLayer === "conversation" ? styles.contextActive : ""} onClick={() => setContextLayer("conversation")}>
                  <span>03</span><div><b>CONVERSATION</b><small>History · tool results · latest message</small></div><i>DYNAMIC</i>
                </button>
              </div>
              <div className={styles.contextCode} data-layer={contextLayer}>
                <div><span>SANITIZED PROXYMAN SAMPLE</span><b>request.json</b></div>
                <pre aria-label="Sanitized request body"><code>
                  <span className={contextLayer === "system" ? styles.codeActive : ""}>{`{\n  "model": "claude-sonnet-5",\n  "system": "[sanitized]",\n  "tools": [{ "name": "Read" }, ...],`}</span>
                  <span className={contextLayer === "project" ? styles.codeActive : ""}>{`\n  "messages": [{\n    "role": "user",\n    "content": "... CLAUDE_CANARY_123 ..."`}</span>
                  <span className={contextLayer === "conversation" ? styles.codeActive : ""}>{`\n  }, {\n    "role": "user",\n    "content": "[latest request]"\n  }],\n  "stream": true\n}`}</span>
                </code></pre>
                <p>{contextLayer === "system" ? "The model and tool definitions exist before any tool is chosen." : contextLayer === "project" ? "Project instructions are injected into the model context, not stored inside the model." : "The newest information arrives last, after the reusable prefix."}</p>
              </div>
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.toolSlide}`} data-index="4" ref={(node) => { slideRefs.current[4] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>04 · THE OPERATIONAL AGENT LOOP</p>
            <div className={styles.splitHeading}>
              <h2>One request.<br />Several model calls.</h2>
              <button className={styles.stepButton} onClick={() => setAgentStep((step) => (step + 1) % agentTrace.length)}><span>ADVANCE TRACE</span><b>{String(agentStep + 1).padStart(2, "0")}/06</b></button>
            </div>
            <div className={styles.toolExperience}>
              <div className={styles.toolPath}>
                {agentTrace.map((step, index) => (
                  <div key={step.label} className={`${styles.toolStep} ${index === agentStep ? styles.toolStepActive : ""} ${index < agentStep ? styles.toolStepDone : ""}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span><i /><div><small>{step.layer}</small><b>{step.label}</b></div>
                  </div>
                ))}
              </div>
              <div className={styles.toolEvidence}>
                <div className={styles.evidenceTop}><span>FLOW 775 → 781 → 782</span><i>LIVE STEP</i></div>
                <strong>{agentTrace[agentStep].layer}</strong>
                <code>{agentTrace[agentStep].code}</code>
                <p>{agentStep === 1 ? "The model requests the tool; it does not execute it." : agentStep === 2 ? "Permission checks and local execution happen inside the harness." : agentStep === 3 ? "The matching tool ID reconnects the observation to the original call." : agentStep === 5 ? "end_turn closes the normal loop." : "The next model call receives a larger message history."}</p>
                <div className={styles.messageGrowth}><span style={{ width: `${28 + agentStep * 12}%` }} /><b>messages 1 → 3 → 5</b></div>
              </div>
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.transportSlide}`} data-index="5" ref={(node) => { slideRefs.current[5] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>05 · DELIVERY, CONTEXT, CONTROL</p>
            <h2>Three mechanisms.<br />Three different jobs.</h2>
            <div className={styles.transportTabs} role="tablist" aria-label="Transport concepts">
              {(["stream", "compact", "stop"] as const).map((mode, index) => (
                <button key={mode} role="tab" aria-selected={transportMode === mode} className={transportMode === mode ? styles.transportActive : ""} onClick={() => setTransportMode(mode)}><span>0{index + 1}</span>{mode === "stream" ? "STREAMING" : mode === "compact" ? "COMPACTION" : "STOP REASON"}</button>
              ))}
            </div>
            <div className={styles.transportStage} data-mode={transportMode}>
              {transportMode === "stream" && <div className={styles.streamViz}><div className={styles.streamOutput}><span>Claude is responding</span><p><i>Receive</i><i>Display</i><i>Receive next</i></p></div><div className={styles.eventRail}><b>message_start</b><b>content_block_delta</b><b>message_delta</b><b>message_stop</b></div><strong>Delivery mechanism</strong></div>}
              {transportMode === "compact" && <div className={styles.compactViz}><div><span>BEFORE</span><i style={{ height: "100%" }} /><b>120,712</b></div><em>→</em><div><span>AFTER</span><i style={{ height: "71%" }} /><b>113,629</b></div><p>Dedicated compact request observed.<br /><small>Total body fell only ~5.9% in this capture.</small></p></div>}
              {transportMode === "stop" && <div className={styles.stopViz}><div className={styles.stopCenter}>stop_reason</div><div className={styles.stopContinue}><span>tool_use</span><b>CONTINUE</b><i>↻</i></div><div className={styles.stopFinish}><span>end_turn</span><b>FINISH</b><i>■</i></div></div>}
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.cacheSlide}`} data-index="6" ref={(node) => { slideRefs.current[6] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>06 · PROMPT CACHE</p>
            <div className={styles.splitHeading}>
              <h2>Reuse the part<br />that did not change.</h2>
              <button className={`${styles.cacheToggle} ${cacheActive ? styles.cacheToggleActive : ""}`} onClick={() => setCacheActive((value) => !value)}><i /><span>{cacheActive ? "PREFIX REUSED" : "REUSE PREFIX"}</span></button>
            </div>
            <div className={`${styles.cacheCompare} ${cacheActive ? styles.cacheCompareActive : ""}`}>
              <div className={styles.cacheRequest}><span>REQUEST 01</span><div className={styles.stableBlock}>SYSTEM</div><div className={styles.stableBlock}>TOOLS</div><div className={styles.stableBlock}>PROJECT CONTEXT</div><div className={styles.dynamicBlock}>USER MESSAGE A</div></div>
              <div className={styles.cacheLink} aria-hidden="true"><i /><b>CACHE</b><i /></div>
              <div className={styles.cacheRequest}><span>REQUEST 02</span><div className={styles.stableBlock}>SYSTEM</div><div className={styles.stableBlock}>TOOLS</div><div className={styles.stableBlock}>PROJECT CONTEXT</div><div className={styles.dynamicBlock}>HISTORY + MESSAGE B</div></div>
              <div className={styles.cacheMetrics}>
                <div><span>WRITE</span><b>6,626</b><small>cache_creation_input_tokens</small></div>
                <div><span>READ</span><b className={cacheActive ? styles.metricLive : ""}>28,562</b><small>cache_read_input_tokens</small></div>
              </div>
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.orderSlide}`} data-index="7" ref={(node) => { slideRefs.current[7] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>07 · WHY ORDER MATTERS</p>
            <div className={styles.splitHeading}>
              <h2>Stable first.<br />Dynamic last.</h2>
              <button className={styles.orderButton} onClick={() => setOrderOptimized((value) => !value)}><span>{orderOptimized ? "BREAK THE PREFIX" : "FIX THE ORDER"}</span><b>↕</b></button>
            </div>
            <div className={`${styles.orderStage} ${orderOptimized ? styles.orderGood : styles.orderBad}`}>
              <div className={styles.orderSequence}>
                {(orderOptimized ? ["SYSTEM", "TOOLS", "PROJECT", "HISTORY", "LATEST"] : ["LATEST", "SYSTEM", "HISTORY", "TOOLS", "PROJECT"]).map((item, index) => <div key={item} data-dynamic={item === "LATEST" || item === "HISTORY"}><span>{String(index + 1).padStart(2, "0")}</span><b>{item}</b></div>)}
              </div>
              <div className={styles.prefixMeasure}><span>REUSABLE PREFIX</span><i><b /></i><strong>{orderOptimized ? "LONG" : "BROKEN EARLY"}</strong></div>
              <div className={styles.orderExplain}><b>{orderOptimized ? "Exact prefix match survives." : "A changing first block invalidates everything after it."}</b><p>{orderOptimized ? "System, tools and project context can be reused while only the conversation tail changes." : "The same content exists, but the order prevents a long reusable beginning."}</p></div>
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.memorySlide}`} data-index="8" ref={(node) => { slideRefs.current[8] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>08 · PERSISTENT MEMORY</p>
            <h2>What crosses<br />a session boundary?</h2>
            <div className={styles.memoryTabs}>
              <button className={memoryType === "claude" ? styles.memoryActive : ""} onClick={() => setMemoryType("claude")}><span>HUMAN-WRITTEN</span><b>CLAUDE.md</b></button>
              <button className={memoryType === "auto" ? styles.memoryActive : ""} onClick={() => setMemoryType("auto")}><span>CLAUDE-MAINTAINED</span><b>Auto Memory</b></button>
              <button className={memoryType === "session" ? styles.memoryActive : ""} onClick={() => setMemoryType("session")}><span>NOT PERSISTENT MEMORY</span><b>Conversation</b></button>
            </div>
            <div className={styles.memoryStage} data-memory={memoryType}>
              <div className={styles.memorySource}><span>{memoryType === "claude" ? "CLAUDE.md" : memoryType === "auto" ? "MEMORY.md" : "SESSION HISTORY"}</span><code>{memoryType === "claude" ? "CLAUDE_CANARY_123" : memoryType === "auto" ? "MEMORY_CANARY_123" : "[previous messages]"}</code><p>{memoryType === "claude" ? "Project instructions · standards · workflows" : memoryType === "auto" ? "Build commands · findings · preferences" : "Available only while this session history is carried forward"}</p></div>
              <div className={styles.memoryArrow}><i /><b>{memoryType === "session" ? "SESSION ONLY" : "NEW SESSION"}</b></div>
              <div className={styles.memoryRequest}><span>SANITIZED REQUEST</span><pre><code>{memoryType === "session" ? `messages: [\n  "[current session context]"\n]` : `messages: [{\n  role: "user",\n  content: "... ${memoryType === "claude" ? "CLAUDE_CANARY_123" : "MEMORY_CANARY_123"} ..."\n}]`}</code></pre></div>
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.subagentSlide}`} data-index="9" ref={(node) => { slideRefs.current[9] = node; }}>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>09 · SUBAGENTS</p>
            <div className={styles.splitHeading}>
              <h2>Move side work<br />into side contexts.</h2>
              <button className={`${styles.delegateButton} ${delegated ? styles.delegateActive : ""}`} onClick={() => setDelegated((value) => !value)}>{delegated ? "COLLECT RESULTS" : "DELEGATE TASKS"}<b>↗</b></button>
            </div>
            <div className={`${styles.agentFanout} ${delegated ? styles.agentFanoutActive : ""}`}>
              <div className={styles.mainAgent}><span>MAIN AGENT</span><b>SONNET</b><small>15 tools · ~110KB</small></div>
              <div className={styles.fanLines} aria-hidden="true"><i /><i /><i /></div>
              <div className={styles.childAgents}>
                <div><span>FRONTEND</span><b>READ</b><small>focused brief</small></div>
                <div><span>BACKEND</span><b>READ</b><small>separate context</small></div>
                <div><span>TESTS</span><b>READ</b><small>parallel work</small></div>
              </div>
              <div className={styles.subagentEvidence}><span>SANITIZED PROXYMAN COMPARISON</span><div><b>Parent</b><code>claude-sonnet-5 · tools: 15</code></div><div><b>Child</b><code>claude-haiku-4-5 · tools: [Read]</code></div><p>x-claude-code-agent-id: [sanitized]</p></div>
            </div>
          </div>
        </article>

        <article className={`${styles.slide} ${styles.finalSlide}`} data-index="10" ref={(node) => { slideRefs.current[10] = node; }}>
          <div className={styles.finalBackdrop} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.slideContent}>
            <p className={styles.eyebrow}>10 · THE COMPLETE MENTAL MODEL</p>
            <h2>Reasoning becomes<br /><em>an operational agent.</em></h2>
            <div className={styles.finalSystem}>
              <div className={styles.finalModel}><span>MODEL</span><b>REASONING</b></div>
              <div className={styles.finalPlus}>+</div>
              <div className={styles.finalHarness}><span>HARNESS</span><b>CONTEXT · TOOLS · EXECUTION · CONTROL</b></div>
            </div>
            <div className={styles.finalFlow}><span>USER REQUEST</span><i>→</i><span>CONTEXT</span><i>→</i><span>MODEL</span><i>→</i><span>TOOL</span><i>↻</i><span>FINAL ANSWER</span></div>
            <div className={styles.finalActions}><a href="/proxyman-guide">INSPECT A REAL REQUEST <b>↗</b></a><button onClick={() => goToSlide(0)}>RESTART <b>↺</b></button></div>
          </div>
        </article>
      </section>
    </main>
  );
}
