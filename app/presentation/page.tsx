import type { Metadata } from "next";
import InteractivePresentation from "../interactive-presentation";

export const metadata: Metadata = {
  title: "What Happens After You Press Send in Claude Code?",
  description:
    "An interactive, full-screen anatomy of a Claude Code request — from model and harness to tools, cache, memory and subagents.",
};

export default function PresentationPage() {
  return <InteractivePresentation />;
}
