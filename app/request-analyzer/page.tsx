import type { Metadata } from "next";
import RequestAnalyzer from "./request-analyzer";

const title = "Request Token Explorer · Claude Context Learning Lab";
const description = "在浏览器本地拆解 Claude Request，查看 System、Tools、Messages 与 Token 构成。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { card: "summary", title, description, images: [] },
};

export default function RequestAnalyzerPage() {
  return <RequestAnalyzer />;
}
