import type { Metadata, Viewport } from "next";
import SiteChrome from "./components/SiteChrome";
import { LearnerThemeProvider } from "./components/LearnerThemeProvider";
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
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "BrainLab Academy",
    description:
      "Learn smarter, practise with purpose and grow beyond the exam.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/brainlab-mark.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/brainlab-mark.svg",
    apple: "/apple-touch-icon.png",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('brainlab-appearance');
                var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                var theme = isDark ? 'dark' : 'light';
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme;
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="absolute left-3 top-[-60px] z-50 rounded-lg bg-[#012153] px-4 py-3 text-white focus:top-3"
        >
          Skip to content
        </a>
        <LearnerThemeProvider><SiteChrome>{children}</SiteChrome></LearnerThemeProvider>
      </body>
    </html>
  );
}
