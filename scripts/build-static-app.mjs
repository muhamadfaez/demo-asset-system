import { build } from "esbuild";
import ts from "typescript";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { createHash } from "node:crypto";
import { Prisma, $Enums } from "@prisma/client";

const root = process.cwd();
const generated = resolve(".edge-app");
await mkdir(generated, { recursive: true });
await mkdir(resolve(generated,"views"), { recursive: true });
const norm = (path) => relative(root, path).replaceAll("\\", "/");
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else result.push(path);
  }
  return result;
}
const appFiles = await files("app");
const pages = appFiles.filter(
  (path) =>
    (path.endsWith("page.tsx") || path.endsWith("not-found.tsx")) &&
    !path.includes("transfers"),
);
const actionFiles = appFiles.filter(
  (path) => path.endsWith("actions.ts") && !path.includes("transfers"),
);
const routeFiles = appFiles.filter(
  (path) =>
    path.endsWith("route.ts") &&
    !/[\\/](auth|qr|reports|transfers|search)[\\/]/.test(path),
);
const pathOf = (path) =>
  path.endsWith("app/not-found.tsx") || path.endsWith("app\\not-found.tsx")
    ? "/not-found"
    : "/" +
      norm(path)
        .replace(/^app\//, "")
        .replace(/\([^/]+\)\//g, "")
        .replace(/\/(page\.tsx|route\.ts)$/, "")
        .replace(/^page\.tsx$/, "");
const exportsOf = (source) => {
  const ast = ts.createSourceFile(
    "module.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  return ast.statements.flatMap((node) =>
    node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
    !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      ? ts.isFunctionDeclaration(node) && node.name
        ? [node.name.text]
        : ts.isVariableStatement(node)
          ? node.declarationList.declarations
              .filter((d) => ts.isIdentifier(d.name))
              .map((d) => d.name.text)
          : []
      : [],
  );
};
const clients = new Map();
const icons = new Set();
const actionNames = new Map();
for (const path of actionFiles)
  actionNames.set(norm(path), exportsOf(await readFile(path, "utf8")));
const entry = [
  'import "../edge/warmup";',
  'import { createApplication } from "../edge/app-handler";',
  'import { handlers } from "original-auth";',
  'import { getSystemSettings } from "../lib/settings";',
  'import { getUnreadNotificationCount } from "../lib/notification-count";',
  ...pages.map((path, i) => `import P${i} from ${JSON.stringify(path)};`),
  ...actionFiles.map(
    (path, i) => `import * as A${i} from ${JSON.stringify(path)};`,
  ),
  ...routeFiles.map(
    (path, i) => `import * as R${i} from ${JSON.stringify(path)};`,
  ),
  `export default createApplication({${pages.map((p, i) => `${JSON.stringify(pathOf(p))}:P${i}`).join(",")}}, {${actionFiles.flatMap((p, i) => actionNames.get(norm(p)).map((name) => `${JSON.stringify(norm(p) + "#" + name)}:A${i}.${name}`)).join(",")}}, {${routeFiles.map((p, i) => `${JSON.stringify(pathOf(p))}:R${i}`).join(",")}}, handlers, getSystemSettings, getUnreadNotificationCount);`,
].join("\n");
await writeFile(resolve(generated, "server-entry.mjs"), entry);
const allIcons = await iconImports();
const aliases = {
  "@/lib/asset-audit-log": "edge/paged-audit-log.ts",
  "@/lib/prisma": "edge/d1-repository.ts",
  "@/lib/auth": "edge/app-context.ts",
  "@/lib/current-user": "edge/app-context.ts",
  "@opennextjs/cloudflare": "edge/app-context.ts",
  "next/navigation": "edge/app-context.ts",
  "next/cache": "edge/app-context.ts",
  "next/server": "edge/next-response.ts",
  react: "edge/server-react.ts",
  "react/jsx-runtime": "edge/ui-runtime.ts",
  "next-auth": "edge/core-auth.ts",
};
await build({
  entryPoints: [resolve(generated, "server-entry.mjs")],
  outfile: resolve(generated, "app-handler.mjs"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  minify: true,
  jsx: "automatic",
  mainFields: ["module", "main"],
  conditions: ["workerd", "worker", "browser"],
  external: ["node:*", "cloudflare:*"],
  plugins: [
    {
      name: "native-server",
      setup(build) {
        build.onResolve({ filter: /^original-auth$/ }, () => ({
          path: resolve("lib/auth.ts"),
          namespace: "original-auth",
        }));
        build.onLoad(
          { filter: /.*/, namespace: "original-auth" },
          async (args) => ({
            contents: await readFile(args.path, "utf8"),
            resolveDir: resolve("lib"),
            loader: "ts",
          }),
        );
        build.onResolve({ filter: /.*/ }, (args) =>
          aliases[args.path]
            ? { path: resolve(aliases[args.path]) }
            : undefined,
        );
        build.onResolve({ filter: /^@prisma\/client$/ }, () => ({
          path: "prisma-enums",
          namespace: "native-enums",
        }));
        build.onLoad({ filter: /.*/, namespace: "native-enums" }, () => ({
          contents:
            Object.entries($Enums)
              .map(
                ([name, values]) =>
                  `export const ${name}=${JSON.stringify(values)};`,
              )
              .join("\n") +
            `\nimport {RepositoryError} from ${JSON.stringify(resolve("edge/d1-repository.ts"))};export const Prisma={PrismaClientKnownRequestError:RepositoryError};`,
          resolveDir: root,
          loader: "js",
        }));
        build.onResolve(
          { filter: /^(lucide-react|next\/link|next\/image)$/ },
          (args) => ({ path: args.path, namespace: "client-reference" }),
        );
        build.onLoad(
          { filter: /.*/, namespace: "client-reference" },
          (args) => {
            // Gather the symbols from all sources, so computed icon props stay explicit references.
            const names =
              args.path === "lucide-react" ? [...allIcons] : ["default"];
            if (args.path === "lucide-react")
              names.forEach((n) => icons.add(n));
            return {
              contents:
                `import {clientReference} from ${JSON.stringify(resolve("edge/ui-runtime.ts"))};\n` +
                names
                  .map((name) =>
                    name === "default"
                      ? `export default clientReference(${JSON.stringify(args.path + "#default")});`
                      : `export const ${name}=clientReference(${JSON.stringify(args.path + "#" + name)});`,
                  )
                  .join("\n"),
              resolveDir: root,
            };
          },
        );
        build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
          if (args.path.includes("node_modules")) return;
          let source = await readFile(args.path, "utf8");
          const id = norm(args.path);
          if (/^[\s]*["']use client["']/.test(source)) {
            const names = exportsOf(source);
            clients.set(id, names);
            return {
              contents:
                `import {clientReference} from ${JSON.stringify(resolve("edge/ui-runtime.ts"))};\n` +
                names
                  .map(
                    (name) =>
                      `export const ${name}=clientReference(${JSON.stringify(id + "#" + name)});`,
                  )
                  .join("\n"),
              loader: "ts",
              resolveDir: root,
            };
          }
          // Defer pure view functions (tables, cards, charts and status rows) to
          // browser React. The Worker retains only data loading and permission logic.
          if ((id.startsWith('app/') || id.startsWith('components/')) && !actionNames.has(id)) {
            const ast = ts.createSourceFile(args.path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
            const pure = ast.statements.filter(node => {
              if (!ts.isFunctionDeclaration(node) || !node.name || node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)) return false;
              let jsx = false;const visit=n=>{if(ts.isJsxElement(n)||ts.isJsxSelfClosingElement(n)||ts.isJsxFragment(n))jsx=true;ts.forEachChild(n,visit)};visit(node);return jsx;
            });
            if(pure.length) {
              const viewPath = '.edge-app/views/' + createHash('sha256').update(id).digest('hex').slice(0,16)+'.tsx';
              const names = pure.map(node=>node.name.text);
              const kept = ast.statements.filter(node=>!(ts.isFunctionDeclaration(node) && node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)));
              let browserSource = kept.map(node=>{
                if(ts.isImportDeclaration(node) && node.moduleSpecifier.text.startsWith('.')) {
                  const original=node.getText(ast);return original.replace(node.moduleSpecifier.getText(ast),JSON.stringify(resolve(dirname(args.path),node.moduleSpecifier.text)));
                }
                return node.getText(ast);
              }).join('\n');
              const alreadyExported = new Set(pure.filter(node=>node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword) && !node.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword)).map(node=>node.name.text));
              browserSource += '\nexport {' + names.filter(name=>!alreadyExported.has(name)).join(',') + '};';
              await writeFile(resolve(viewPath),browserSource);
              clients.set(viewPath,names);
              for(const node of [...pure].reverse()) {
                const name=node.name.text;const isDefault=node.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword);const exported=node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);
                const code=`${exported&&!isDefault?'export ':''}const ${name}=__viewReference(${JSON.stringify(viewPath+'#'+name)});${isDefault?'export default '+name+';':''}`;
                source=source.slice(0,node.getStart(ast))+code+source.slice(node.end);
              }
              source = `import {clientReference as __viewReference} from ${JSON.stringify(resolve('edge/ui-runtime.ts'))};\n`+source;
            }
          }
          if (id === "app/login/page.tsx")
            source = source.replace(
              /action=\{async \(\) => \{[\s\S]*?\n\s*\}\}/,
              'action={Object.assign(function(){}, { $action: "$login" })}',
            );
          if (actionNames.has(id))
            source +=
              "\n" +
              actionNames
                .get(id)
                .map(
                  (name) =>
                    `Object.assign(${name},{$action:${JSON.stringify(id + "#" + name)}});`,
                )
                .join("\n");
          return {
            contents: source,
            loader: args.path.endsWith("tsx")
              ? "tsx"
              : args.path.endsWith("ts")
                ? "ts"
                : "js",
            resolveDir: resolve(args.path, ".."),
          };
        });
      },
    },
  ],
});

// Browser registry contains only explicitly tagged client components/actions.
const registry =
  'import { lazy } from "react";\nimport * as icons from "lucide-react";\nimport { Link, Image } from "../static-transfers/navigation";\nexport const registry = {' +
  [...clients]
    .flatMap(([path, names]) =>
      names.map(
        (name) =>
          `${JSON.stringify(path + "#" + name)}:lazy(()=>import(${JSON.stringify(resolve(path))}).then(module=>({default:module.${name}})))`,
      ),
    )
    .concat(
      [...icons].map(
        (name) => `${JSON.stringify("lucide-react#" + name)}:icons.${name}`,
      ),
      ['"next/link#default":Link', '"next/image#default":Image'],
    )
    .join(",") +
  "};";
await writeFile(resolve(generated, "client-registry.mjs"), registry);
if (process.argv.includes("--server-only")) process.exit(0);
const renderTest = process.argv.includes("--render-test");
if (renderTest)
  await writeFile(
    resolve(generated, "render-entry.mjs"),
    `import { createElement, Suspense } from "react";
import {renderToReadableStream} from "react-dom/server.browser";
import {registry} from "./client-registry.mjs";
import {decodeUI} from "../static-app/decode";
export async function renderFixture(tree){const stream=await renderToReadableStream(createElement(Suspense,{fallback:"loading"},decodeUI(tree,registry)));await stream.allReady;return new Response(stream).text();}`,
  );
const result = await build({
  entryPoints: [
    renderTest ? resolve(generated, "render-entry.mjs") : "static-app/main.tsx",
  ],
  bundle: true,
  minify: true,
  write: false,
  outdir: "_app",
  format: "esm",
  splitting: !renderTest,
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "browser-adapters",
      setup(build) {
        build.onResolve(
          { filter: /^next\/(navigation|link|image)$/ },
          (args) => ({ path: args.path, namespace: "browser-next" }),
        );
        build.onLoad({ filter: /.*/, namespace: "browser-next" }, (args) => ({
          contents:
            args.path === "next/navigation"
              ? 'export {useRouter,usePathname} from "./static-transfers/navigation";'
              : `export {${args.path === "next/link" ? "Link" : "Image"} as default} from "./static-transfers/navigation";`,
          resolveDir: root,
          loader: "tsx",
        }));
        build.onResolve({ filter: /logout-button(?:\.tsx)?$/ }, () => ({
          path: resolve("static-transfers/logout.tsx"),
        }));
        build.onLoad({ filter: /[\\/]actions\.ts$/ }, async (args) => {
          const id = norm(args.path);
          const names = actionNames.get(id);
          if (!names) return;
          return {
            contents:
              `import {remoteAction} from ${JSON.stringify(resolve("static-app/actions.ts"))};\n` +
              names
                .map(
                  (name) =>
                    `export const ${name}=remoteAction(${JSON.stringify(id + "#" + name)});`,
                )
                .join("\n"),
            loader: "ts",
            resolveDir: root,
          };
        });
      },
    },
  ],
});
if (renderTest) {
  await writeFile(
    resolve(generated, "render-test.mjs"),
    result.outputFiles[0].contents,
  );
  process.exit(0);
}
const assetRoot = resolve(".open-next/assets");
// Hash the entry; esbuild already content-addresses split chunks.
const main = result.outputFiles.find((file) => file.path.endsWith("main.js"));
const hash = createHash("sha256")
  .update(main.contents)
  .digest("hex")
  .slice(0, 16);
const jsPath = `/_app/main-${hash}.js`;
await mkdir(resolve(assetRoot, "_app"), { recursive: true });
for (const file of result.outputFiles)
  await writeFile(
    resolve(
      assetRoot,
      "_app",
      file === main ? `main-${hash}.js` : file.path.split(/[\\/]/).at(-1),
    ),
    file.contents,
  );
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
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#009a97"><title>IIUM KAMS</title><link rel="manifest" href="/manifest.webmanifest">${css.map((file) => `<link rel="stylesheet" href="/_next/${file}">`).join("")}</head><body><div id="app-root"><p role="status" style="padding:24px;font-family:system-ui">Loading your workspace…</p></div><noscript>Enable JavaScript to securely use this application.</noscript><script type="module" src="${jsPath}"></script></body></html>`;
for (const path of pages.map(pathOf).filter((p) => !p.includes("["))) {
  const filename = path === "/" ? "index.html" : `${path.slice(1)}.html`;
  await mkdir(resolve(assetRoot, filename, ".."), { recursive: true });
  await writeFile(resolve(assetRoot, filename), html);
}
await writeFile(resolve(assetRoot, "_app-shell.html"), html);
await writeFile(
  resolve(assetRoot, "_headers"),
  `/sw.js\n  Content-Type: application/javascript; charset=utf-8\n  Cache-Control: no-cache, no-store, must-revalidate\n  Service-Worker-Allowed: /\n/_app/*\n  Cache-Control: public, max-age=31536000, immutable\n/_static/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n`,
);
console.log(
  `Static app: ${pages.length} page patterns, ${Object.keys(actionNames).length || actionFiles.length} action modules, ${clients.size} client modules; no authenticated data embedded.`,
);

// Imports are discovered before the server build executes its plugin callbacks.
async function iconImports() {
  const names = new Set();
  for (const path of [
    ...appFiles,
    ...(await files("components")),
    ...(await files("lib")),
  ].filter((p) => /\.tsx?$/.test(p))) {
    const source = await readFile(path, "utf8");
    for (const match of source.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g,
    ))
      for (const name of match[1].split(","))
        names.add(name.trim().split(/\s+as\s+/)[0]);
  }
  return names;
}
