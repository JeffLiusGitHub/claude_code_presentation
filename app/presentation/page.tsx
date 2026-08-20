import type { Metadata } from "next";
import InteractivePresentation from "../interactive-presentation";

const title = "What Happens After You Press Send in Claude Code?";
const description =
  "An interactive, full-screen anatomy of a Claude Code request — from model and harness to tools, cache, memory and subagents.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { card: "summary", title, description, images: [] },
};

export default function PresentationPage() {
  return <InteractivePresentation />;
}
