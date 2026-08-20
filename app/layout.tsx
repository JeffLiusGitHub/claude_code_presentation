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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
