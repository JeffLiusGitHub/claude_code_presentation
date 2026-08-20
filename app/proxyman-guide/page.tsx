import type { Metadata } from "next";
import Image from "next/image";
import PrimaryNav from "../primary-nav";

const title = "Proxyman Setup · Capture the Claude Agent Loop";
const description =
  "An evidence-led Windows guide to installing Proxyman, trusting its local CA, capturing Claude traffic, and reading the agent loop in two API requests.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { card: "summary", title, description, images: [] },
};

const downloadUrl =
  "https://github.com/ProxymanApp/proxyman-windows-linux/releases/tag/3.17.0";

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="pmg-external" href={href} target="_blank" rel="noreferrer">
    {children} <span aria-hidden="true">↗</span>
  </a>
);

const Evidence = ({
  src,
  alt,
  caption,
  wide = false,
}: {
  src: string;
  alt: string;
  caption: string;
  wide?: boolean;
}) => (
  <figure className={`pmg-evidence${wide ? " pmg-evidence-wide" : ""}`}>
    <div className="pmg-evidence-frame">
      <Image
        src={src}
        alt={alt}
        width={2100}
        height={1342}
        loading="lazy"
        sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 62vw"
        unoptimized
      />
    </div>
    <figcaption>{caption}</figcaption>
  </figure>
);

const Step = ({
  number,
  title: stepTitle,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) => (
  <article className="pmg-step">
    <div className="pmg-step-number">{number}</div>
    <div>
      <h3>{stepTitle}</h3>
      {children}
    </div>
  </article>
);

const ActionGuide = ({
  items,
}: {
  items: Array<{ label: string; content: React.ReactNode }>;
}) => (
  <ol className="pmg-action-guide">
    {items.map((item, index) => (
      <li key={`${item.label}-${index}`}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div>
          <b>{item.label}</b>
          <p>{item.content}</p>
        </div>
      </li>
    ))}
  </ol>
);

export default function ProxymanGuide() {
  return (
    <main className="pmg-page">
      <PrimaryNav />

      <header className="pmg-hero" id="top">
        <div className="pmg-hero-copy">
          <span className="pmg-eyebrow">INSTALL · TRUST · CAPTURE · EXPLAIN</span>
          <h1>See the agent loop<br /><em>on the wire.</em></h1>
          <p>
            Install Proxyman on Windows, route Claude through a local proxy, and turn two
            encrypted API calls into visible evidence of tool use, tool results, caching,
            and completion.
          </p>
          <div className="pmg-actions">
            <a className="pmg-primary" href="#install">Start with the installer ↓</a>
            <ExternalLink href={downloadUrl}>Download Proxyman 3.17.0</ExternalLink>
          </div>
        </div>
        <aside className="pmg-hero-card">
          <span>HOW TO INSTALL</span>
          <strong>5-minute starter</strong>
          <ol>
            <li><a href="#install"><b>01</b><span>Get the official installer</span><i aria-hidden="true">↓</i></a></li>
            <li><a href="#configure"><b>02</b><span>Trust the local CA</span><i aria-hidden="true">↓</i></a></li>
            <li><a href="#task"><b>03</b><span>Run one Claude task</span><i aria-hidden="true">↓</i></a></li>
            <li><a href="#trace"><b>04</b><span>Read the captured loop</span><i aria-hidden="true">↓</i></a></li>
          </ol>
          <small>Jump to any step, or follow the guide from top to bottom.</small>
        </aside>
      </header>

      <section className="pmg-mental" aria-labelledby="mental-title">
        <div>
          <span className="pmg-kicker">THE ONE-MINUTE MODEL</span>
          <h2 id="mental-title">Where Proxyman sits</h2>
          <p>
            Proxyman is a local debugging proxy. Claude sends an HTTPS request to the
            proxy; Proxyman records the exchange, then opens its own secure connection to
            Anthropic. Trusting Proxyman&apos;s local CA makes the selected HTTPS traffic readable.
          </p>
        </div>
        <div className="pmg-flow" aria-label="Claude traffic flows through Proxyman to Anthropic">
          <div><span>AGENT</span><b>Claude</b><small>prompt + context</small></div>
          <i>→</i>
          <div className="pmg-flow-focus"><span>LOCAL PROXY</span><b>Proxyman :9090</b><small>capture + decrypt</small></div>
          <i>→</i>
          <div><span>API</span><b>Anthropic</b><small>/v1/messages</small></div>
        </div>
        <div className="pmg-explain-grid">
          <article>
            <b>Proxy enabled</b>
            <p>You can see destinations, connections, timing, and HTTP status.</p>
          </article>
          <article>
            <b>CA trusted</b>
            <p>HTTPS request and response bodies become readable on this machine.</p>
          </article>
          <article>
            <b>Domain selected</b>
            <p>SSL Proxying is scoped to <code>api.anthropic.com</code> for this exercise.</p>
          </article>
        </div>
      </section>

      <section className="pmg-section" id="install">
        <div className="pmg-section-head">
          <span className="pmg-kicker">01 · INSTALL</span>
          <h2>Get it from the official release</h2>
          <p>
            This walkthrough used <b>Proxyman.Setup.3.17.0.exe</b> from the official
            Proxyman Windows/Linux GitHub release. The release page is the source link
            used for the workshop recording.
          </p>
        </div>

        <div className="pmg-install-grid">
          <div className="pmg-install-copy">
            <Step number="01" title="Open the release page">
              <p>Use the official link below and open the <b>Assets</b> list.</p>
              <ExternalLink href={downloadUrl}>GitHub · Proxyman 3.17.0 release</ExternalLink>
            </Step>
            <Step number="02" title="Choose the Windows installer">
              <p>Select <code>Proxyman.Setup.3.17.0.exe</code>. Windows may show its normal download and security checks.</p>
            </Step>
            <Step number="03" title="Run the setup wizard">
              <p>Follow the installer prompts, then launch Proxyman. The app should open to its traffic list.</p>
            </Step>
          </div>
          <div className="pmg-install-evidence">
            <Evidence
              src="/proxyman-evidence/01-download-release-3.17.0.png"
              alt="Official Proxyman 3.17.0 GitHub release page with Windows installer asset"
              caption="Evidence 01 · The installer comes from ProxymanApp's official release page."
            />
          </div>
        </div>

        <div className="pmg-build-note">
          <span>RECORDED BUILD</span>
          <b>Proxyman.Setup.3.17.0.exe</b>
          <code>SHA-256 · 2100771DCF1994E42CC0C853A14D0531197B78E5942CB5F1244B8FDA7B6F73AB</code>
        </div>
      </section>

      <section className="pmg-ca" id="configure">
        <div className="pmg-section-head pmg-light-head">
          <span className="pmg-kicker">02 · CONFIGURE</span>
          <h2>Make one HTTPS path readable</h2>
          <p>
            Three visible states matter: Proxyman is listening, its local CA is trusted,
            and SSL Proxying is enabled for the Anthropic API host.
          </p>
        </div>

        <div className="pmg-config-grid">
          <article className="pmg-config-card">
            <div className="pmg-config-copy">
              <span>2A · LISTEN</span>
              <h3>Confirm port 9090</h3>
              <p>
                In Proxyman, open the proxy setup view. The workshop capture shows
                <b> 127.0.0.1:9090</b> and the Windows proxy override enabled.
              </p>
              <ActionGuide
                items={[
                  {
                    label: "WHERE TO LOOK",
                    content: <>Find the green status pill in the centre of Proxyman&apos;s top bar.</>,
                  },
                  {
                    label: "WHAT TO READ",
                    content: <><code>Listening on 127.0.0.1:9090</code>, or your LAN address followed by <code>:9090</code>.</>,
                  },
                  {
                    label: "SUCCESS CHECK",
                    content: <>The bottom-right status reads <b>Proxy Overridden</b>, and the <b>Domains</b> count on the left starts increasing. If it stays empty, open <b>Setup</b> and re-enable the system proxy override.</>,
                  },
                ]}
              />
            </div>
            <Evidence
              src="/proxyman-evidence/05-proxyman-listening-9090.jpg"
              alt="Proxyman manual setup showing listening port 9090"
              caption="Evidence 02 · The local proxy is listening on port 9090."
            />
          </article>

          <article className="pmg-config-card pmg-config-card-alt">
            <div className="pmg-config-copy">
              <span>2B · TRUST</span>
              <h3>Install the local CA</h3>
              <p>
                Open <code>Certificate → Install Certificate on this Windows</code>, then
                choose <b>Install &amp; Trust</b>. Confirm the Windows certificate prompt.
              </p>
              <ActionGuide
                items={[
                  {
                    label: "WHERE TO CLICK",
                    content: <>Use the top menu: <code>Certificate → Install Certificate on this Windows…</code></>,
                  },
                  {
                    label: "WHAT TO CLICK",
                    content: <>Choose <b>Install &amp; Trust</b>, then select <b>Yes</b> in the Windows permission prompt.</>,
                  },
                  {
                    label: "SUCCESS CHECK",
                    content: <>The setup panel shows <b>Installed &amp; Trusted</b> and <b>Proxyman Certificate is ready!</b></>,
                  },
                ]}
              />
            </div>
            <Evidence
              src="/proxyman-evidence/06-certificate-installed-trusted.jpg"
              alt="Proxyman certificate panel showing Installed and Trusted"
              caption="Evidence 03 · Windows trusts the Proxyman root certificate."
            />
          </article>

          <article className="pmg-config-card">
            <div className="pmg-config-copy">
              <span>2C · DECRYPT</span>
              <h3>Add the Anthropic API host</h3>
              <p>
                Open the SSL Proxying list and add <code>api.anthropic.com</code>. Keep the
                rule narrow so the exercise focuses on the Claude API exchange.
              </p>
              <ActionGuide
                items={[
                  {
                    label: "WHERE TO CLICK",
                    content: <>Open <code>Tools → SSL Proxying List…</code>, tick <b>Enable SSL Proxying Tool</b>, select <b>Include List</b>, then click <b>+</b>.</>,
                  },
                  {
                    label: "WHAT TO TYPE",
                    content: <>Enter <code>api.anthropic.com</code> exactly—without <code>https://</code>, a path, or a wildcard—and keep the row checked.</>,
                  },
                  {
                    label: "SUCCESS CHECK",
                    content: <>The enabled host appears in the Include List. If it already appears under <b>Domains</b> on the left, you can also right-click it and choose <b>Enable SSL Proxying</b>.</>,
                  },
                ]}
              />
            </div>
            <Evidence
              src="/proxyman-evidence/07-ssl-proxying-api-anthropic.jpg"
              alt="Proxyman SSL Proxying list with api.anthropic.com enabled"
              caption="Evidence 04 · SSL Proxying is enabled for api.anthropic.com."
            />
          </article>
        </div>

        <div className="pmg-ca-note">
          <b>Why the certificate matters</b>
          <p>
            HTTPS normally hides the request body. Trusting the local Proxyman CA allows
            this machine to inspect the selected connection while preserving TLS on both
            sides of the proxy.
          </p>
          <strong>Use workshop prompts and crop credentials from any shared capture.</strong>
        </div>
      </section>

      <section className="pmg-section" id="task">
        <div className="pmg-section-head">
          <span className="pmg-kicker">03 · RUN ONE TASK</span>
          <h2>Give Claude an observable job</h2>
          <p>
            The task is intentionally read-only and portable. It asks for two visible tool
            calls and a short final answer, so the agent loop should span two API requests.
          </p>
        </div>

        <div className="pmg-task-runbook">
          <div>
            <span>FROM SETUP TO TRAFFIC</span>
            <h3>Run it once, with Proxyman recording</h3>
            <p>Keep both apps open. Start the capture before sending the prompt so the complete two-request loop appears in one time window.</p>
          </div>
          <ActionGuide
            items={[
              {
                label: "WHERE TO TYPE",
                content: <>Open a new Claude task and click its message composer. Leave Proxyman running in the background.</>,
              },
              {
                label: "WHAT TO TYPE",
                content: <>Paste the entire <b>Task Prompt</b> below unchanged. Keep the marker <code>TRAFFIC-DEMO-01-FRESH</code>; it ties the task to the captured request.</>,
              },
              {
                label: "WHEN TO RETURN",
                content: <>Press <b>Send</b> once. Return to Proxyman after Claude shows <b>Bash</b>, <b>Glob</b>, and the final one-sentence answer.</>,
              },
            ]}
          />
        </div>

        <div className="pmg-prompt-card">
          <span>TASK PROMPT</span>
          <code>
            [TRAFFIC-DEMO-01-FRESH] This is a read-only validation task. First use Bash to
            print the current working directory, then use Glob to list up to 10 files or
            folders in the current directory, and finally summarize what you saw in one
            sentence. Do not change any files.
          </code>
          <div>
            <b>Why it works</b>
            <p>The unique marker links the Claude UI task to the matching request body in Proxyman.</p>
          </div>
        </div>

        <Evidence
          src="/proxyman-evidence/08-claude-task-result-en.png"
          alt="Claude completing the validation task with Bash and Glob"
          caption="Evidence 05 · Claude ran the requested tools and returned a one-sentence summary."
          wide
        />

        <div className="pmg-success-strip">
          <b>Task-level success</b>
          <span>Claude shows both tool actions</span>
          <span>A final answer appears</span>
          <span>Proxyman records matching API calls</span>
        </div>
      </section>

      <section className="pmg-trace" id="trace">
        <div className="pmg-section-head pmg-light-head">
          <span className="pmg-kicker">04 · READ THE TRACE</span>
          <h2>Two requests prove the loop</h2>
          <p>
            The first response asks the harness to run tools. The next request carries the
            tool results back to Claude, and its response ends the turn.
          </p>
        </div>

        <div className="pmg-search-panel">
          <div>
            <span>FIND YOUR CAPTURE</span>
            <h3>Reduce the list to the two message requests</h3>
            <p>The IDs in this recording are #202 and #214. Your IDs will be different; use the host, path, method, and task time instead.</p>
          </div>
          <ActionGuide
            items={[
              {
                label: "FILTER THE HOST",
                content: <>In the left <b>Domains</b> panel, click <code>api.anthropic.com</code>. If needed, click <b>Filter (Ctrl+F)</b> at bottom-left and set <code>URL · Contains · api.anthropic.com/v1/messages</code>.</>,
              },
              {
                label: "CHOOSE THE PAIR",
                content: <>Select the two <code>POST /v1/messages?beta=true</code> rows created when you sent the task. Ignore the smaller <code>/count_tokens</code> rows.</>,
              },
              {
                label: "OPEN THE CONTENT",
                content: <>For the first row, inspect <code>Response → Body</code>. For the next row, inspect both <code>Request → Body</code> and <code>Response → Body</code>.</>,
              },
            ]}
          />
        </div>

        <div className="pmg-trace-flow" aria-label="Two-request agent loop">
          <div><span>REQUEST #202</span><b>Prompt + tools</b><small>response: tool_use</small></div>
          <i>→</i>
          <div className="pmg-trace-tool"><span>LOCAL HARNESS</span><b>Bash + Glob</b><small>collect results</small></div>
          <i>→</i>
          <div><span>REQUEST #214</span><b>tool_result × 2</b><small>response: end_turn</small></div>
        </div>

        <article className="pmg-trace-card">
          <div className="pmg-trace-copy">
            <span>FIRST MATCH · RECORDING #202 · POST /v1/messages?beta=true</span>
            <h3>Claude asks for Bash and Glob</h3>
            <p>
              The streaming response contains two <code>tool_use</code> blocks. This proves
              the model requested tool actions; it did not execute them inside the model.
            </p>
            <ActionGuide
              items={[
                {
                  label: "SEARCH RESPONSE BODY",
                  content: <>Click inside <code>Response → Body</code>, press <code>Ctrl+F</code>, and type <code>tool_use</code>. You should find two tool blocks named <code>Bash</code> and <code>Glob</code>.</>,
                },
                {
                  label: "SEARCH THE PAUSE",
                  content: <>Replace the search with <code>stop_reason</code>. The nearby value should be <code>tool_use</code>, meaning the harness must run the tools.</>,
                },
                {
                  label: "SEARCH CACHE USAGE",
                  content: <>Search for <code>cache_creation_input_tokens</code>, then <code>cache_read_input_tokens</code>, to locate the cache counts at the end of the stream.</>,
                },
              ]}
            />
            <dl>
              <dt>Response end state</dt><dd><code>stop_reason: tool_use</code></dd>
              <dt>Cache creation</dt><dd>11,858 input tokens</dd>
              <dt>Cache read</dt><dd>38,326 input tokens</dd>
              <dt>What it means</dt><dd>The harness must now run the tools and continue the turn.</dd>
            </dl>
          </div>
          <div className="pmg-trace-shots">
            <Evidence
              src="/proxyman-evidence/09-proxyman-tool-use-bash-glob.jpg"
              alt="Proxyman response showing Bash and Glob tool_use blocks"
              caption="Evidence 06 · Two tool requests appear in the response stream."
            />
            <Evidence
              src="/proxyman-evidence/10-stop-reason-tool-use-cache.jpg"
              alt="Proxyman response showing stop_reason tool_use and cache token counts"
              caption="Evidence 07 · The response pauses for tools and reports cache usage."
            />
          </div>
        </article>

        <article className="pmg-trace-card pmg-trace-card-final">
          <div className="pmg-trace-copy">
            <span>SECOND MATCH · RECORDING #214 · POST /v1/messages?beta=true</span>
            <h3>The harness returns both results</h3>
            <p>
              The next request contains the Bash and Glob <code>tool_result</code> blocks.
              Claude uses that new observation to write the visible summary.
            </p>
            <ActionGuide
              items={[
                {
                  label: "SEARCH REQUEST BODY",
                  content: <>Click inside <code>Request → Body</code>, press <code>Ctrl+F</code>, and type <code>tool_result</code>. Expect two matches—one result for each tool request.</>,
                },
                {
                  label: "SEARCH RESPONSE BODY",
                  content: <>Move to <code>Response → Body</code> and search for <code>end_turn</code>. This is the completion signal for the agent loop.</>,
                },
                {
                  label: "CROSS-CHECK CLAUDE",
                  content: <>The response text beside <code>end_turn</code> should match the final sentence visible in Claude.</>,
                },
              ]}
            />
            <dl>
              <dt>Request payload</dt><dd><code>tool_result × 2</code></dd>
              <dt>Response end state</dt><dd><code>stop_reason: end_turn</code></dd>
              <dt>What it means</dt><dd>The model received the observations and completed the task.</dd>
            </dl>
          </div>
          <Evidence
            src="/proxyman-evidence/11-tool-result-end-turn.jpg"
            alt="Proxyman request showing tool results and response showing end_turn"
            caption="Evidence 08 · Tool results return in the request; the response finishes the turn."
          />
        </article>

        <div className="pmg-conclusion">
          <span>WHAT THE CAPTURE PROVES</span>
          <h2>The agent is a loop, not one model call.</h2>
          <p>
            Claude produces structured tool requests. A local harness performs the actions,
            sends observations back, and lets the model continue. Proxyman makes each boundary
            visible: request, tool instruction, observation, cache accounting, and final stop.
          </p>
        </div>
      </section>

      <section className="pmg-ready">
        <span>READY CHECK</span>
        <h2>Five signals mean the capture worked</h2>
        <div>
          <p>✓ Proxyman is listening on port 9090</p>
          <p>✓ The certificate reads Installed &amp; Trusted</p>
          <p>✓ <code>api.anthropic.com</code> is enabled</p>
          <p>✓ <code>tool_use</code> and <code>tool_result</code> are readable</p>
          <p>✓ The second response ends with <code>end_turn</code></p>
        </div>
        <a className="pmg-primary pmg-light-button" href="/field-validation">Enter the Workshop →</a>
      </section>

      <footer className="pmg-footer">
        <b>PROXYMAN / FIELD GUIDE</b>
        <p>Official installer · narrow capture scope · workshop data · evidence-led explanation</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
