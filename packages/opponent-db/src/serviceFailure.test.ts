import { expect, it } from "vitest";
import { createOpponentService } from "./service.js";
it("handles synchronous database initialization failure when recording observations", async () => {
  const service = createOpponentService(() => { throw new Error("native database initialization failed"); });
  await expect(service.record([])).resolves.toEqual({ available: false, saved: 0 });
});
