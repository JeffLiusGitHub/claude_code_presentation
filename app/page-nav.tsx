import type { ReactNode } from "react";
import styles from "./home.module.css";

export type PageNavItem = {
  href: string;
  label: string;
  cta?: boolean;
};

type PageNavProps = {
  label: string;
  detail: string;
  ariaLabel: string;
  items?: PageNavItem[];
  brandHref?: string;
  children?: ReactNode;
};

export default function PageNav({
  label,
  detail,
  ariaLabel,
  items = [],
  brandHref = "#top",
  children,
}: PageNavProps) {
  return (
    <nav className={`${styles.nav} ${styles.secondaryNav}`} aria-label={ariaLabel}>
      <a className={styles.brand} href={brandHref}>
        <span>{label}</span>
        <b>{detail}</b>
      </a>
      <div className={styles.navLinks}>
        {items.map((item) => (
          <a className={item.cta ? styles.navCta : undefined} href={item.href} key={`${item.href}-${item.label}`}>
            {item.label}{item.cta ? <span aria-hidden="true">↗</span> : null}
          </a>
        ))}
        {children}
      </div>
    </nav>
  );
}
