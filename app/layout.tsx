import type { Metadata, Viewport } from "next";
import { getLoginSettings } from "@/lib/settings";
import { appIconUrl } from "@/lib/app-icons";
import { PwaProvider } from "@/components/pwa-client";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getLoginSettings();
  return {
    title: settings.systemName,
    description: settings.pwaDescription,
    applicationName: settings.pwaName,
    manifest: settings.pwaEnabled === "true" ? "/manifest.webmanifest" : undefined,
    appleWebApp: { capable: settings.pwaEnabled === "true", title: settings.pwaShortName, statusBarStyle: "default" },
    icons: { icon: [{ url: appIconUrl(192, settings.appIconVersion), type: "image/png" }], apple: [{ url: appIconUrl(180, settings.appIconVersion), sizes: "180x180", type: "image/png" }] }
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getLoginSettings();
  return { themeColor: settings.pwaThemeColor, width: "device-width", initialScale: 1, viewportFit: "cover" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getLoginSettings();
  return (
    <html lang="en" suppressHydrationWarning>
      <body><PwaProvider enabled={settings.pwaEnabled === "true"}>{children}</PwaProvider></body>
    </html>
  );
}
