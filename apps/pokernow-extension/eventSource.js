"use strict";
(() => {
  // src/pokerNowTransport.ts
  var TIMELINE_CHANNEL = "poker-ai:hand-source:v1";
  var object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var token = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
  function tableIdFromPath(path) {
    return /^\/games\/([A-Za-z0-9_-]{1,160})\/?$/.exec(path)?.[1] ?? null;
  }
  function validHandIdentity(value, tableId2) {
    return object(value) && value.tableId === tableId2 && token(value.handId) && Number.isSafeInteger(value.handNumber) && Number(value.handNumber) > 0 && (value.heroPlayerId === null || token(value.heroPlayerId)) && (value.frameCursor === null || typeof value.frameCursor === "string" && value.frameCursor.length < 160 || typeof value.frameCursor === "number" && Number.isSafeInteger(value.frameCursor)) && typeof value.chainGap === "boolean" && ["registered.gameState", "rup", "gC"].includes(String(value.source));
  }
  function identityFromSocketPacket(data, tableId2, previous) {
    if (typeof data !== "string" || data.length > 2e6 || !data.startsWith("42[")) return null;
    let packet;
    try {
      packet = JSON.parse(data.slice(2));
    } catch {
      return null;
    }
    if (!Array.isArray(packet) || packet.length !== 2 || !object(packet[1])) return null;
    const [event, payload] = packet;
    if (!["registered", "rup", "gC"].includes(event)) return null;
    const frame = event === "registered" ? payload.gameState : payload;
    if (!object(frame) || frame.id !== void 0 && frame.id !== tableId2) return null;
    const full = event !== "gC" || frame.r === true;
    const handId = frame.hI ?? (!full ? previous?.handId : void 0);
    const handNumber = frame.gN ?? (!full ? previous?.handNumber : void 0);
    if (previous && handNumber !== previous.handNumber && !token(frame.hI)) return null;
    const value = {
      tableId: tableId2,
      handId,
      handNumber,
      frameCursor: frame.now ?? null,
      heroPlayerId: event === "registered" ? object(payload.currentPlayer) && token(payload.currentPlayer.id) ? payload.currentPlayer.id : null : previous?.heroPlayerId ?? null,
      chainGap: !full && (!previous || frame.pre !== previous.frameCursor || previous.chainGap),
      source: event === "registered" ? "registered.gameState" : event
    };
    return validHandIdentity(value, tableId2) ? value : null;
  }

  // src/sourceMetadata.ts
  var FIELD_LIMIT = 64;
  var VALUE_LIMIT = 160;
  var valueNames = /* @__PURE__ */ new Set([
    "id",
    "hI",
    "gN",
    "now",
    "pre",
    "r",
    "createdAt",
    "seq",
    "sequence",
    "index",
    "offset",
    "cursor",
    "watermark",
    "version",
    "revision",
    "eventId",
    "messageId",
    "batchId",
    "snapshotId",
    "snapshotVersion",
    "nextCursor",
    "previousCursor",
    "lastEventId",
    "firstEventId",
    "total",
    "count",
    "hasMore",
    "complete"
  ]);
  var containers = /* @__PURE__ */ new Set(["meta", "metadata", "pagination", "coverage"]);
  var object2 = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  var kind = (x) => x === null ? "null" : Array.isArray(x) ? "array" : typeof x;
  var scalar = (x) => x === null || typeof x === "boolean" || typeof x === "number" && Number.isFinite(x) || typeof x === "string" && x.length <= VALUE_LIMIT;
  var allowedPath = (path) => {
    const parts = path.split(".");
    return parts.length <= 3 && parts.slice(0, -1).every((p) => containers.has(p)) && valueNames.has(parts.at(-1));
  };
  function inspectMetadataFields(input) {
    const result = { fields: [], truncated: false };
    const visit = (value, prefix, depth) => {
      if (!object2(value)) return;
      for (const [key, field] of Object.entries(value)) {
        if (result.fields.length === FIELD_LIMIT) {
          result.truncated = true;
          break;
        }
        const path = prefix + (/^[A-Za-z0-9_-]{1,64}$/.test(key) ? key : "<unsupported-key>");
        const entry = { path, type: kind(field) };
        if (allowedPath(path) && scalar(field)) entry.value = field;
        result.fields.push(entry);
        if (containers.has(key) && object2(field)) {
          if (depth < 2) visit(field, path + ".", depth + 1);
          else result.truncated = true;
        }
      }
    };
    visit(input, "", 0);
    return result;
  }
  function inspectSocketMetadata(data) {
    if (typeof data !== "string" || data.length > 2e6 || !data.startsWith("42[")) return null;
    let packet;
    try {
      packet = JSON.parse(data.slice(2));
    } catch {
      return null;
    }
    if (!Array.isArray(packet) || packet.length < 2 || !["registered", "rup", "gC"].includes(packet[0]) || !object2(packet[1])) return null;
    const event = packet[0];
    const envelope = packet[1];
    return {
      event,
      wrapperLength: packet.length,
      envelope: inspectMetadataFields(envelope),
      frame: inspectMetadataFields(event === "registered" ? envelope.gameState : envelope),
      extraWrapperItems: packet.slice(2, 4).map(inspectMetadataFields)
    };
  }

  // src/rawSocketCapture.ts
  var RAW_CAPTURE_KEY = "poker-ai:raw-socket-capture";
  var MAX_FRAMES = 500;
  var MAX_CHARACTERS = 4 * 1024 * 1024;
  function endOfValue(text, start) {
    let depth = 0;
    let quoted = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === "\\") i++;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        if (depth === 0) return i;
        depth--;
      } else if (c === "," && depth === 0) return i;
    }
    return text.length;
  }
  function members(object4) {
    const result = [];
    let i = 1;
    while (i < object4.length) {
      while (/\s|,/.test(object4[i] ?? "") && i < object4.length) i++;
      if (object4[i] === "}") break;
      const keyStart = i++;
      while (i < object4.length) {
        if (object4[i] === "\\") i += 2;
        else if (object4[i++] === '"') break;
      }
      const key = JSON.parse(object4.slice(keyStart, i));
      while (object4[i] !== ":" && i < object4.length) i++;
      i++;
      const end = endOfValue(object4, i);
      result.push({ key, raw: object4.slice(i, end).trim() });
      i = end;
    }
    return result;
  }
  function registrationProjection(payload) {
    const fields = [];
    for (const { key, raw } of members(payload)) {
      if (key === "gameState") fields.push(`"gameState":${raw}`);
      if (key === "currentPlayer") {
        const selected = raw.startsWith("{") ? `{${members(raw).filter((field) => field.key === "id").map((field) => `"id":${field.raw}`).join(",")}}` : raw;
        fields.push(`"currentPlayer":${selected}`);
      }
    }
    return `{${fields.join(",")}}`;
  }
  var RawSocketCapture = class {
    constructor(enabled, limits = { frames: MAX_FRAMES, characters: MAX_CHARACTERS }) {
      this.limits = limits;
      this.active = enabled;
      this.stopReason = enabled ? null : "not_enabled_before_page_load";
    }
    limits;
    frames = [];
    characters = 0;
    sourceCharacters = 0;
    active;
    stopReason;
    rejectedFrames = 0;
    observe(data, generation, receivedAt = Date.now()) {
      if (!this.active || typeof data !== "string" || !data.startsWith("42[")) return;
      if (data.length > this.limits.characters) {
        this.stop("incoming_frame_size_limit");
        return;
      }
      try {
        const wrapper = JSON.parse(data.slice(2));
        if (!Array.isArray(wrapper) || !["registered", "gC", "rup"].includes(wrapper[0])) return;
        if (wrapper.length < 2) {
          this.rejectedFrames++;
          return;
        }
        const event = wrapper[0];
        const body = data.slice(2);
        const start = endOfValue(body, 1) + 1;
        const raw = body.slice(start, endOfValue(body, start)).trim();
        const payloadJSON = event === "registered" && raw.startsWith("{") ? registrationProjection(raw) : raw;
        if (this.frames.length >= this.limits.frames) {
          this.stop("frame_limit");
          return;
        }
        if (this.sourceCharacters + data.length > this.limits.characters) {
          this.stop("buffer_size_limit");
          return;
        }
        this.frames.push({
          localReceiveSequence: this.frames.length + 1,
          localReceivedAt: receivedAt,
          connectionGeneration: generation,
          event,
          payloadJSON
        });
        this.characters += payloadJSON.length;
        this.sourceCharacters += data.length;
      } catch {
        this.rejectedFrames++;
      }
    }
    stop(reason = "exported_or_manually_stopped") {
      if (this.active) {
        this.active = false;
        this.stopReason = reason;
      }
    }
    status() {
      return {
        temporaryDiagnosticsOnly: true,
        authoritativeOrdering: false,
        historyCompletenessProof: false,
        active: this.active,
        stopReason: this.stopReason,
        frameCount: this.frames.length,
        retainedJsonCharacters: this.characters,
        rejectedFrames: this.rejectedFrames,
        retainedSourceCharacters: this.sourceCharacters,
        registeredCaptured: this.frames.some((frame) => frame.event === "registered"),
        limits: { ...this.limits }
      };
    }
    exportJSON() {
      this.stop();
      const frames = this.frames.map(({ payloadJSON, ...metadata }) => `${JSON.stringify(metadata).slice(0, -1)},"payload":${payloadJSON}}`);
      return `{"capture":${JSON.stringify(this.status())},"frames":[${frames.join(",")}]}`;
    }
  };
  function installRawSocketCapture(target) {
    let enabled = false;
    try {
      enabled = target.sessionStorage.getItem(RAW_CAPTURE_KEY) === "1";
    } catch {
    }
    const capture = new RawSocketCapture(enabled);
    const disarm = () => {
      try {
        target.sessionStorage.removeItem(RAW_CAPTURE_KEY);
      } catch {
      }
    };
    Object.defineProperty(target, "pokerAIRawCapture", { configurable: true, value: Object.freeze({
      status: () => capture.status(),
      stop: () => {
        capture.stop();
        disarm();
      },
      exportJSON: () => {
        disarm();
        return capture.exportJSON();
      }
    }) });
    return capture;
  }

  // src/firstUtgState.ts
  var allowed = new Set("id hI gN now pre r gT seats iHPI dealerID dealerSeat sBPI bBPI tB pGS cPI pITT smallBlind bigBlind ante deadButton gM mode aD aS cM cR players pC cRPI eventsData rHP rHC oTC gameResult".split(" "));

  // src/firstUtgSource.ts
  var object3 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var token2 = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
  var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  var keys = [
    "id",
    "hI",
    "gN",
    "now",
    "pre",
    "r",
    "gT",
    "seats",
    "iHPI",
    "dealerID",
    "dealerSeat",
    "sBPI",
    "bBPI",
    "tB",
    "pGS",
    "cPI",
    "pITT",
    "smallBlind",
    "bigBlind",
    "ante",
    "deadButton",
    "gM",
    "mode",
    "oTC",
    "gameResult",
    "aD",
    "aS",
    "cM",
    "cR",
    "cRPI",
    "rHP",
    "rHC",
    "eventsData"
  ];
  function projectFirstUtgSource(data, knownHero) {
    if (typeof data !== "string" || data.length > 2e6 || !data.startsWith("42[")) return null;
    try {
      const p = JSON.parse(data.slice(2));
      if (!Array.isArray(p) || p.length !== 2 || !["registered", "gC", "rup"].includes(p[0]) || !object3(p[1])) return null;
      const raw = p[0] === "registered" ? p[1].gameState : p[1];
      if (!object3(raw)) return null;
      if (Object.hasOwn(raw, "eventsData") && !same(raw.eventsData, [])) return null;
      const heroId = p[0] === "registered" ? p[1].currentPlayer?.id : knownHero;
      const frame = {};
      for (const key of keys) if (Object.hasOwn(raw, key)) frame[key] = raw[key];
      if (p[0] === "registered" || frame.gameResult !== "<D>") delete frame.gameResult;
      if (Object.hasOwn(raw, "players")) {
        if (!object3(raw.players) || Object.keys(raw.players).length > 10) return null;
        frame.players = Object.fromEntries(Object.entries(raw.players).map(([id, player]) => [id, object3(player) ? Object.fromEntries(["id", "stack", "status", "disconnectedSince"].filter((k) => Object.hasOwn(player, k)).map((k) => [k, player[k]])) : player]));
      }
      if (Object.hasOwn(raw, "pC")) {
        if (!object3(raw.pC) || Object.keys(raw.pC).length > 10) return null;
        if (Object.values(raw.pC).some((hand) => !object3(hand) || !Array.isArray(hand.cards) || hand.cards.length > 2 || hand.cards.some((c) => !object3(c) || !(c.value === null || typeof c.value === "string") || typeof c.showing !== "boolean"))) return null;
        frame.pC = Object.fromEntries(Object.entries(raw.pC).map(([id, hand]) => [
          id,
          { cards: hand.cards.map((c) => ({ value: id === heroId ? c.value : null, showing: c.showing })) }
        ]));
      }
      const result = { event: p[0], heroId: token2(heroId) ? heroId : null, frame };
      return JSON.stringify(result).length <= 4e4 ? result : null;
    } catch {
      return null;
    }
  }

  // src/eventSource.ts
  var tableId = tableIdFromPath(location.pathname);
  if (tableId && typeof window.WebSocket === "function") {
    let rawCapture;
    try {
      rawCapture = installRawSocketCapture(window);
    } catch {
    }
    let identity = null;
    let connected = false;
    let generation = 0;
    let sequence = 0;
    let metadataSequence = 0;
    let lastMetadata = null;
    let firstMetadata = null;
    const publish = () => window.postMessage({
      channel: TIMELINE_CHANNEL,
      type: "identity",
      sequence: ++sequence,
      tableId,
      identity,
      connected
    }, location.origin);
    window.addEventListener("message", (event) => {
      if (event.source === window && event.origin === location.origin && event.data?.channel === TIMELINE_CHANNEL && event.data?.type === "ready") {
        publish();
        if (firstMetadata) window.postMessage(firstMetadata, location.origin);
        if (lastMetadata && lastMetadata !== firstMetadata) window.postMessage(lastMetadata, location.origin);
      }
    });
    const NativeSocket = window.WebSocket;
    window.WebSocket = new Proxy(NativeSocket, {
      construct(target, args, newTarget) {
        const socket = Reflect.construct(target, args, newTarget);
        try {
          const url = new URL(String(args[0]), location.href);
          if (url.hostname !== location.hostname || !url.pathname.startsWith("/socket.io/") || url.searchParams.get("gameID") !== tableId) return socket;
          const mine = ++generation;
          identity = null;
          lastMetadata = null;
          firstMetadata = null;
          connected = false;
          publish();
          socket.addEventListener("message", (event) => {
            try {
              rawCapture?.observe(event.data, mine);
            } catch {
            }
            if (mine !== generation) return;
            try {
              const metadata = inspectSocketMetadata(event.data);
              const intendedState = typeof event.data === "string" && /^42\[\s*"(?:registered|gC|rup)"/.test(event.data);
              if (metadata || intendedState) {
                lastMetadata = {
                  channel: TIMELINE_CHANNEL,
                  type: "source_metadata",
                  tableId,
                  sequence: ++metadataSequence,
                  generation: mine,
                  metadata,
                  utgSource: metadata ? projectFirstUtgSource(event.data, identity?.heroPlayerId ?? null) : null,
                  observedAt: Date.now()
                };
                firstMetadata ??= lastMetadata;
                window.postMessage(lastMetadata, location.origin);
              }
            } catch {
            }
            try {
              const next = identityFromSocketPacket(event.data, tableId, identity);
              if (!next) return;
              const changed = !identity || next.handId !== identity.handId || next.handNumber !== identity.handNumber || next.chainGap !== identity.chainGap || !connected;
              identity = next;
              connected = true;
              if (changed) publish();
            } catch {
            }
          });
          socket.addEventListener("close", () => {
            if (mine === generation) {
              connected = false;
              publish();
            }
          });
        } catch {
        }
        return socket;
      }
    });
  }
})();
