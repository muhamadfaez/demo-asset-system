import { prisma } from "@/lib/prisma";
import { iconSizes, validateAppIcon } from "@/lib/app-icons";
import { getD1Binding } from "@/lib/cloudflare-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!iconSizes.some((allowed) => allowed === size)) return new Response("Not found", { status: 404 });
  try {
    const binding = getD1Binding();
    const row = binding
      ? await binding.prepare("SELECT value FROM SystemSetting WHERE key = ?").bind(`appIcon${size}`).first<{ value: string }>()
      : await prisma.systemSetting.findUnique({ where: { key: `appIcon${size}` } });
    if (row?.value && validateAppIcon(row.value, size)) {
      return new Response(new Uint8Array(Buffer.from(row.value.slice(22), "base64")), {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300, must-revalidate", "X-Content-Type-Options": "nosniff" }
      });
    }
  } catch (error) {
    console.error("Unable to load app icon", error);
  }
  return Response.redirect(new URL(`/icons/icon-${size}.png`, request.url), 307);
}
