import styles from "./home.module.css";

const presentationTopics = [
  "Prompt 如何被组装成一次真实请求",
  "Model、Harness 与 Agent Loop 的分工",
  "Tools、Context、Cache、Memory 与 Subagents",
];

const workshopPhases = [
  { time: "15 MIN", title: "建立心智模型", detail: "先看 presentation，知道要在流量里找什么。" },
  { time: "10 MIN", title: "准备 Proxyman", detail: "完成安装、证书信任与 SSL Proxying。" },
  { time: "30–45 MIN", title: "实际 Workshop", detail: "亲手抓取、阅读并解释一次 Claude 请求。" },
];

export default function HomePage() {
  return (
    <main className={styles.home}>
      <nav className={styles.nav} aria-label="主要导航">
        <a className={styles.brand} href="#top" aria-label="回到首页顶部">
          <span>CLAUDE / CONTEXT</span>
          <b>LEARNING LAB</b>
        </a>
        <div className={styles.navLinks}>
          <a href="/presentation">Presentation</a>
          <a href="/proxyman-guide">Proxyman How-to</a>
          <a className={styles.navCta} href="/workshop#workshop">进入 Workshop <span>↗</span></a>
        </div>
      </nav>

      <header className={styles.hero} id="top">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>CLAUDE CODE REQUEST ANATOMY · INTERACTIVE TOOL</span>
          <h1>
            一次发送，
            <em>背后是一个系统。</em>
          </h1>
          <p>
            这是一套从“看懂”到“亲手验证”的学习工具：先用互动 presentation 建立心智模型，
            再用 Proxyman 看见真实网络流量，最后进入 workshop 完成一次完整实验。
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#learning-path">查看学习路线 <span>↓</span></a>
            <a className={styles.textButton} href="/presentation">直接打开 Presentation <span>↗</span></a>
          </div>
        </div>

        <div className={styles.systemMap} aria-label="学习路线概览">
          <div className={styles.mapHeader}>
            <span>LEARNING PATH</span>
            <b>01 → 04</b>
          </div>
          <ol>
            <li><span>01</span><div><b>Understand</b><small>认识这套工具</small></div><i>●</i></li>
            <li><span>02</span><div><b>Presentation</b><small>看懂请求结构</small></div><i>↓</i></li>
            <li><span>03</span><div><b>Proxyman</b><small>准备抓包环境</small></div><i>↓</i></li>
            <li><span>04</span><div><b>Workshop</b><small>亲手验证流量</small></div><i>✓</i></li>
          </ol>
          <div className={styles.mapFooter}>
            <span>概念</span><i /> <span>证据</span><i /> <span>实践</span>
          </div>
        </div>
      </header>

      <section className={styles.toolIntro} aria-labelledby="tool-intro-title">
        <div className={styles.sectionIndex}>
          <span>00</span>
          <b>WHAT THIS TOOL IS</b>
        </div>
        <div className={styles.introCopy}>
          <h2 id="tool-intro-title">把抽象概念、真实流量和动手实验，连成一条线。</h2>
          <p>
            它不是单独的一份幻灯片，也不只是抓包说明。整个工具围绕一个问题展开：
            当你在 Claude Code 按下 Send，Harness 如何组装 Context、调用 Model、执行 Tool，
            并把结果继续送回下一轮请求？
          </p>
        </div>
        <dl className={styles.introFacts}>
          <div><dt>4</dt><dd>个连续学习入口</dd></div>
          <div><dt>11</dt><dd>页互动 Presentation</dd></div>
          <div><dt>1</dt><dd>套真实流量 Workshop</dd></div>
        </dl>
      </section>

      <section className={styles.learningPath} id="learning-path" aria-labelledby="path-title">
        <div className={styles.pathHeading}>
          <div>
            <span className={styles.kicker}>START HERE · FOLLOW IN ORDER</span>
            <h2 id="path-title">四步走完这条学习路线。</h2>
          </div>
          <p>第一次使用建议按 01 → 04 顺序完成。已经熟悉某一步，也可以直接跳转。</p>
        </div>

        <div className={styles.pathGrid}>
          <article className={`${styles.pathCard} ${styles.aboutCard}`}>
            <div className={styles.cardTop}><span>01</span><b>ABOUT THE TOOL</b></div>
            <div className={styles.cardGlyph} aria-hidden="true"><i /><i /><i /></div>
            <h3>先知道你会学到什么</h3>
            <p>从 Agent 的工作方式出发，把“模型能力”和“工具实际行为”拆开理解，再用流量证据逐项验证。</p>
            <a href="#tool-intro-title" aria-label="回看工具介绍">工具介绍已在上方 <span>↑</span></a>
          </article>

          <article className={`${styles.pathCard} ${styles.presentationCard}`}>
            <div className={styles.cardTop}><span>02</span><b>INTERACTIVE PRESENTATION</b></div>
            <h3>Presentation 大概讲什么？</h3>
            <ul>
              {presentationTopics.map((topic) => <li key={topic}>{topic}</li>)}
            </ul>
            <a href="/presentation">点击进入 Presentation <span>↗</span></a>
          </article>

          <article className={`${styles.pathCard} ${styles.proxymanCard}`}>
            <div className={styles.cardTop}><span>03</span><b>PROXYMAN HOW-TO</b></div>
            <div className={styles.proxySignal} aria-hidden="true">
              <span>CLAUDE</span><i>→</i><strong>PROXYMAN</strong><i>→</i><span>API</span>
            </div>
            <h3>把 HTTPS 流量变成可读证据</h3>
            <p>跟着图文步骤完成安装、根证书信任、域名过滤与 SSL Proxying，然后找到 request、tool_use 和 token 数据。</p>
            <a href="/proxyman-guide">打开 Proxyman How-to <span>↗</span></a>
          </article>

          <article className={`${styles.pathCard} ${styles.workshopCard}`}>
            <div className={styles.cardTop}><span>04</span><b>HANDS-ON WORKSHOP</b></div>
            <span className={styles.readyLabel}>READY WHEN YOU ARE</span>
            <h3>学会前面两部分，就开始实际操作</h3>
            <p>用准备好的任务和脱敏样例，完成抓取、定位、阅读、比较与解释，不再只停留在概念层面。</p>
            <a href="/workshop#workshop">跳到实际 Workshop <span>↘</span></a>
          </article>
        </div>
      </section>

      <section className={styles.workshopEntry} id="workshop-ready" aria-labelledby="workshop-title">
        <div className={styles.entryCopy}>
          <span className={styles.eyebrow}>WHEN YOU ARE READY</span>
          <h2 id="workshop-title">现在，把看懂的东西亲手抓出来。</h2>
          <p>Workshop 会保留现有的完整实验内容、真实脱敏样例、Token Analyzer 与讨论题。</p>
          <div className={styles.entryActions}>
            <a className={styles.entryPrimary} href="/workshop#workshop">进入实际 Workshop <span>↗</span></a>
            <a className={styles.entrySecondary} href="/field-validation">打开英文现场验证任务</a>
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
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
