import type { Metadata } from "next";
import styles from "./validation.module.css";

export const metadata: Metadata = {
  title: "Proxyman Field Validation Task Sheet",
  description:
    "Three concise, read-only tasks for validating the Claude Code agent loop, prompt cache, streaming, and subagents in Proxyman.",
};

const taskOnePrompt = `[TRAFFIC-DEMO-01] This is a read-only validation task. First use Bash to print the current working directory, then use Glob to list no more than 10 files or folders in the current directory, and finally summarize what you saw in one sentence. Do not create, modify, or delete any files.`;

const cachePromptA = `[CACHE-DEMO-A] Explain what an Agent Loop is in one sentence only. Do not call any tools.`;
const cachePromptB = `[CACHE-DEMO-B] Explain what a Tool Result is in one sentence only. Do not call any tools.`;

const taskThreePrompt = `[SUBAGENT-DEMO-01] Explicitly start two Subagents to perform two independent read-only tasks, then summarize their results. Subagent A should identify the operating system and current working directory. Subagent B should count the top-level files and folders without reading file contents. Run them in parallel where possible. Do not create, modify, or delete any files.`;

function ShortList({ children }: { children: string[] }) {
  return (
    <ul className={styles.shortList}>
      {children.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export default function FieldValidationPage() {
  return (
    <main className={styles.page} lang="en">
      <nav className={styles.nav} aria-label="Field validation navigation">
        <a className={styles.brand} href="/">CLAUDE CODE <span>FIELD LAB</span></a>
        <div>
          <a href="#tasks">Tasks</a>
          <a href="#timing">Timing</a>
          <a href="#before-start">Before you start</a>
          <a className={styles.navCta} href="/presentation">Request Anatomy ↗</a>
        </div>
      </nav>

      <header className={styles.intro}>
        <div className={styles.introMain}>
          <p className={styles.eyebrow}>PROXYMAN · FIELD VALIDATION · 20 MIN</p>
          <h1>Proxyman Field Validation Task Sheet</h1>
          <div className={styles.introCopy}>
            <p>
              The next section is hands-on. By the end of the exercise,
              participants should have a basic understanding of Claude Code
              context assembly, the division of responsibilities between the
              model and the Harness, the Agent Loop, tool calls, streaming
              responses, Prompt Cache, and Subagents.
            </p>
            <p>
              Use Proxyman to validate Claude Code network traffic. You may use
              any prompt you like; the tasks below are provided as references.
              At the end of the session, we will discuss the traffic patterns
              that were observed.
            </p>
            <p>
              These reference tasks do not depend on a specific project,
              existing files, or an earlier conversation. Participants can run
              them from any directory. Allow no more than 20 minutes for all
              three tasks.
            </p>
          </div>
        </div>

        <aside className={styles.summary} aria-label="Exercise summary">
          <p>AT A GLANCE</p>
          <dl>
            <div><dt>Tasks</dt><dd>3</dd></div>
            <div><dt>Total time</dt><dd>20 min</dd></div>
            <div><dt>File changes</dt><dd>None</dd></div>
            <div><dt>Evidence</dt><dd>Request + Response Body</dd></div>
          </dl>
        </aside>
      </header>

      <section className={styles.section} id="tasks" aria-labelledby="tasks-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>TASKS 01–03</p>
            <h2 id="tasks-title">Validation tasks</h2>
          </div>
          <p>Keep Proxyman open beside Claude Code. Match each visible action to the traffic.</p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.taskTable}>
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Prompt</th>
                <th scope="col">Look for</th>
                <th scope="col">Pass when</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <span className={styles.taskNumber}>01</span>
                  <strong>Agent Loop</strong>
                  <small>8 min · read only</small>
                </th>
                <td><pre>{taskOnePrompt}</pre></td>
                <td>
                  <ShortList>{[
                    "system + tools + messages",
                    "tool_use → tool_result",
                    "Streaming events",
                  ]}</ShortList>
                </td>
                <td>
                  <ShortList>{[
                    "At least 2 model requests",
                    "Matching tool_use_id",
                    "stop_reason: tool_use → end_turn",
                  ]}</ShortList>
                </td>
              </tr>

              <tr>
                <th scope="row">
                  <span className={styles.taskNumber}>02</span>
                  <strong>Prompt Cache</strong>
                  <small>4 min · same session</small>
                </th>
                <td>
                  <div className={styles.promptPair}>
                    <pre>{cachePromptA}</pre>
                    <span>THEN</span>
                    <pre>{cachePromptB}</pre>
                  </div>
                </td>
                <td>
                  <ShortList>{[
                    "Same request prefix",
                    "New message appended",
                    "Cache usage fields",
                  ]}</ShortList>
                </td>
                <td>
                  <ShortList>{[
                    "A: cache_creation_input_tokens > 0",
                    "B: cache_read_input_tokens > 0",
                    "Otherwise: not observed",
                  ]}</ShortList>
                </td>
              </tr>

              <tr>
                <th scope="row">
                  <span className={styles.taskNumber}>03</span>
                  <strong>Subagents</strong>
                  <small>6 min · parallel if possible</small>
                </th>
                <td><pre>{taskThreePrompt}</pre></td>
                <td>
                  <ShortList>{[
                    "Parent delegation",
                    "Two request chains",
                    "Results returned to parent",
                  ]}</ShortList>
                </td>
                <td>
                  <ShortList>{[
                    "A and B are distinguishable",
                    "Time overlap proves parallelism",
                    "Token usage still adds up",
                  ]}</ShortList>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${styles.section} ${styles.timingSection}`} id="timing" aria-labelledby="timing-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>SUGGESTED PACE</p>
            <h2 id="timing-title">20-minute timing</h2>
          </div>
          <p>Stop when the evidence is clear. Missing evidence means “not observed.”</p>
        </div>

        <table className={styles.simpleTable}>
          <thead><tr><th>Segment</th><th>Time</th></tr></thead>
          <tbody>
            <tr><td>Task 1 · Agent Loop</td><td>8 min</td></tr>
            <tr><td>Task 2 · Prompt Cache</td><td>4 min</td></tr>
            <tr><td>Task 3 · Subagents</td><td>6 min</td></tr>
            <tr><td>Debrief + buffer</td><td>2 min</td></tr>
            <tr className={styles.totalRow}><td>Total</td><td>20 min</td></tr>
          </tbody>
        </table>
      </section>

      <section className={`${styles.section} ${styles.beforeStart}`} id="before-start" aria-labelledby="before-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>BEFORE YOU START</p>
            <h2 id="before-title">Prepare and protect</h2>
          </div>
        </div>

        <table className={styles.simpleTable}>
          <thead><tr><th>Check</th><th>Required action</th></tr></thead>
          <tbody>
            <tr><td>Proxy</td><td>Confirm Proxyman is listening and Claude Code uses it.</td></tr>
            <tr><td>Certificate</td><td>Trust the Proxyman CA.</td></tr>
            <tr><td>SSL Proxying</td><td>Enable it for the actual model domain.</td></tr>
            <tr><td>Traffic</td><td>Clear old flows; filter with the task marker.</td></tr>
            <tr className={styles.warningRow}><td>Privacy</td><td>Hide Authorization, x-api-key, cookies, and account data.</td></tr>
          </tbody>
        </table>
      </section>

      <section className={`${styles.section} ${styles.recordSection}`} aria-labelledby="record-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>QUICK RECORD</p>
            <h2 id="record-title">Capture the result</h2>
          </div>
          <p>Use one line per task during the debrief.</p>
        </div>

        <table className={styles.recordTable}>
          <thead><tr><th>Task</th><th>Status</th><th>Evidence / flow IDs</th></tr></thead>
          <tbody>
            <tr><td>01 · Agent Loop</td><td>Pass / Not observed</td><td /></tr>
            <tr><td>02 · Prompt Cache</td><td>Pass / Not observed</td><td /></tr>
            <tr><td>03 · Subagents</td><td>Pass / Not observed</td><td /></tr>
          </tbody>
        </table>
      </section>

      <footer className={styles.footer}>
        <b>PROXYMAN FIELD VALIDATION</b>
        <div>
          <a href="/">Context Lab</a>
          <a href="/proxyman-guide">Setup Guide</a>
          <a href="/presentation">Request Anatomy</a>
        </div>
      </footer>
    </main>
  );
}
