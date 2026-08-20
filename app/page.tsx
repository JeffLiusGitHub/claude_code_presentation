import styles from "./home.module.css";
import PrimaryNav from "./primary-nav";

const presentationTopics = [
  "How a prompt becomes a real model request",
  "The roles of the Model, Harness, and Agent Loop",
  "Tools, Context, Cache, Memory, and Subagents",
];

const workshopPhases = [
  { time: "15 MIN", title: "Build the mental model", detail: "Start with the presentation so you know what to find in the traffic." },
  { time: "10 MIN", title: "Prepare Proxyman", detail: "Install it, trust the certificate, and enable SSL Proxying." },
  { time: "20 MIN", title: "Run the workshop", detail: "Complete three hands-on tasks and record the network evidence." },
];

export default function HomePage() {
  return (
    <main className={styles.home}>
      <PrimaryNav brandHref="#top" />

      <header className={styles.hero} id="top">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>CLAUDE CODE REQUEST ANATOMY · INTERACTIVE TOOL</span>
          <h1>
            One Send.
            <em>A Whole System.</em>
          </h1>
          <p>
            A guided learning tool that moves from understanding to evidence: build the mental model
            in the interactive presentation, inspect real network traffic with Proxyman, then complete
            the hands-on workshop.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#learning-path">Explore the learning path <span>↓</span></a>
            <a className={styles.textButton} href="/presentation">Open the Presentation <span>↗</span></a>
          </div>
        </div>

        <div className={styles.systemMap} aria-label="Learning path overview">
          <div className={styles.mapHeader}>
            <span>LEARNING PATH</span>
            <b>01 → 04</b>
          </div>
          <ol>
            <li><span>01</span><div><b>Understand</b><small>Meet the learning tool</small></div><i>●</i></li>
            <li><span>02</span><div><b>Presentation</b><small>See the request anatomy</small></div><i>↓</i></li>
            <li><span>03</span><div><b>Proxyman</b><small>Prepare traffic capture</small></div><i>↓</i></li>
            <li><span>04</span><div><b>Workshop</b><small>Validate it yourself</small></div><i>✓</i></li>
          </ol>
          <div className={styles.mapFooter}>
            <span>CONCEPT</span><i /> <span>EVIDENCE</span><i /> <span>PRACTICE</span>
          </div>
        </div>
      </header>

      <section className={styles.toolIntro} aria-labelledby="tool-intro-title">
        <div className={styles.sectionIndex}>
          <span>00</span>
          <b>WHAT THIS TOOL IS</b>
        </div>
        <div className={styles.introCopy}>
          <h2 id="tool-intro-title">One path from abstract concepts to real traffic and hands-on proof.</h2>
          <p>
            This is more than a slide deck or a proxy setup guide. Everything revolves around one
            question: after you press Send in Claude Code, how does the Harness assemble Context,
            call the Model, execute a Tool, and carry the result into the next request?
          </p>
        </div>
        <dl className={styles.introFacts}>
          <div><dt>4</dt><dd>connected learning stages</dd></div>
          <div><dt>11</dt><dd>interactive presentation slides</dd></div>
          <div><dt>1</dt><dd>real-traffic workshop</dd></div>
        </dl>
      </section>

      <section className={styles.learningPath} id="learning-path" aria-labelledby="path-title">
        <div className={styles.pathHeading}>
          <div>
            <span className={styles.kicker}>START HERE · FOLLOW IN ORDER</span>
            <h2 id="path-title">Follow the complete path in four steps.</h2>
          </div>
          <p>For your first visit, follow 01 → 04 in order. If you already know a stage, jump straight to the next one.</p>
        </div>

        <div className={styles.pathGrid}>
          <article className={`${styles.pathCard} ${styles.aboutCard}`}>
            <div className={styles.cardTop}><span>01</span><b>ABOUT THE TOOL</b></div>
            <div className={styles.cardGlyph} aria-hidden="true"><i /><i /><i /></div>
            <h3>Start with what this tool will teach you</h3>
            <p>Separate model capability from actual product behavior, then verify each part of the Agent system with network evidence.</p>
            <a href="#tool-intro-title" aria-label="Review the tool introduction">Review the tool introduction <span>↑</span></a>
          </article>

          <article className={`${styles.pathCard} ${styles.presentationCard}`}>
            <div className={styles.cardTop}><span>02</span><b>INTERACTIVE PRESENTATION</b></div>
            <h3>What does the Presentation cover?</h3>
            <ul>
              {presentationTopics.map((topic) => <li key={topic}>{topic}</li>)}
            </ul>
            <a href="/presentation">Open the Presentation <span>↗</span></a>
          </article>

          <article className={`${styles.pathCard} ${styles.proxymanCard}`}>
            <div className={styles.cardTop}><span>03</span><b>PROXYMAN HOW-TO</b></div>
            <div className={styles.proxySignal} aria-hidden="true">
              <span>CLAUDE</span><i>→</i><strong>PROXYMAN</strong><i>→</i><span>API</span>
            </div>
            <h3>Turn HTTPS traffic into readable evidence</h3>
            <p>Follow the visual guide to install Proxyman, trust its root certificate, filter the model domain, enable SSL Proxying, and locate request, tool_use, and token data.</p>
            <a href="/proxyman-guide">Open the Proxyman How-to <span>↗</span></a>
          </article>

          <article className={`${styles.pathCard} ${styles.workshopCard}`}>
            <div className={styles.cardTop}><span>04</span><b>HANDS-ON WORKSHOP</b></div>
            <span className={styles.readyLabel}>READY WHEN YOU ARE</span>
            <h3>Once the first two stages make sense, put them into practice</h3>
            <p>Use prepared tasks and sanitized examples to capture, locate, read, compare, and explain the traffic for yourself.</p>
            <a href="/field-validation#tasks">Enter the Workshop <span>↘</span></a>
          </article>
        </div>
      </section>

      <section className={styles.workshopEntry} id="workshop-ready" aria-labelledby="workshop-title">
        <div className={styles.entryCopy}>
          <span className={styles.eyebrow}>WHEN YOU ARE READY</span>
          <h2 id="workshop-title">Now capture what you have learned.</h2>
          <p>The Workshop provides three hands-on tasks, observation points, success criteria, and a focused 20-minute schedule.</p>
          <div className={styles.entryActions}>
            <a className={styles.entryPrimary} href="/field-validation#tasks">Enter the Workshop <span>↗</span></a>
          </div>
        </div>

        <ol className={styles.phaseList}>
          {workshopPhases.map((phase, index) => (
            <li key={phase.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><b>{phase.title}</b><p>{phase.detail}</p></div>
              <time>{phase.time}</time>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.footer}>
        <div><span>CLAUDE / CONTEXT</span><b>LEARNING LAB</b></div>
        <p>Understand the system. Inspect the evidence. Run the workshop.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
