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
  function members(object7) {
    const result = [];
    let i = 1;
    while (i < object7.length) {
      while (/\s|,/.test(object7[i] ?? "") && i < object7.length) i++;
      if (object7[i] === "}") break;
      const keyStart = i++;
      while (i < object7.length) {
        if (object7[i] === "\\") i += 2;
        else if (object7[i++] === '"') break;
      }
      const key = JSON.parse(object7.slice(keyStart, i));
      while (object7[i] !== ":" && i < object7.length) i++;
      i++;
      const end = endOfValue(object7, i);
      result.push({ key, raw: object7.slice(i, end).trim() });
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
    constructor(enabled2, limits = { frames: MAX_FRAMES, characters: MAX_CHARACTERS }) {
      this.limits = limits;
      this.active = enabled2;
      this.stopReason = enabled2 ? null : "not_enabled_before_page_load";
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
      const last = this.frames.at(-1);
      const payload = last ? JSON.parse(last.payloadJSON) : null;
      const cursor = last?.event === "registered" ? payload?.gameState?.now : payload?.now;
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
        lastRetainedFrame: last ? {
          localReceiveSequence: last.localReceiveSequence,
          localReceivedAt: last.localReceivedAt,
          connectionGeneration: last.connectionGeneration,
          event: last.event,
          // Diagnostic linkage only; raw and bridge sequences are independent.
          sourceCursor: Number.isSafeInteger(cursor) ? cursor : null
        } : null,
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
    let enabled2 = false;
    try {
      enabled2 = target.sessionStorage.getItem(RAW_CAPTURE_KEY) === "1";
    } catch {
    }
    const capture = new RawSocketCapture(enabled2);
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
  var allowed = new Set("id hI gN now pre r gT seats iHPI dealerID dealerSeat sBPI bBPI tB pGS cPI pITT smallBlind bigBlind ante deadButton gM mode aD aS cM cR players pC cRPI eventsData rHP rHC oTC gameResult version fV nR mTB rIT sPM".split(" "));

  // src/hjWindow.ts
  var object3 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var integer = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var token2 = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
  var common = ["now", "pre", "eventsData", "mEV", "fV", "sN"];
  function hjPatchKind(raw) {
    if (!object3(raw) || !integer(raw.now) || !integer(raw.pre) || raw.now <= raw.pre || !integer(raw.sN) || raw.mEV !== 0 || raw.fV !== "0.1.72" || !Array.isArray(raw.eventsData) || raw.eventsData.length) return null;
    const exact2 = (fields) => Object.keys(raw).length === fields.length && fields.every((k) => Object.hasOwn(raw, k));
    if (exact2([...common, "pGS", "sNA", "pITT", "sNAA", "wBACPI"]) && object3(raw.pGS) && Object.keys(raw.pGS).length === 1 && token2(Object.keys(raw.pGS)[0]) && Object.values(raw.pGS)[0] === "fold" && raw.sNA === "NSAF" && raw.pITT === null && integer(raw.sNAA) && Array.isArray(raw.wBACPI) && raw.wBACPI.length === 1 && token2(raw.wBACPI[0])) return "fold";
    if (exact2([...common, "cPI", "pITT", "sNA", "pASA", "sNAA", "mAVTB"]) && token2(raw.cPI) && raw.pITT === raw.cPI && raw.sNA === null && raw.sNAA === null && raw.pASA === raw.now && integer(raw.mAVTB)) return "turn";
    return null;
  }

  // src/bettingWindow.ts
  var object4 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var integer2 = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function isObservedHjCallPatch(raw) {
    if (!object4(raw)) return false;
    const keys2 = ["tB", "now", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI", "eventsData", "pre", "mEV", "fV", "sN"];
    return Object.keys(raw).length === keys2.length && keys2.every((k) => Object.hasOwn(raw, k)) && integer2(raw.now) && integer2(raw.pre) && raw.now > raw.pre && integer2(raw.sNAA) && integer2(raw.sN) && raw.mEV === 0 && raw.fV === "0.1.72" && raw.sNA === "NSAA" && raw.pITT === null && same(raw.pGS, {}) && same(raw.wBACPI, []) && same(raw.eventsData, []) && object4(raw.tB) && Object.keys(raw.tB).length === 1 && Object.values(raw.tB)[0] === 5 && Array.isArray(raw.cRPI) && raw.cRPI.length === 2 && raw.cRPI[0] !== raw.cRPI[1] && raw.cRPI[1] === Object.keys(raw.tB)[0];
  }
  function isObservedUtgOpenPatch(raw) {
    if (!object4(raw)) return false;
    const keys2 = [
      "mR",
      "tB",
      "cHB",
      "now",
      "pGS",
      "sNA",
      "cRPI",
      "pITT",
      "sNAA",
      "wBACPI",
      "eventsData",
      "pre",
      "mEV",
      "fV",
      "sN"
    ];
    return Object.keys(raw).length === keys2.length && keys2.every((k) => Object.hasOwn(raw, k)) && integer2(raw.now) && integer2(raw.pre) && raw.now > raw.pre && integer2(raw.sNAA) && integer2(raw.sN) && raw.mR === 8 && raw.cHB === 5 && raw.mEV === 0 && raw.fV === "0.1.72" && raw.sNA === "NSAA" && raw.pITT === null && same(raw.pGS, {}) && same(raw.wBACPI, []) && same(raw.eventsData, []) && object4(raw.tB) && Object.keys(raw.tB).length === 1 && Object.values(raw.tB)[0] === 5 && same(raw.cRPI, Object.keys(raw.tB));
  }

  // src/flopWindow.ts
  var object5 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var integer3 = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var same2 = (a, b) => {
    if (a === b) return true;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => same2(v, b[i]));
    return object5(a) && object5(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => Object.hasOwn(b, k) && same2(a[k], b[k]));
  };
  var exact = (v, keys2) => Object.keys(v).length === keys2.length && keys2.every((k) => Object.hasOwn(v, k));
  var common2 = ["now", "pre", "eventsData", "mEV", "fV", "sN"];
  function isFlopAccountingBoundary(raw) {
    return object5(raw) && exact(raw, [
      ...common2,
      "gN",
      "gT",
      "hI",
      "nR",
      "pC",
      "tB",
      "cPI",
      "oTC",
      "pGS",
      "rHP",
      "sBS",
      "sNA",
      "bBPI",
      "cRPI",
      "iHPI",
      "pASA",
      "pITT",
      "sBPI",
      "sNAA",
      "mAVTB",
      "wBACPI",
      "players",
      "dealerID",
      "dealerSeat",
      "gameResult",
      "rHC"
    ]) && raw.mEV === 0 && integer3(raw.sN) && raw.sNA === null && raw.sNAA === null && raw.pASA === raw.now && raw.mAVTB === 268 && raw.sBS === 5 && same2(raw.wBACPI, [raw.bBPI]) && object5(raw.pC) && Object.values(raw.pC).every((p) => object5(p) && exact(p, ["cards", "name1", "name2", "name1RH", "name2RH", "prob1"]) && [p.name1, p.name2, p.name1RH, p.name2RH, p.prob1].every((v) => v === null) && Array.isArray(p.cards) && p.cards.every((c) => object5(c) && exact(c, ["value", "showing"])));
  }
  function flopPatchKind(raw) {
    if (!object5(raw) || !integer3(raw.now) || !integer3(raw.pre) || raw.now <= raw.pre || !integer3(raw.sN) || raw.mEV !== 0 || raw.fV !== "0.1.72" || !same2(raw.eventsData, [])) return null;
    const opening = hjPatchKind(raw);
    if (opening) return opening;
    const action = raw.sNA === "NSAA" && raw.pITT === null && integer3(raw.sNAA);
    const contribution = object5(raw.tB) && Object.keys(raw.tB).length === 1 && Object.values(raw.tB)[0] === 2 && same2(raw.pGS, {}) && Array.isArray(raw.cRPI) && Array.isArray(raw.wBACPI);
    if (action && contribution && exact(raw, [...common2, "tB", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI"])) return "contribution";
    if (action && contribution && raw.mR === 4 && raw.cHB === 2 && exact(raw, [...common2, "mR", "tB", "cHB", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI"])) return "bet";
    if (action && raw.bigBlindCheck === true && same2(raw.wBACPI, []) && exact(raw, [...common2, "sNA", "pITT", "sNAA", "wBACPI", "bigBlindCheck"])) return "bb_check";
    if (exact(raw, [
      ...common2,
      "gT",
      "mR",
      "pC",
      "tB",
      "cHB",
      "cPI",
      "oTC",
      "pot",
      "sNA",
      "cRPI",
      "pASA",
      "pITT",
      "sNAA",
      "mAVTB",
      "players",
      "bigBlindCheck"
    ]) && same2(raw.gT, [1, 1]) && raw.mR === 2 && raw.cHB === 0 && (raw.pot === 10 || raw.pot === 12) && raw.cPI === raw.pITT && typeof raw.cPI === "string" && raw.pASA === raw.now && raw.sNA === null && raw.sNAA === null && integer3(raw.mAVTB) && raw.bigBlindCheck === false && same2(raw.cRPI, []) && object5(raw.oTC) && exact(raw.oTC, ["1"]) && Array.isArray(raw.oTC["1"]) && raw.oTC["1"].length === 3 && raw.oTC["1"].every((c) => typeof c === "string" && /^[2-9TJQKA][shdc]$/.test(c)) && object5(raw.tB) && Object.keys(raw.tB).length === raw.pot / 2 && Object.values(raw.tB).every((v) => v === "<D>") && object5(raw.players) && Object.keys(raw.players).length === raw.pot / 2 && Object.values(raw.players).every((p) => object5(p) && exact(p, ["stack"]) && integer3(p.stack)) && object5(raw.pC) && Object.keys(raw.pC).length === 6 && Object.values(raw.pC).every((p) => object5(p) && exact(p, ["name1", "name2", "name1RH"]) && p.name1RH === null && (p.name1 === null || typeof p.name1 === "string" && p.name1.length <= 32) && (p.name2 === null || p.name2 === "<D>"))) return "deal";
    return null;
  }

  // src/firstUtgSource.ts
  var object6 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var token3 = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
  var integer4 = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var same3 = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  var equivalent = (a, b) => {
    if (a === b) return true;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => equivalent(v, b[i]));
    return object6(a) && object6(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => Object.hasOwn(b, k) && equivalent(a[k], b[k]));
  };
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
    "eventsData",
    "version",
    "fV",
    "nR",
    "mTB",
    "rIT",
    "sPM"
  ];
  function projectFirstUtgSource(data, knownHero) {
    if (typeof data !== "string" || data.length > 2e6 || !data.startsWith("42[")) return null;
    try {
      const p = JSON.parse(data.slice(2));
      if (!Array.isArray(p) || p.length !== 2 || !["registered", "gC", "rup"].includes(p[0]) || !object6(p[1])) return null;
      const raw = p[0] === "registered" ? p[1].gameState : p[1];
      if (!object6(raw)) return null;
      if (Object.hasOwn(raw, "eventsData") && !same3(raw.eventsData, [])) return null;
      const heroId = p[0] === "registered" ? p[1].currentPlayer?.id : knownHero;
      const flopKind = p[0] === "gC" ? flopPatchKind(raw) : null;
      const frame = {};
      for (const key of keys) if (Object.hasOwn(raw, key)) frame[key] = raw[key];
      if (p[0] === "registered" || frame.gameResult !== "<D>") delete frame.gameResult;
      if (Object.hasOwn(raw, "players")) {
        if (!object6(raw.players) || Object.keys(raw.players).length > 10) return null;
        frame.players = Object.fromEntries(Object.entries(raw.players).map(([id, player]) => [id, object6(player) ? Object.fromEntries(["id", "stack", "status", "disconnectedSince"].filter((k) => Object.hasOwn(player, k)).map((k) => [k, player[k]])) : player]));
      }
      if (Object.hasOwn(raw, "pC")) {
        if (!object6(raw.pC) || Object.keys(raw.pC).length > 10) return null;
        if (flopKind === "deal") {
          if (Object.entries(raw.pC).some(([id, hand]) => id !== heroId && !equivalent(hand, { name1: null, name2: null, name1RH: null }))) return null;
          frame.pC = {};
        } else {
          if (Object.values(raw.pC).some((hand) => !object6(hand) || !Array.isArray(hand.cards) || hand.cards.length > 2 || hand.cards.some((c) => !object6(c) || !(c.value === null || typeof c.value === "string") || typeof c.showing !== "boolean"))) return null;
          frame.pC = Object.fromEntries(Object.entries(raw.pC).map(([id, hand]) => [
            id,
            { cards: hand.cards.map((c) => ({ value: id === heroId ? c.value : null, showing: c.showing })) }
          ]));
        }
      }
      const result = {
        event: p[0],
        heroId: token3(heroId) ? heroId : null,
        frame,
        ...(p[0] === "registered" || p[0] === "gC" && same3(raw.gT, [1, 0])) && (Object.hasOwn(raw, "mR") || Object.hasOwn(raw, "cHB")) ? { flopBoundary: { mR: integer4(raw.mR) ? raw.mR : null, cHB: integer4(raw.cHB) ? raw.cHB : null } } : {},
        ...flopKind && flopKind !== "turn" && flopKind !== "fold" ? { flopPatch: raw } : {},
        ...p[0] === "gC" && isFlopAccountingBoundary(raw) ? { flopAccountingBoundary: true } : {},
        ...p[0] === "gC" && (isObservedUtgOpenPatch(raw) || isObservedHjCallPatch(raw)) ? { bettingPatch: raw } : {},
        ...p[0] === "gC" && hjPatchKind(raw) ? { hjPatch: raw } : {}
      };
      return JSON.stringify(result).length <= 4e4 ? result : null;
    } catch {
      return null;
    }
  }

  // ../../packages/browser-reader/dist/tableInfoParsing.js
  function parseChipsValueText(normalValueText) {
    const text = normalValueText.trim();
    const cleaned = text.replace(/,/g, "");
    if (cleaned.length === 0) {
      throw new Error(`Chips value text is empty (expected a number, got an empty string)`);
    }
    const value = Number(cleaned);
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text) || !Number.isFinite(value) || value < 0) {
      throw new Error(`Unrecognized chips value text: "${normalValueText}"`);
    }
    return value;
  }

  // src/raiseControlRead.ts
  var RAISE_SELECTORS = {
    form: "form.raise-controller-form",
    amount: ".raise-bet-value",
    input: "input.value",
    displayedBB: ".bb-value",
    submit: '.action-buttons input[type="submit"].action-button.bet'
  };
  function isControlVisible(element) {
    for (let node = element; node; node = node.parentElement) {
      if (node.hasAttribute("hidden")) return false;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function readRaiseControl(root = document, isVisible = isControlVisible) {
    const issues = [];
    const forms = [...root.querySelectorAll(RAISE_SELECTORS.form)].filter(isVisible);
    const form = forms.length === 1 ? forms[0] : null;
    if (forms.length > 1) issues.push("Multiple visible raise forms");
    const containers2 = form ? [...form.querySelectorAll(RAISE_SELECTORS.amount)].filter(isVisible) : [];
    const container = containers2.length === 1 ? containers2[0] : null;
    if (form && containers2.length === 0) issues.push("Visible raise form has no visible amount container");
    if (containers2.length > 1) issues.push("Multiple visible raise amount containers");
    const inputs = container ? [...container.querySelectorAll(RAISE_SELECTORS.input)].filter(isVisible) : [];
    const input = inputs.length === 1 ? inputs[0] : null;
    if (input && (input.disabled || input.readOnly || input.hasAttribute("disabled") || input.hasAttribute("readonly") || input.closest('fieldset[disabled], [inert], [aria-disabled="true"]'))) issues.push("Selected raise-to input is disabled or read-only");
    if (container && inputs.length !== 1) issues.push("Expected exactly one visible selected raise-to input");
    const selectedRaiseToText = input?.value ?? null;
    let selectedRaiseToChips = null;
    if (selectedRaiseToText !== null) {
      try {
        selectedRaiseToChips = parseChipsValueText(selectedRaiseToText);
      } catch {
        issues.push("Selected raise-to amount is unreadable");
      }
    }
    const bbDisplays = container ? [...container.querySelectorAll(RAISE_SELECTORS.displayedBB)].filter(isVisible) : [];
    if (bbDisplays.length > 1) issues.push("Multiple visible raise BB displays");
    const submits = form ? [...form.querySelectorAll(RAISE_SELECTORS.submit)].filter(isVisible) : [];
    const submit = submits.length === 1 ? submits[0] : null;
    if (form && submits.length !== 1) issues.push("Expected exactly one visible Raise submit control");
    const raiseSubmitVisible = submit?.value.trim().toLowerCase() === "raise";
    if (submit && !raiseSubmitVisible) issues.push("Submit control is not labeled Raise");
    return {
      formVisible: forms.length > 0,
      amountControlVisible: containers2.length > 0,
      selectedRaiseToText,
      selectedRaiseToChips,
      selectedRaiseToSource: selectedRaiseToChips === null ? null : ".raise-bet-value input.value (live value property)",
      displayedBBText: bbDisplays.length === 1 ? bbDisplays[0].textContent : null,
      submitText: submit?.value ?? null,
      raiseSubmitVisible,
      raiseSubmitEnabled: raiseSubmitVisible && submit !== null ? !submit.disabled && !submit.hasAttribute("disabled") && !submit.closest('fieldset[disabled], [inert], [aria-disabled="true"]') : null,
      issues
    };
  }

  // src/raiseEvidenceCapture.ts
  var RAISE_CAPTURE_KEY = "poker-ai:raise-evidence-capture";
  var CHANNEL = "poker-ai:raise-evidence-diagnostics:v1";
  var CHECKPOINT_LABELS = ["panel_opened", "min_raise_selected", "five_chips_entered", "postflop_call"];
  var LIMITS = { checkpoints: 8, bytes: 128 * 1024 };
  var bytes = (text) => new TextEncoder().encode(text).byteLength;
  var enabled = (target) => {
    try {
      return target.sessionStorage.getItem(RAISE_CAPTURE_KEY) === "1";
    } catch {
      return false;
    }
  };
  function readRaiseCheckpointDOM(root, visible = isControlVisible) {
    const forms = [...root.querySelectorAll(RAISE_SELECTORS.form)];
    const node = (element) => ({
      outerHTML: element.outerHTML,
      visible: visible(element),
      disabledAttribute: element.getAttribute("disabled"),
      ariaDisabled: element.getAttribute("aria-disabled"),
      blockingAncestors: [...(function* () {
        for (let p = element; p; p = p.parentElement) {
          if (p.matches('[hidden], [disabled], [inert], [aria-disabled="true"]')) {
            yield {
              tag: p.tagName,
              class: p.getAttribute("class"),
              hidden: p.getAttribute("hidden"),
              disabled: p.getAttribute("disabled"),
              inert: p.getAttribute("inert"),
              ariaDisabled: p.getAttribute("aria-disabled")
            };
          }
        }
      })()]
    });
    const input = (element) => ({
      ...node(element),
      liveValue: element.value ?? null,
      valueAttribute: element.getAttribute("value"),
      type: element.getAttribute("type"),
      min: element.getAttribute("min"),
      max: element.getAttribute("max"),
      step: element.getAttribute("step"),
      pattern: element.getAttribute("pattern"),
      inputMode: element.getAttribute("inputmode"),
      disabled: element.disabled ?? null,
      readOnly: element.readOnly ?? null,
      willValidate: element.willValidate ?? null,
      validity: element.validity ? Object.fromEntries([
        "valid",
        "badInput",
        "customError",
        "patternMismatch",
        "rangeOverflow",
        "rangeUnderflow",
        "stepMismatch",
        "tooLong",
        "tooShort",
        "typeMismatch",
        "valueMissing"
      ].map((key) => [key, element.validity[key]])) : null
    });
    return {
      origin: "manual DOM read; attributes/native validity are observations, not server legality",
      formCount: forms.length,
      visibleFormCount: forms.filter(visible).length,
      selected: readRaiseControl(root, visible),
      forms: forms.map((form) => ({
        ...node(form),
        noValidate: form.noValidate ?? null,
        inputs: [...form.querySelectorAll(".raise-bet-value input.value")].map(input),
        bbDisplays: [...form.querySelectorAll(".raise-bet-value .bb-value")].map((e) => ({ ...node(e), text: e.textContent })),
        submits: [...form.querySelectorAll(RAISE_SELECTORS.submit)].map(input)
      }))
    };
  }
  var RaiseEvidenceCollector = class {
    constructor(on, d, limits = LIMITS) {
      this.d = d;
      this.limits = limits;
      this.active = on;
      this.stopReason = on ? null : "not_enabled_before_page_load";
    }
    d;
    limits;
    records = [];
    retainedBytes = 2;
    // Complete JSON array, including delimiters.
    busy = false;
    active;
    exported = false;
    refused = 0;
    stopReason;
    priorBinding = null;
    status() {
      return {
        developmentOnly: true,
        authoritative: false,
        historyComplete: false,
        active: this.active,
        busy: this.busy,
        checkpointCount: this.records.length,
        retainedBytes: this.retainedBytes,
        refusedCheckpoints: this.refused,
        stopReason: this.stopReason,
        limits: { ...this.limits },
        rawRecorder: this.d.raw.status()
      };
    }
    refuse(reason) {
      this.refused++;
      return { accepted: false, reason };
    }
    retain(record) {
      const json = JSON.stringify(record);
      const size = this.retainedBytes + bytes(json) + (this.records.length ? 1 : 0);
      if (size > this.limits.bytes) {
        this.stop("checkpoint_byte_limit");
        return this.refuse("checkpoint_byte_limit; whole checkpoint rejected, no truncation");
      }
      this.records.push(json);
      this.retainedBytes = size;
      if (this.records.length === this.limits.checkpoints) this.stop("checkpoint_limit");
      return { accepted: true, checkpoint: this.records.length };
    }
    stop(reason = "manually_disabled") {
      this.active = false;
      this.stopReason = reason;
      this.d.raw.stop();
      this.d.disarm();
    }
    async checkpoint(label) {
      if (!this.active) return this.refuse(this.stopReason ?? "inactive");
      if (this.busy) return this.refuse("checkpoint_already_pending");
      if (!CHECKPOINT_LABELS.includes(label)) return this.refuse("unrecognized_manual_label");
      if (this.records.length >= this.limits.checkpoints) {
        this.stop("checkpoint_limit");
        return this.refuse("checkpoint_limit");
      }
      this.busy = true;
      try {
        const at = this.d.now(), performanceTime = this.d.monotonic(), tableUrl = this.d.tableUrl();
        const rawBefore = this.d.raw.status(), dom = label === "postflop_call" ? null : this.d.dom();
        const reply = await this.d.source(label);
        if (!this.active) return this.refuse("capture_stopped_while_checkpoint_pending");
        const completedAt = this.d.now(), rawAfter = this.d.raw.status(), source = reply.source;
        if (label === "postflop_call") {
          const pair = reply.postflop ?? null, b = pair?.binding, last = rawAfter.lastRetainedFrame;
          const reasons = [...pair?.reasons ?? ["No paired isolated-world observation."], ...reply.error ? [reply.error] : []];
          if (!pair?.readinessMatched || !b || pair.evidence?.ui.status !== "observed_matching") reasons.push("Postflop readiness did not match.");
          if (!pair || !b || ![at, completedAt, pair.startedAt, pair.completedAt].every(Number.isSafeInteger) || at > pair.startedAt || pair.startedAt > pair.completedAt || pair.completedAt > completedAt || at < b.receivedAt || completedAt >= b.expiresAt || b.expiresAt !== b.receivedAt + 1e4)
            reasons.push("Capture/reply is stale or outside the original source deadline.");
          if (!rawBefore.active || !rawAfter.active || !rawAfter.registeredCaptured || rawAfter.rejectedFrames || JSON.stringify(rawBefore) !== JSON.stringify(rawAfter) || !last || !b || last.sourceCursor !== b.cursor || last.connectionGeneration !== b.generation || last.localReceivedAt > at)
            reasons.push("Raw recorder is missing, changed, rejected frames, or does not match the source cursor/generation.");
          if (tableUrl !== this.d.tableUrl() || pair?.tableUrl !== tableUrl || !b || tableIdFromPath(new URL(tableUrl).pathname) !== b.tableId) reasons.push("Table URL mismatch.");
          const readinessMatched = reasons.length === 0;
          const saved2 = this.retain({
            label,
            capturedAt: at,
            completedAt,
            performanceTime,
            tableUrl,
            postflop: pair,
            rawRecorderBefore: rawBefore,
            rawRecorderAfter: rawAfter,
            readinessMatched,
            reasons,
            legalityCertified: false,
            historyComplete: false,
            liveRecommendationsAllowed: false,
            correlation: "Local read/receipt pairing only; independent recorder/bridge sequences, never server permission or screenshot timing."
          });
          if (saved2.accepted && !readinessMatched) this.refused++;
          return saved2.accepted ? { ...saved2, accepted: readinessMatched, retained: true, readinessMatched, reasons } : saved2;
        }
        if (!dom) return this.refuse("Missing Raise DOM read.");
        const missing = ["Independent minimum, denomination and five-chip server legality are not certified by this collector."], contradictions = [];
        if (reply.error) missing.push(reply.error);
        if (!source) missing.push("No isolated-world source snapshot; source identity/proof unavailable.");
        if (source && !source.connected) missing.push("Source disconnected.");
        if (source && (source.capturedAt < at || source.capturedAt > completedAt)) contradictions.push("Source snapshot time is outside the checkpoint interval; stale or clock-inconsistent observation.");
        if (!source?.identity) missing.push("Hand/player identity unavailable.");
        if (!source?.sourceState) missing.push("Carried source actor/generation/cursor unavailable.");
        if (!source?.firstUtgProof) missing.push("No current firstUtgProof. " + (source?.reason ?? ""));
        const expiry = source?.firstUtgProof?.expiresAt ?? source?.freshness.certificate?.expiresAt;
        if (expiry !== void 0 && completedAt >= expiry) missing.push("Original source proof expired; checkpoint cannot renew it.");
        if (source?.firstUtgProof && source.firstUtgProof.witness.receivedAt > at) contradictions.push("Source witness arrived after DOM checkpoint; not simultaneous evidence.");
        if (!rawBefore.active || !rawAfter.active || rawAfter.rejectedFrames || !rawAfter.registeredCaptured) missing.push("Raw recorder inactive, incomplete, rejected frames, or registration missing; inspect recorder status.");
        if (rawBefore.frameCount !== rawAfter.frameCount) contradictions.push("Incoming frames changed during checkpoint; source and DOM are not an atomic snapshot.");
        if (source?.sourceState && rawAfter.lastRetainedFrame && source.sourceState.generation !== rawAfter.lastRetainedFrame.connectionGeneration) {
          contradictions.push("Raw recorder and source snapshot report different connection generations.");
        }
        if (this.d.tableUrl() !== tableUrl) contradictions.push("Table URL changed during checkpoint.");
        if (completedAt < at) contradictions.push("Local clock regressed during checkpoint.");
        if (!dom.selected.formVisible) missing.push("No visible Raise form.");
        if (dom.selected.selectedRaiseToChips === null) missing.push("Selected chip amount unreadable or missing.");
        if (!dom.selected.raiseSubmitVisible || dom.selected.raiseSubmitEnabled !== true) missing.push("Raise submit absent, hidden or disabled.");
        contradictions.push(...dom.selected.issues);
        if (label === "five_chips_entered" && dom.selected.selectedRaiseToChips !== 5) contradictions.push("Manual five-chip label does not match the observed selected amount.");
        const bb = source?.firstUtgProof?.witness.bigBlind;
        const display = dom.selected.displayedBBText?.match(/^\s*(\d+(?:\.\d+)?)\s*BB\s*$/i);
        if (bb && display && dom.selected.selectedRaiseToChips !== null && Math.abs(Number(display[1]) * bb - dom.selected.selectedRaiseToChips) > 1e-8) {
          contradictions.push("Selected chips and displayed BB disagree under the copied source-proof big blind.");
        }
        const fields = source?.sourceState?.fields;
        if (fields && Object.hasOwn(fields, "cPI") && Object.hasOwn(fields, "pITT") && fields.cPI !== fields.pITT) contradictions.push("Source cPI/pITT differ; do not infer a single current actor.");
        const binding = JSON.stringify([tableUrl, source?.identity, source?.sourceState]);
        if (this.priorBinding !== null && this.priorBinding !== binding) contradictions.push("Source/table/actor binding differs from previous checkpoint; records are separate observations, not merged proof.");
        const record = {
          label,
          labelOrigin: "user-declared operation; not verified or performed by collector",
          capturedAt: at,
          completedAt,
          performanceTime,
          tableUrl,
          source,
          dom,
          rawRecorderBefore: rawBefore,
          rawRecorderAfter: rawAfter,
          correlation: "Local timestamps/frame counts only; raw capture sequence is not bridge/source sequence. No atomic or authoritative association claimed.",
          missingEvidence: missing,
          contradictions,
          legalityCertified: false,
          historyComplete: false
        };
        const saved = this.retain(record);
        if (saved.accepted) this.priorBinding = binding;
        return { ...saved, missingEvidence: missing, contradictions };
      } catch {
        return this.refuse("checkpoint_read_failed; no partial record retained");
      } finally {
        this.busy = false;
      }
    }
    exportJSON() {
      if (this.busy) throw new Error("Wait for the pending checkpoint before export.");
      if (this.exported) throw new Error("Evidence already exported; reload for a new capture.");
      if (this.stopReason === "not_enabled_before_page_load") throw new Error("Collector was not enabled.");
      this.exported = true;
      if (this.active) this.stop("exported");
      return `{"version":1,"origin":"temporary local action-control diagnostics; never legality proof","exportedAt":${this.d.now()},"capture":${JSON.stringify(this.status())},"checkpoints":[${this.records.join(",")}],"rawSocket":${this.d.raw.exportJSON()}}`;
    }
  };
  function installRaiseEvidenceCollector(target, raw) {
    const collector = new RaiseEvidenceCollector(enabled(target), {
      raw,
      dom: () => readRaiseCheckpointDOM(target.document),
      tableUrl: () => target.location.origin + target.location.pathname,
      now: () => Date.now(),
      monotonic: () => target.performance.now(),
      disarm: () => {
        try {
          target.sessionStorage.removeItem(RAISE_CAPTURE_KEY);
          target.sessionStorage.removeItem(RAW_CAPTURE_KEY);
        } catch {
        }
      },
      source: (label) => new Promise((resolve) => {
        const requestId = crypto.randomUUID();
        const finish = (result) => {
          target.clearTimeout(timer);
          target.removeEventListener("message", receive);
          resolve(result);
        };
        const receive = (event) => {
          if (event.source !== target || event.origin !== target.location.origin || event.data?.channel !== CHANNEL || event.data.type !== "checkpoint_source_result" || event.data.requestId !== requestId) return;
          try {
            if (bytes(JSON.stringify(event.data)) > 34 * 1024) {
              finish({ source: null, error: "Source reply exceeds diagnostic limit." });
              return;
            }
            finish({ source: event.data.source ?? null, postflop: event.data.postflop ?? null, error: event.data.error ?? null });
          } catch {
            finish({ source: null, error: "Unreadable diagnostic source reply." });
          }
        };
        const timer = target.setTimeout(() => finish({ source: null, error: "Source diagnostic response timed out; no cached proof substituted." }), 750);
        target.addEventListener("message", receive);
        target.postMessage({ channel: CHANNEL, type: "checkpoint_source", requestId, label }, target.location.origin);
      })
    });
    Object.defineProperty(target, "pokerAIRaiseCapture", { configurable: true, value: Object.freeze({
      status: () => collector.status(),
      checkpoint: (label) => collector.checkpoint(label),
      exportJSON: () => collector.exportJSON(),
      stop: () => collector.stop()
    }) });
    return collector;
  }

  // src/eventSource.ts
  var tableId = tableIdFromPath(location.pathname);
  if (tableId && typeof window.WebSocket === "function") {
    let rawCapture;
    try {
      rawCapture = installRawSocketCapture(window);
    } catch {
    }
    try {
      if (rawCapture) installRaiseEvidenceCollector(window, rawCapture);
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
