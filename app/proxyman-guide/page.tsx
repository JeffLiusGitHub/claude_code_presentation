import type { Metadata } from "next";
import Image from "next/image";
import PageNav from "../page-nav";
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
      <Image src={src} alt={alt} width={2100} height={1342} loading="eager" unoptimized />
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

export default function ProxymanGuide() {
  return (
    <main className="pmg-page">
      <PrimaryNav />
      <PageNav
        label="PROXYMAN"
        detail="SETUP & CAPTURE GUIDE"
        ariaLabel="Proxyman guide navigation"
        items={[
          { href: "#install", label: "Install" },
          { href: "#configure", label: "Configure" },
          { href: "#task", label: "Run the task" },
          { href: "#trace", label: "Read the trace" },
          { href: "/field-validation", label: "Workshop", cta: true },
        ]}
      />

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
            <Evidence
              src="/proxyman-evidence/04-installer-running.jpg"
              alt="Proxyman installer running on Windows"
              caption="Evidence 02 · The Windows setup wizard is running."
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
              <strong>Success looks like:</strong>
              <p>Proxyman reports that it is listening and new application traffic appears in the left-hand list.</p>
            </div>
            <Evidence
              src="/proxyman-evidence/05-proxyman-listening-9090.jpg"
              alt="Proxyman manual setup showing listening port 9090"
              caption="Evidence 03 · The local proxy is listening on port 9090."
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
              <strong>Success looks like:</strong>
              <p>The Proxyman certificate panel reads <b>Installed &amp; Trusted</b>.</p>
            </div>
            <Evidence
              src="/proxyman-evidence/06-certificate-installed-trusted.jpg"
              alt="Proxyman certificate panel showing Installed and Trusted"
              caption="Evidence 04 · Windows trusts the Proxyman root certificate."
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
              <strong>Success looks like:</strong>
              <p>The host is enabled in the list and new <code>POST /v1/messages</code> bodies are readable.</p>
            </div>
            <Evidence
              src="/proxyman-evidence/07-ssl-proxying-api-anthropic.jpg"
              alt="Proxyman SSL Proxying list with api.anthropic.com enabled"
              caption="Evidence 05 · SSL Proxying is enabled for api.anthropic.com."
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
          caption="Evidence 06 · Claude ran the requested tools and returned a one-sentence summary."
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

        <div className="pmg-trace-flow" aria-label="Two-request agent loop">
          <div><span>REQUEST #202</span><b>Prompt + tools</b><small>response: tool_use</small></div>
          <i>→</i>
          <div className="pmg-trace-tool"><span>LOCAL HARNESS</span><b>Bash + Glob</b><small>collect results</small></div>
          <i>→</i>
          <div><span>REQUEST #214</span><b>tool_result × 2</b><small>response: end_turn</small></div>
        </div>

        <article className="pmg-trace-card">
          <div className="pmg-trace-copy">
            <span>REQUEST #202 · POST /v1/messages?beta=true</span>
            <h3>Claude asks for Bash and Glob</h3>
            <p>
              The streaming response contains two <code>tool_use</code> blocks. This proves
              the model requested tool actions; it did not execute them inside the model.
            </p>
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
              caption="Evidence 07 · Two tool requests appear in the response stream."
            />
            <Evidence
              src="/proxyman-evidence/10-stop-reason-tool-use-cache.jpg"
              alt="Proxyman response showing stop_reason tool_use and cache token counts"
              caption="Evidence 08 · The response pauses for tools and reports cache usage."
            />
          </div>
        </article>

        <article className="pmg-trace-card pmg-trace-card-final">
          <div className="pmg-trace-copy">
            <span>REQUEST #214 · POST /v1/messages?beta=true</span>
            <h3>The harness returns both results</h3>
            <p>
              The next request contains the Bash and Glob <code>tool_result</code> blocks.
              Claude uses that new observation to write the visible summary.
            </p>
            <dl>
              <dt>Request payload</dt><dd><code>tool_result × 2</code></dd>
              <dt>Response end state</dt><dd><code>stop_reason: end_turn</code></dd>
              <dt>What it means</dt><dd>The model received the observations and completed the task.</dd>
            </dl>
          </div>
          <Evidence
            src="/proxyman-evidence/11-tool-result-end-turn.jpg"
            alt="Proxyman request showing tool results and response showing end_turn"
            caption="Evidence 09 · Tool results return in the request; the response finishes the turn."
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
        <a className="pmg-primary pmg-light-button" href="/presentation">Open the presentation →</a>
      </section>

      <footer className="pmg-footer">
        <b>PROXYMAN / FIELD GUIDE</b>
        <p>Official installer · narrow capture scope · workshop data · evidence-led explanation</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
