# V1 architecture

1. **DOM reader:** `tableRead.ts` extracts named seats, visible card evidence,
   stacks, contribution labels, pot displays, blinds, dealer and raise controls.
   Duplicate/missing critical selectors are recorded rather than guessed.
2. **State assessment:** browser-reader assembles cards/street, provisional call
   gaps and seat positions. `dataConfidence` blocks inconsistent or missing
   decision-critical data. The two pot displays are preserved separately.
3. **History and opponents:** polling compares snapshots. The history is partial,
   not an authoritative hand log. Opponent observations persist through a local
   SQLite service; partial histories do not manufacture statistical denominators.
   Storage outages supply population priors and an unavailable status. An explicit
   storage failure in a packet blocks advice; an available database with no history
   remains a distinct, valid prior-only case.
4. **Facts and estimates:** poker-engine evaluates hands and random-hand equity;
   range-engine samples weighted ranges with blockers and split ties. Range
   heuristics carry their basis/confidence. Multiway showdown share is not
   side-pot EV. Preflop context classifies situations but does not solve them.
5. **Packet and policy:** DecisionPacket validates cards, street, monetary fields
   and provenance. Missing confidence defaults low. The policy selects only
   supported comparisons with explicit evidence and uncertainty; unsupported
   legality/pot evidence abstains. The live reader currently cannot supply the
   complete inputs needed to unlock this layer.
6. **Relay/LLM:** the loopback-only Express relay validates requests and refreshes
   opponent profiles. Engine selections are action-locked; the LLM may explain
   them but cannot replace the action. Permitted legacy fallbacks receive legality
   checking; consistency warnings remain advisory. Fast mode tries providers in
   registry latency order: Groq, Gemini if configured, then NVIDIA if configured.
   Each provider has a 20-second request timeout. Live consensus is disabled;
   library consensus still validates each fallback and abstains on total failure.
7. **Overlay:** a full raw-state/control/table fingerprint plus a monotonic epoch
   identifies observed decisions. Old responses are discarded; invalid responses
   and polling exceptions clear recommendations. Relay requests time out after
   70 seconds. Everything remains read-only.

## Execution and trust boundaries

Packages compile to `dist`; their package entries load compiled JavaScript.
The relay runs `src/server.ts` using Node type stripping but imports package
`dist` files. esbuild embeds package output into the generated Chrome bundle.
Guarded root commands force rebuilds; restarting Node and refreshing Chrome are
still required. There is no source watcher or guaranteed automatic hot reload.

The relay binds to IPv4 loopback, accepts local Host values, and allows browser
origins only from the four PokerNow origins in the extension manifest. Missing
Origin is allowed for local CLI clients. It has no authentication against other
local processes and is not configured for remote deployment. `RELAY_PORT` can
change the port for testing; the extension URL remains 8787 unless edited.

Provider model availability, credentials and quotas remain external dependencies.
Mocked failover tests do not certify that a registered model is currently offered.
