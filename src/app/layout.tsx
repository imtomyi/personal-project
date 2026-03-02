import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import GlobalShortcuts from "@/components/layout/GlobalShortcuts";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";
import InstallPrompt from "@/components/layout/InstallPrompt";
import PullToRefresh from "@/components/layout/PullToRefresh";
import ActivityTracker from "@/components/layout/ActivityTracker";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const siteUrl = "https://personal-project-alpha-six.vercel.app";
const siteTitle = "KHUDO - 쿠두";
const siteDescription = "시간표, 루틴, 가계부를 한 곳에서 관리하는 실시간 협업 생산성 앱";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  manifest: "/manifest.json",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "KHUDO",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KHUDO - 실시간 협업 생산성 앱",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KHUDO",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5856D6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ServiceWorkerRegister />
              <ActivityTracker />
              <GlobalShortcuts />
              <PullToRefresh>
                {children}
              </PullToRefresh>
              <InstallPrompt />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
