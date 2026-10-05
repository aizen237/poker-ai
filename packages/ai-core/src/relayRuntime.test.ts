import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { get } from "node:http";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("starts the real relay locally and rejects foreign origins, hosts, consensus and malformed requests", async () => {
  const reservation = createServer();
  await new Promise<void>(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const child = spawn(process.execPath, ["--experimental-strip-types", "src/server.ts"], {
    cwd: fileURLToPath(new URL("../../../apps/ai-relay-server/", import.meta.url)),
    windowsHide: true,
    env: { ...process.env, RELAY_PORT: String(port), GROQ_API_KEY: "test-no-provider-requests", GEMINI_API_KEY: "", NVIDIA_API_KEY: "", OPPONENT_DB_PATH: ":memory:" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let timer: ReturnType<typeof setTimeout>;
  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Relay startup timed out")), 15000);
      child.on("error", reject);
      child.on("exit", code => reject(new Error(`Relay exited: ${code}`)));
      child.stdout.on("data", data => { if (String(data).includes("Listening on")) { clearTimeout(timer); resolve(); } });
      child.stderr.resume();
    });
    const url = `http://127.0.0.1:${port}`;
    const health = await fetch(url + "/health", { headers: { Origin: "https://www.pokernow.com" } });
    expect(health.status).toBe(200);
    expect(health.headers.get("access-control-allow-origin")).toBe("https://www.pokernow.com");
    expect((await health.json()).ok).toBe(true);
    expect((await fetch(url + "/health", { headers: { Origin: "https://evil.example" } })).status).toBe(403);
    // fetch normalizes Host; use the raw HTTP client to exercise DNS-rebinding defense.
    const badHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      get(url + "/health", { headers: { Host: "evil.example" } }, res => { res.resume(); resolve(res.statusCode); }).on("error", reject);
    });
    expect(badHostStatus).toBe(403);
    for (const mode of ["consensus", "invalid"]) {
      const response = await fetch(url + "/recommendation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      expect(response.status).toBe(400);
      expect((await response.json()).ok).toBe(false);
    }
    expect((await fetch(url + "/opponents/observations", { method: "POST" })).status).toBe(400);
    expect((await fetch(url + "/opponents/profiles", { method: "POST" })).status).toBe(400);
  } finally {
    clearTimeout(timer!);
    if (child.exitCode === null) {
      const closed = new Promise(resolve => child.once("exit", resolve));
      child.kill(); await closed;
    }
  }
}, 25000);
