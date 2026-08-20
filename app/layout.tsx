import type { Metadata } from "next";
import "./globals.css";

const title = "Claude Context Learning Lab · Presentation, Proxyman & Workshop";
const description =
  "Understand a Claude Code request in the interactive presentation, inspect it with Proxyman, then validate it in the hands-on workshop.";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
