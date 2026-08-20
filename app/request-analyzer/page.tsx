import type { Metadata } from "next";
import RequestAnalyzer from "./request-analyzer";

const title = "Request Token Explorer · Claude Context Learning Lab";
const description = "Inspect Claude Request anatomy locally in your browser, including System, Tools, Messages, and token composition.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { card: "summary", title, description, images: [] },
};

export default function RequestAnalyzerPage() {
  return <RequestAnalyzer />;
}
