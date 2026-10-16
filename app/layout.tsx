import type { Metadata, Viewport } from "next";
import SiteChrome from "./components/SiteChrome";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "BrainLab Academy | Learn Smarter. Practise with Purpose.",
    template: "%s | BrainLab Academy",
  },
  description:
    "Prepare for examinations, strengthen your understanding and keep progressing with BrainLab Academy's connected learning vision and existing CBT practice portal.",
  applicationName: "BrainLab Academy",
  openGraph: {
    title: "BrainLab Academy",
    description:
      "Learn smarter, practise with purpose and grow beyond the exam.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BrainLab Academy",
    description:
      "Learn smarter, practise with purpose and grow beyond the exam.",
  },
};

export const viewport: Viewport = {
  themeColor: "#012153",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased">
        <a
          href="#main"
          className="absolute left-3 top-[-60px] z-50 rounded-lg bg-[#012153] px-4 py-3 text-white focus:top-3"
        >
          Skip to content
        </a>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
