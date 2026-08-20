import type { Metadata } from "next";
import PageNav from "../page-nav";
import PrimaryNav from "../primary-nav";
import ContextLabContent from "./context-lab-content";

const title = "Claude Context Lab · Reference & Evidence";
const description =
  "Review the talk outline, capture evidence, and inspect Claude Code context with practical reference material.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { card: "summary", title, description, images: [] },
};

export default function ContextLabPage() {
  return (
    <>
      <PrimaryNav />
      <PageNav
        label="CONTEXT LAB"
        detail="REFERENCE & EVIDENCE"
        ariaLabel="Context Lab navigation"
        items={[
          { href: "#deck", label: "Talk outline" },
          { href: "#videos", label: "Videos" },
          { href: "#proxyman", label: "Captures" },
          { href: "/request-analyzer", label: "Request Analyzer" },
          { href: "/presentation", label: "Presentation", cta: true },
        ]}
      />
      <ContextLabContent />
    </>
  );
}
