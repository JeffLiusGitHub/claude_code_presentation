import type { Metadata } from "next";

const title = "Proxyman 安装、CA 信任与第一次 HTTPS 抓包";
const description =
  "从官方下载到 Windows/macOS 安装、CA 信任、SSL Proxying、首次抓包与安全收尾的中文指南。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { card: "summary", title, description, images: [] },
};

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="pmg-external" href={href} target="_blank" rel="noreferrer">
    {children} <span aria-hidden="true">↗</span>
  </a>
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
      <nav className="pmg-nav" aria-label="Proxyman 指南导航">
        <a className="pmg-brand" href="#top">PROXYMAN / START</a>
        <div>
          <a href="#download">下载</a>
          <a href="#certificate">CA</a>
          <a href="#first-capture">第一次抓包</a>
          <a href="#troubleshooting">排错</a>
          <a className="pmg-back" href="/">返回演示</a>
        </div>
      </nav>

      <header className="pmg-hero" id="top">
        <div className="pmg-hero-copy">
          <span className="pmg-eyebrow">INSTALL · TRUST · CAPTURE · RESTORE</span>
          <h1>把 HTTPS<br />变成可读证据</h1>
          <p>
            一页完成 Proxyman 下载、安装、CA 信任、SSL 解密和第一次抓包。
            按目标域名最小化配置，结束后恢复系统代理。
          </p>
          <div className="pmg-actions">
            <a className="pmg-primary" href="#download">从下载开始 ↓</a>
            <ExternalLink href="https://proxyman.com/download">官方下载中心</ExternalLink>
          </div>
        </div>
        <aside className="pmg-hero-card">
          <span>预计时间</span>
          <strong>10–15 min</strong>
          <ol>
            <li><b>01</b> 安装应用</li>
            <li><b>02</b> 信任本机 CA</li>
            <li><b>03</b> 解密一个域名</li>
            <li><b>04</b> 检查并恢复代理</li>
          </ol>
          <small>适用于 Windows 10/11 与 macOS 12+</small>
        </aside>
      </header>

      <section className="pmg-mental" aria-labelledby="mental-title">
        <div>
          <span className="pmg-kicker">先理解再安装</span>
          <h2 id="mental-title">Proxyman 在网络链路的哪里？</h2>
          <p>
            它是运行在你电脑上的调试代理。应用先把请求交给 Proxyman；Proxyman 展示请求后，再与真实服务器建立连接。
          </p>
        </div>
        <div className="pmg-flow" aria-label="应用流量经过 Proxyman 到达 API 服务器">
          <div><span>YOUR APP</span><b>Claude / Browser / CLI</b></div>
          <i>→</i>
          <div className="pmg-flow-focus"><span>LOCAL PROXY</span><b>Proxyman :9090</b></div>
          <i>→</i>
          <div><span>SERVER</span><b>API / Website</b></div>
        </div>
        <div className="pmg-explain-grid">
          <article>
            <b>只开代理</b>
            <p>可以看到域名、连接和部分 HTTP 信息；HTTPS 正文仍然是加密的。</p>
          </article>
          <article>
            <b>代理 + 信任 CA</b>
            <p>Proxyman 可以为目标域名建立本机受信任的调试 TLS 连接，从而显示 HTTPS request/response。</p>
          </article>
          <article>
            <b>SSL Proxying 规则</b>
            <p>决定哪些域名可以被解密。推荐只加入实验所需域名，不要使用全局 <code>*</code>。</p>
          </article>
        </div>
      </section>

      <section className="pmg-section" id="download">
        <div className="pmg-section-head">
          <span className="pmg-kicker">STEP 01 · DOWNLOAD</span>
          <h2>从官方渠道下载</h2>
          <p>不要从第三方下载站获取安装包。企业电脑如有软件白名单，先按内部流程申请。</p>
        </div>
        <div className="pmg-download-grid">
          <article className="pmg-download-card pmg-windows">
            <span>WINDOWS 10 / 11</span>
            <h3>Proxyman for Windows</h3>
            <p>下载安装程序，完成向导后启动 Proxyman。首次运行可能请求网络或管理员权限。</p>
            <ExternalLink href="https://proxyman.com/windows">Windows 官方页面</ExternalLink>
          </article>
          <article className="pmg-download-card pmg-macos">
            <span>MACOS 12+</span>
            <h3>Proxyman for macOS</h3>
            <p>下载官方版本并移入 Applications；也可以使用 Homebrew 安装。</p>
            <code>brew install --cask proxyman</code>
            <ExternalLink href="https://proxyman.com/download">macOS 官方下载</ExternalLink>
          </article>
        </div>
        <div className="pmg-source-row">
          <span>官方参考</span>
          <ExternalLink href="https://docs.proxyman.com/">Proxyman Documentation</ExternalLink>
          <ExternalLink href="https://docs.proxyman.com/license">试用版与授权说明</ExternalLink>
        </div>
      </section>

      <section className="pmg-ca" id="certificate">
        <div className="pmg-section-head pmg-light-head">
          <span className="pmg-kicker">STEP 02 · CERTIFICATE</span>
          <h2>安装并信任 Proxyman CA</h2>
          <p>这是读取 HTTPS 正文的必要步骤，也是整套配置中安全影响最大的一步。</p>
        </div>

        <div className="pmg-ca-note">
          <b>CA 到底做了什么？</b>
          <p>
            HTTPS 原本阻止中间人读取内容。信任 Proxyman CA 后，你的电脑允许 Proxyman 为已启用 SSL Proxying 的域名签发临时证书。
            CA 由 Proxyman 在本机生成；信任范围只应保留在用于调试的设备上。
          </p>
          <strong>不要在不受控电脑上导入 CA，也不要把 CA 私钥或原始抓包文件发给他人。</strong>
        </div>

        <div className="pmg-os-columns">
          <div className="pmg-os-panel">
            <span className="pmg-os-label">WINDOWS</span>
            <Step number="1" title="打开证书安装入口">
              <p><code>Certificate → Install Certificate on this Windows…</code></p>
            </Step>
            <Step number="2" title="优先使用自动安装">
              <p>选择 <b>Install &amp; Trust</b>，在 Windows 权限提示中确认。完成后应看到已安装并信任的状态。</p>
            </Step>
            <Step number="3" title="没有管理员脚本权限时手动安装">
              <p>关闭 Proxyman，打开本机生成的证书：</p>
              <code className="pmg-path">%APPDATA%\Proxyman\certificate\certs\ca.cer</code>
              <p>选择 <b>Current User</b>，并放入 <b>Trusted Root Certification Authorities</b>。</p>
            </Step>
            <ExternalLink href="https://docs.proxyman.com/proxyman-windows/install-certificate">Windows CA 官方步骤</ExternalLink>
          </div>

          <div className="pmg-os-panel">
            <span className="pmg-os-label">MACOS</span>
            <Step number="1" title="打开证书安装入口">
              <p><code>Certificate → Install Certificate on this Mac…</code></p>
            </Step>
            <Step number="2" title="使用 Automatic Mode">
              <p>输入 Mac 管理员密码，让 Proxyman 生成证书并加入 System Keychain。</p>
            </Step>
            <Step number="3" title="检查信任状态">
              <p>按钮应显示 <b>Installed &amp; Trusted</b>。自动模式失败时，在 Manual 标签生成证书，再到 Keychain Access 中设为 <b>Always Trust</b>。</p>
            </Step>
            <ExternalLink href="https://docs.proxyman.com/debug-devices/macos">macOS CA 官方步骤</ExternalLink>
          </div>
        </div>
      </section>

      <section className="pmg-section" id="first-capture">
        <div className="pmg-section-head">
          <span className="pmg-kicker">STEP 03 · FIRST CAPTURE</span>
          <h2>完成第一次 HTTPS 抓包</h2>
          <p>先用一个容易识别的请求验证链路，再把方法应用到 Claude、浏览器或自己的应用。</p>
        </div>

        <div className="pmg-capture-steps">
          <Step number="01" title="确认 Proxyman 正在监听">
            <p>顶部应显示正在捕获。打开 <code>Setup → Manual Setup</code>，记下代理地址和端口；常见端口为 <b>9090</b>。</p>
          </Step>
          <Step number="02" title="让目标应用经过代理">
            <p>桌面应用通常跟随系统 HTTP/HTTPS Proxy。CLI、Node.js、Python 等程序可能忽略系统代理，需要使用 Proxyman 的 Automatic/Manual Setup 或为该进程配置代理和 CA。</p>
            <ExternalLink href="https://docs.proxyman.com/automatic-setup/manual-setup">CLI / Node / Python Manual Setup</ExternalLink>
          </Step>
          <Step number="03" title="制造一条可识别的请求">
            <p>在浏览器中打开带唯一 marker 的测试地址：</p>
            <a className="pmg-test-url" href="https://httpbin.org/get?proxyman_test=first_capture" target="_blank" rel="noreferrer">
              https://httpbin.org/get?proxyman_test=first_capture ↗
            </a>
          </Step>
          <Step number="04" title="只为目标域名开启 SSL Proxying">
            <p>在左侧域名或请求上右键，选择 <b>Enable SSL Proxying</b>。也可以打开 SSL Proxying List，加入精确域名。</p>
            <ExternalLink href="https://docs.proxyman.com/basic-features/ssl-proxying">SSL Proxying 官方说明</ExternalLink>
          </Step>
          <Step number="05" title="重新发送并检查证据">
            <p>再次打开测试地址。成功时可以看到 method、URL、headers，以及可读的 request/response body。用 Filter 搜索 <code>proxyman_test</code> 验证定位能力。</p>
          </Step>
        </div>

        <div className="pmg-claude-tip">
          <div>
            <span>CLAUDE / AGENT TIP</span>
            <h3>用唯一 marker 连接 UI 与流量</h3>
          </div>
          <p>
            在提示词中加入诸如 <code>PROXYMAN_TEST_20260819</code> 的唯一字符串，再使用 Request Body 过滤。
            如果 Claude 使用企业 Gateway，应给实际观察到的 Gateway 域名开启 SSL Proxying，而不只是预设 <code>api.anthropic.com</code>。
          </p>
        </div>
      </section>

      <section className="pmg-safety">
        <div>
          <span className="pmg-kicker">STEP 04 · SAFE EXIT</span>
          <h2>结束时恢复网络</h2>
        </div>
        <ol>
          <li><b>01</b><span>Pause / Stop Recording，停止继续收集流量。</span></li>
          <li><b>02</b><span>关闭系统代理覆盖；如果用的是临时终端，直接关闭该终端。</span></li>
          <li><b>03</b><span>删除不再需要的 SSL Proxying 域名规则，尤其是通配符。</span></li>
          <li><b>04</b><span>长期不使用时，重置或卸载 Proxyman Root CA。</span></li>
        </ol>
        <div className="pmg-warning">
          <b>原始 HAR 不是普通日志</b>
          <p>它可能包含 Authorization、Cookie、完整 prompt、聊天记录、工具输入和文件片段。分享前必须脱敏；演示时优先展示裁剪后的 Body 截图。</p>
        </div>
      </section>

      <section className="pmg-section pmg-troubleshooting" id="troubleshooting">
        <div className="pmg-section-head">
          <span className="pmg-kicker">TROUBLESHOOTING</span>
          <h2>看不到流量时，按这个顺序检查</h2>
        </div>
        <div className="pmg-faq-grid">
          <details open>
            <summary>完全没有请求</summary>
            <p>确认正在 Recording；检查系统 HTTP/HTTPS Proxy 是否指向 Proxyman 的地址与端口；VPN 或企业代理可能覆盖系统设置。</p>
          </details>
          <details>
            <summary>只能看到 CONNECT，看不到 Body</summary>
            <p>确认 CA 已安装并信任，并为目标域名开启 SSL Proxying。第一次启用后需要重新发送请求。</p>
          </details>
          <details>
            <summary>浏览器有流量，Node/Python 没有</summary>
            <p>这些运行库可能不跟随系统代理，使用 Automatic/Manual Setup，或按该运行库要求设置代理与证书信任。</p>
          </details>
          <details>
            <summary>出现 TLS / SSL 错误</summary>
            <p>先检查 CA 信任；如果应用使用 SSL pinning，即使系统信任 CA 也可能拒绝调试证书。不要尝试绕过你无权测试的应用。</p>
          </details>
          <details>
            <summary>Proxyman 变慢或内存很高</summary>
            <p>删除 <code>*</code> 或整个浏览器级别的 SSL 解密规则，只保留需要观察的精确域名。</p>
          </details>
          <details>
            <summary>退出后网络异常</summary>
            <p>检查系统代理是否仍指向 Proxyman；关闭 Override Windows Proxy 或完全退出 Proxyman，再恢复原来的企业/VPN 代理设置。</p>
          </details>
        </div>
        <div className="pmg-source-row">
          <span>继续排错</span>
          <ExternalLink href="https://docs.proxyman.com/troubleshooting/i-couldnt-see-any-traffics-on-proxyman">没有捕获到流量</ExternalLink>
          <ExternalLink href="https://docs.proxyman.com/troubleshooting/get-ssl-error-from-https-request-and-response">SSL 错误</ExternalLink>
        </div>
      </section>

      <section className="pmg-ready">
        <span>READY CHECK</span>
        <h2>看到这 5 项，就可以开始 Workshop</h2>
        <div>
          <p>✓ Proxyman 正在 Recording</p>
          <p>✓ 目标应用流量经过本机代理</p>
          <p>✓ CA 显示 Installed &amp; Trusted</p>
          <p>✓ 只为目标域名启用 SSL Proxying</p>
          <p>✓ 可以读取 HTTPS request 与 response body</p>
        </div>
        <a className="pmg-primary pmg-light-button" href="/">进入 Agent Context Workshop →</a>
      </section>

      <footer className="pmg-footer">
        <b>PROXYMAN / START</b>
        <p>最小化解密范围 · 使用测试数据 · 分享前脱敏 · 结束后恢复代理</p>
        <a href="#top">返回顶部 ↑</a>
      </footer>
    </main>
  );
}
