import { readFileSync, statSync } from "node:fs";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Local explicit-file analysis only. No network, output files, or poker actions.
try {
  if (process.argv.length !== 3) throw new Error("Usage: npm run audit:bb -- path/to/local-raw-capture.json");
  if (statSync(process.argv[2]).size > 4 * 1024 * 1024) throw new Error("Capture exceeds 4MiB audit limit.");
  const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const bundle = await build({ entryPoints: [fileURLToPath(new URL("../src/bbLimpCaptureAudit.ts", import.meta.url))],
    bundle: true, platform: "node", format: "esm", write: false });
  const { auditBbLimpCapture } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
  process.stdout.write(JSON.stringify(auditBbLimpCapture(input), null, 2) + "\n");
} catch (error) {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n"); process.exitCode = 1;
}
