import { getLoginSettings } from "@/lib/settings";
import { appIconUrl } from "@/lib/app-icons";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getLoginSettings();
  if (settings.pwaEnabled !== "true") return new Response("App installation is disabled", { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json({
    id: "/",
    name: settings.pwaName,
    short_name: settings.pwaShortName,
    description: settings.pwaDescription,
    lang: "en",
    start_url: "/dashboard",
    scope: "/",
    display: settings.pwaDisplay,
    orientation: settings.pwaOrientation,
    theme_color: settings.pwaThemeColor,
    background_color: settings.pwaBackgroundColor,
    categories: ["business", "productivity"],
    icons: [192, 512].flatMap((size) => [
      { src: appIconUrl(size, settings.appIconVersion), sizes: `${size}x${size}`, type: "image/png", purpose: "any" },
      { src: appIconUrl(size, settings.appIconVersion), sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" }
    ]),
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "Assets", url: "/assets" },
      { name: "Search", url: "/search" }
    ]
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } });
}
