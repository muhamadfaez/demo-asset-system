import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const assetRoot = resolve(".open-next/assets");
const result = await build({
  entryPoints: ["static-transfers/main.tsx"],
  bundle: true,
  minify: true,
  write: false,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "static-navigation",
      setup(build) {
        build.onResolve(
          { filter: /^next\/(navigation|link|image)$/ },
          (args) => ({ path: args.path, namespace: "static-next" }),
        );
        build.onLoad({ filter: /.*/, namespace: "static-next" }, (args) => ({
          contents:
            args.path === "next/navigation"
              ? 'export { useRouter, usePathname } from "./static-transfers/navigation";'
              : `export { ${args.path === "next/link" ? "Link" : "Image"} as default } from "./static-transfers/navigation";`,
          resolveDir: process.cwd(),
          loader: "tsx",
        }));
        build.onResolve({ filter: /components\/logout-button$/ }, () => ({
          path: resolve("static-transfers/logout.tsx"),
        }));
      },
    },
  ],
});
const js = result.outputFiles[0].contents;
const hash = createHash("sha256").update(js).digest("hex").slice(0, 16);
const jsPath = `/_static/transfers-${hash}.js`;
await mkdir(resolve(assetRoot, "_static"), { recursive: true });
await writeFile(resolve(assetRoot, `.${jsPath}`), js);
// Use the same compiled stylesheet as Next: the mobile fixes stay shared.
const manifest = JSON.parse(
  await readFile(".next/app-build-manifest.json", "utf8"),
);
const css = [
  ...new Set(
    Object.values(manifest.pages)
      .flat()
      .filter((file) => file.endsWith(".css")),
  ),
];
if (!css.length) throw new Error("Missing shared CSS in the Next build");
await writeFile(
  resolve(assetRoot, "transfers.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#009a97"><title>Asset Transfers</title><link rel="manifest" href="/manifest.webmanifest">${css.map((file) => `<link rel="stylesheet" href="/_next/${file}">`).join("")}</head><body><div id="transfers-app"><p style="padding:24px;font-family:system-ui" role="status">Loading your transfers…</p></div><noscript>Enable JavaScript to securely load your transfers.</noscript><script type="module" src="${jsPath}"></script></body></html>`,
);
// Asset responses must never contain authenticated records. HTML revalidates;
// content-addressed JS is safe to keep for a year.
await writeFile(
  resolve(assetRoot, "_headers"),
  `/sw.js\n  Content-Type: application/javascript; charset=utf-8\n  Cache-Control: no-cache, no-store, must-revalidate\n  Service-Worker-Allowed: /\n/transfers\n  Cache-Control: public, max-age=0, must-revalidate\n/_static/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
);
console.log(
  `Static transfers shell built (${Math.round(js.length / 1024)} KiB JS); no private data embedded.`,
);
