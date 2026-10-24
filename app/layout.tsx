import type { Metadata, Viewport } from "next";
import SiteChrome from "./components/SiteChrome";
import { LearnerThemeProvider } from "./components/LearnerThemeProvider";
import "./globals.css";

const siteUrl = "https://www.brainlabacademy.com.ng";
const previewImageUrl = "/opengraph-image";
const previewImageAlt =
  "BrainLab Academy learning and CBT practice for Nigerian students preparing for JAMB, WAEC and NECO.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BrainLab Academy | JAMB, WAEC & NECO CBT Practice",
    template: "%s | BrainLab Academy",
  },
  description:
    "Prepare for JAMB UTME, WAEC and NECO with CBT exam practice, syllabus-aligned lessons, AI-supported revision and a connected learning experience built for Nigerian students.",
  applicationName: "BrainLab Academy",
  keywords: [
    "BrainLab Academy",
    "JAMB CBT practice",
    "JAMB UTME past questions",
    "WAEC exam practice",
    "NECO exam preparation",
    "Nigerian students",
    "online CBT",
    "AI learning support",
    "secondary school learning",
  ],
  openGraph: {
    title: "BrainLab Academy | JAMB, WAEC & NECO CBT Practice",
    description:
      "Practise for Nigerian examinations, strengthen subject understanding and revise with BrainLab Academy's connected learning tools.",
    type: "website",
    siteName: "BrainLab Academy",
    locale: "en_NG",
    url: siteUrl,
    images: [
      {
        url: previewImageUrl,
        width: 1200,
        height: 630,
        alt: previewImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BrainLab Academy | JAMB, WAEC & NECO CBT Practice",
    description:
      "Practise for Nigerian examinations, strengthen subject understanding and revise with BrainLab Academy.",
    images: [
      {
        url: previewImageUrl,
        alt: previewImageAlt,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#012153",
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "BrainLab Academy",
  url: siteUrl,
  description:
    "Online examination practice and learning support for Nigerian students preparing for JAMB UTME, WAEC and NECO.",
  areaServed: {
    "@type": "Country",
    name: "Nigeria",
  },
  educationalLevel: "Secondary education",
};

const homepageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "BrainLab Academy | JAMB, WAEC & NECO CBT Practice",
  url: siteUrl,
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: new URL(previewImageUrl, siteUrl).toString(),
    width: 1200,
    height: 630,
    caption: previewImageAlt,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(homepageJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('brainlab-appearance');
                var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                var theme = isDark ? 'dark' : 'light';
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme;
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
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
        <LearnerThemeProvider>
          <SiteChrome>{children}</SiteChrome>
        </LearnerThemeProvider>
      </body>
    </html>
  );
}
