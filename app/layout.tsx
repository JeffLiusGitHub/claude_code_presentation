import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Claude Context Learning Lab · 从 Presentation 到 Workshop";
const description =
  "先用互动 Presentation 看懂 Claude Code 请求，再用 Proxyman 检查真实流量，最后进入动手 Workshop。";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.DEPLOY_PRIME_URL ??
      process.env.URL ??
      "https://agent-context-proxyman-guide.jeffliujeffliu.chatgpt.site",
  ),
  title,
  description,
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { type: "website", title, description, images: [{ url: "/og.png" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
