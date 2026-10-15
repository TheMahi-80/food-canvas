import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import { messages } from "@/lib/i18n";
import { resolveSiteUrl } from "@/lib/seo/site-url";
import { SERVER_DEFAULT_THEME, themeInitScript } from "@/lib/theme";
import "./globals.css";

const latin = Inter({
  variable: "--font-latin",
  subsets: ["latin"],
  display: "swap",
});

const bangla = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  // Without a known domain (local dev) relative URLs are kept rather than pointing at localhost.
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  title: {
    default: messages.meta.defaultTitle,
    template: `%s | ${messages.meta.siteName}`,
  },
  description: messages.meta.description,
  applicationName: messages.meta.siteName,
  openGraph: {
    type: "website",
    locale: "bn_BD",
    siteName: messages.meta.siteName,
    title: messages.meta.defaultTitle,
    description: messages.meta.description,
    // Image: app/opengraph-image.tsx (the logo on the brand background).
  },
  twitter: { card: "summary_large_image", title: messages.meta.defaultTitle, description: messages.meta.description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bn"
      data-theme={SERVER_DEFAULT_THEME}
      suppressHydrationWarning
      className={`${latin.variable} ${bangla.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {messages.a11y.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
