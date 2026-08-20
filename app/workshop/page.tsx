import PageNav from "../page-nav";
import PrimaryNav from "../primary-nav";
import ContextLabContent from "./context-lab-content";

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
