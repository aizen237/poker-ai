import { identityFromSocketPacket, tableIdFromPath, TIMELINE_CHANNEL, type HandIdentityEvidence } from "./pokerNowTransport.js";
import { inspectSocketMetadata } from "./sourceMetadata.js";
import { installRawSocketCapture, type RawSocketCapture } from "./rawSocketCapture.js";
import { projectFirstUtgSource } from "./firstUtgSource.js";
import { projectRiverObservation } from "./riverObservation.js";
import { installRaiseEvidenceCollector } from "./raiseEvidenceCapture.js";

// Runs in MAIN at document_start. Observe existing incoming traffic only;
// never open a connection, call send(), emit actions, or patch page state.
const tableId = tableIdFromPath(location.pathname);
if (tableId && typeof window.WebSocket === "function") {
  let rawCapture: RawSocketCapture | undefined;
  try { rawCapture = installRawSocketCapture(window); } catch { /* Optional diagnostics must not disrupt observation. */ }
  try { if (rawCapture) installRaiseEvidenceCollector(window, rawCapture); } catch { /* Diagnostics never affect socket observation. */ }
  let identity: HandIdentityEvidence | null = null;
  let connected = false;
  let generation = 0;
  let sequence = 0;
  let metadataSequence = 0;
  let lastMetadata: Record<string, unknown> | null = null;
  let firstMetadata: Record<string, unknown> | null = null;
  const publish = () => window.postMessage({ channel: TIMELINE_CHANNEL, type: "identity", sequence: ++sequence,
    tableId, identity, connected }, location.origin);
  // document_idle consumer can request the last sanitized observation; no network request.
  window.addEventListener("message", event => {
    if (event.source === window && event.origin === location.origin && event.data?.channel === TIMELINE_CHANNEL && event.data?.type === "ready") {
      publish();
      if (firstMetadata) window.postMessage(firstMetadata, location.origin);
      if (lastMetadata && lastMetadata !== firstMetadata) window.postMessage(lastMetadata, location.origin);
    }
  });
  const NativeSocket = window.WebSocket;
  window.WebSocket = new Proxy(NativeSocket, {
    construct(target, args, newTarget) {
      const socket = Reflect.construct(target, args, newTarget) as WebSocket;
      try {
        const url = new URL(String(args[0]), location.href);
        if (url.hostname !== location.hostname || !url.pathname.startsWith("/socket.io/") || url.searchParams.get("gameID") !== tableId) return socket;
        const mine = ++generation;
        identity = null; lastMetadata = null; firstMetadata = null; connected = false; publish();
        socket.addEventListener("message", event => {
          // Keep raw observations separate, including late frames from an old
          // connection. Generation is local metadata, never a source proof.
          try { rawCapture?.observe(event.data, mine); } catch { /* Diagnostics only. */ }
          if (mine !== generation) return;
          try {
            const metadata = inspectSocketMetadata(event.data);
            // An unreadable intended state frame must also expire a prior
            // first-turn witness; silently retaining it would be stale advice.
            const intendedState = typeof event.data === "string" && /^42\[\s*"(?:registered|gC|rup)"/.test(event.data);
            if (metadata || intendedState) {
              lastMetadata = { channel: TIMELINE_CHANNEL, type: "source_metadata", tableId,
                sequence: ++metadataSequence, generation: mine, metadata,
                utgSource: metadata ? projectFirstUtgSource(event.data, identity?.heroPlayerId ?? null) : null, observedAt: Date.now() };
              lastMetadata.riverSource = metadata ? projectRiverObservation(event.data, identity?.heroPlayerId ?? null) : null;
              firstMetadata ??= lastMetadata;
              window.postMessage(lastMetadata, location.origin);
            }
          } catch { /* Diagnostic observation cannot change identity/action ingestion. */ }
          try {
            const next = identityFromSocketPacket(event.data, tableId, identity);
            if (!next) return;
            const changed = !identity || next.handId !== identity.handId || next.handNumber !== identity.handNumber || next.chainGap !== identity.chainGap || !connected;
            identity = next; connected = true;
            if (changed) publish();
          } catch { /* Observation cannot interfere with PokerNow's message handler. */ }
        });
        socket.addEventListener("close", () => {
          if (mine === generation) { connected = false; publish(); }
        });
      } catch { /* The original socket is returned even if observation fails. */ }
      return socket;
    },
  });
}
