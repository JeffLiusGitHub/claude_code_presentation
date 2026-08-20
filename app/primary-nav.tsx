import styles from "./home.module.css";

type PrimaryNavProps = {
  brandHref?: string;
};

export default function PrimaryNav({ brandHref = "/#top" }: PrimaryNavProps) {
  return (
    <nav className={`${styles.nav} ${styles.primaryNav}`} aria-label="Primary navigation">
      <a className={styles.brand} href={brandHref} aria-label="Back to homepage">
        <span>INSIDE CLAUDE CODE</span>
        <b>REQUESTS, CONTEXT &amp; AGENT LOOPS</b>
      </a>
      <div className={styles.navLinks}>
        <a href="/proxyman-guide">Proxyman How-to</a>
        <a href="/field-validation">Workshop</a>
        <a href="/request-analyzer">Request Analyzer</a>
        <a className={styles.navCta} href="/presentation">
          Presentation <span>↗</span>
        </a>
      </div>
    </nav>
  );
}
