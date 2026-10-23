"""Bounded, offline PHH replay. No downloads, action repair, or poker decisions.

Python 3.11+ and scripts/phh-requirements.txt. Source bytes and their Git blob
identities are retained in the MIT-licensed fixtures. PokerKit's state_actions
iterator is deliberately NOT used: it can invent checks/folds to repair a hand.
"""
import argparse
from collections import Counter
import hashlib
import importlib.metadata
import json
from pathlib import Path
import re
import tomllib
import warnings

from pokerkit import HandHistory, parse_action

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "e47fbd5816372360bade4de5d712346fe1bb70f6"
SPEC_COMMIT = "c1bd44c3d0faef9ed989be8d6675f814c0e0f62d"
SOURCE = "https://github.com/uoftcprg/phh-dataset"
POSITIONS = ["SB", "BB", "UTG", "HJ", "CO", "BTN"]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def load_sources():
    files = []
    for name in ("pilot.json", "pilot-expansion.json"):
        bundle = json.loads((ROOT / "scripts/fixtures/phh" / name).read_text(encoding="utf-8"))
        require(bundle["schemaVersion"] == 1 and bundle["repository"] == SOURCE
                and bundle["commit"] == COMMIT and bundle["specCommit"] == SPEC_COMMIT, "Unpinned source")
        files.extend(bundle["files"])
    require(len(files) <= 600 and sum(f["bytes"] for f in files) <= 1_000_000, "Pilot size bound exceeded")
    for f in files:
        raw = f["content"].encode()
        require(len(raw) == f["bytes"], "Source byte count mismatch")
        require(hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() == f["gitBlob"],
                "Source Git blob mismatch")
    return sorted(files, key=lambda f: f["path"])


def known_pair(value):
    return re.fullmatch(r"(?:[2-9TJQKA][cdhs]){2}", value) is not None


def replay(entry):
    """Return observations only AFTER the complete hand and payouts validate.

    This adapter accepts just the inspected six-seat, 100 BB Pluribus profile.
    Unknown cards remain unknown. Original deal cards are archive-only labels;
    only the selected observer's own two cards enter predictor visibility.
    """
    d = tomllib.loads(entry["content"])
    match = re.fullmatch(r"data/pluribus/(10[0-5])/(\d+)\.phh", entry["path"])
    require(match is not None, "Unsupported source path")
    block, hand = match.groups()
    require(d.get("hand") == int(hand), "Path/hand identity mismatch")
    require(set(d) == {"variant", "ante_trimming_status", "antes", "blinds_or_straddles", "min_bet",
                       "starting_stacks", "actions", "hand", "players", "finishing_stacks"}, "Unsupported/missing PHH fields")
    require(d["variant"] == "NT" and d["antes"] == [0] * 6 and d["ante_trimming_status"] is True
            and d["blinds_or_straddles"] == [50, 100, 0, 0, 0, 0] and d["min_bet"] == 100
            and d["starting_stacks"] == [10000] * 6, "Unsupported gameplay profile")
    require(len(d["players"]) == 6 and len(set(d["players"])) == 6
            and all(isinstance(p, str) and p.strip() for p in d["players"]), "Missing/duplicate participants")
    require(len(d["finishing_stacks"]) == 6 and all(type(v) is int and v >= 0 for v in d["finishing_stacks"])
            and sum(d["finishing_stacks"]) == 60000, "Unsupported fractional payout or final accounting/rake")
    require(6 < len(d["actions"]) <= 200, "Incomplete/oversized action list")
    holes = []
    for seat, action in enumerate(d["actions"][:6], 1):
        m = re.fullmatch(rf"d dh p{seat} ((?:[2-9TJQKA][cdhs]|\?\?){{2}})", action)
        require(m is not None, "Missing/ambiguous initial deal")
        holes.append(m[1])
    # Recognize duplicate deals/actions even when hand numbers or player aliases differ.
    canonical_actions = []
    for action in d["actions"]:
        words = action.split()
        if words[:2] == ["d", "dh"] or (len(words) == 3 and words[1] == "sm" and words[2] != "-"):
            words[-1] = "".join(sorted(re.findall("..", words[-1])))
        elif words[:2] == ["d", "db"] and len(words[2]) == 6:
            words[2] = "".join(sorted(re.findall("..", words[2])))
        canonical_actions.append(" ".join(words))
    fingerprint = digest({**{k: d[k] for k in ("variant", "antes", "blinds_or_straddles", "starting_stacks")},
                          "actions": canonical_actions})
    hand_id = f"phh-pluribus:{block}:{hand}"
    participants = ["phh-player:" + digest(p)[:20] for p in d["players"]]
    ref = f"{SOURCE}/blob/{COMMIT}/{entry['path']}"
    rows, actions, exclusions = [], Counter(), Counter()
    board, aggressions, last_aggressor = [], 0, None
    # Treat every warning as rejection, including duplicate/unavailable cards.
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        hh = HandHistory.loads(entry["content"])
        state = hh.create_state()
        for index, action in enumerate(d["actions"]):
            # Forced unknown burns are permitted by PHH; never fill dealt cards,
            # player choices, missing board cards, or missing showdown actions.
            if state.can_burn_card():
                state.burn_card("??")
            words = action.split()
            require(index < 6 or re.fullmatch(r"(?:d db (?:[2-9TJQKA][cdhs]){1,3}|p[1-6] (?:cc|f|cbr [1-9][0-9]*|sm(?: (?:-|(?:[2-9TJQKA][cdhs]|\?\?){2}))?))", action),
                    "Unsupported/ambiguous action notation")
            if words[:2] == ["d", "db"]:
                board.extend(re.findall("..", words[2]))
                aggressions, last_aggressor = 0, None
            elif words[0].startswith("p") and words[1] in ("cc", "f", "cbr"):
                actor = int(words[0][1:]) - 1
                require(actor == state.actor_index, "Out-of-order actor")
                street = ["preflop", "flop", "turn", "river"][state.street_index]
                actions[street] += 1
                if street != "preflop":
                    require(len(board) == {"flop": 3, "turn": 4, "river": 5}[street], "Street/board mismatch")
                    call = state.checking_or_calling_amount
                    live = [i for i, active in enumerate(state.statuses) if active]
                    if not (call and len(live) == 2 and not state.can_complete_bet_or_raise_to()):
                        exclusions["not_heads_up_binary_response"] += 1
                    else:
                        observer = next(i for i in live if i != actor)
                        require(last_aggressor == observer and state.can_fold() and state.can_check_or_call(),
                                "Unproven exhaustive fold/call alternatives")
                        require(state.stacks[observer] == 0 or call == state.stacks[actor], "Unproven raise restriction")
                        require(words[1] in ("f", "cc"), "Action outside binary space")
                        if not known_pair(holes[observer]):
                            exclusions["unknown_observer_cards"] += 1
                        else:
                            ordinal = index + 1
                            rows.append({
                                "handId": hand_id, "eventId": f"{hand_id}:action:{ordinal}",
                                # Source directories are blocks, not authenticated independent sessions.
                                "sessionId": "phh-pluribus:2019-study", "playerIds": participants,
                                "opponentId": participants[actor], "actorPopulation": "bot" if d["players"][actor] == "Pluribus" else "human",
                                "sourceRef": ref, "sourcePath": entry["path"], "handFingerprint": fingerprint,
                                "split": "development" if int(block) <= 102 else "evaluation",
                                "observation": ordinal, "board": list(board), "street": street,
                                "position": POSITIONS[actor], "facingPosition": POSITIONS[observer],
                                "priorRaises": max(0, aggressions - 1), "facing": "raise" if aggressions > 1 else "bet",
                                "potBB": state.total_pot_amount / 100, "facingAmountBB": call / 100,
                                "effectiveStackBB": state.get_effective_stack(actor) / 100,
                                "callToBB": (state.bets[actor] + call) / 100,
                                "callIsAllIn": call == state.stacks[actor],
                                "heroCards": re.findall("..", holes[observer]),
                                "holeCards": re.findall("..", holes[actor]) if known_pair(holes[actor]) else None,
                                "label": "fold" if words[1] == "f" else "call",
                                "legalContext": {"actorStack": state.stacks[actor], "actorBet": state.bets[actor],
                                                 "otherStack": state.stacks[observer], "otherBet": state.bets[observer],
                                                 "canRaise": False, "activePlayers": 2},
                            })
                if words[1] == "cbr":
                    aggressions += 1
                    last_aggressor = actor
            # Direct parsing validates both actor order and legal bet-to amounts.
            parse_action(state, action)
        require(not state.status, "Incomplete hand: nonterminal state")
        require(state.stacks == d["finishing_stacks"], "Final stacks mismatch; no accounting repair permitted")
    require(len(rows) <= 1, "Unexpected multiple terminal decisions")
    return {"path": entry["path"], "handId": hand_id, "fingerprint": fingerprint, "recordIdentity": digest(d),
            "actions": dict(actions), "exclusions": dict(exclusions), "rows": rows}


def tournament_audit(entries):
    """Metadata census only. Mixed-variant tournament hands are NEVER replayed
    with HandHistory.create_state(), which defaults to cash-game rules.
    """
    records = []
    for entry in entries:
        d = tomllib.loads(entry["content"])
        bb = max(d.get("blinds_or_straddles", [0]))
        records.append({"path": entry["path"], "variant": d["variant"], "players": len(d["starting_stacks"]),
                        "blinds": d.get("blinds_or_straddles"), "antes": d["antes"],
                        "bringIn": d.get("bring_in"), "smallBet": d.get("small_bet"), "bigBet": d.get("big_bet"),
                        "stacks": d["starting_stacks"],
                        "stackDepthsBB": [s / bb for s in d["starting_stacks"]] if bb else None,
                        "unknownCardTokens": sum(a.count("??") for a in d["actions"]),
                        "hasFinishingStacks": "finishing_stacks" in d,
                        "eligibility": "excluded_tournament_profile_not_replayed"})
    return {"hands": len(records), "variants": dict(Counter(r["variant"] for r in records)), "records": records}


def run(entries=None):
    require(importlib.metadata.version("pokerkit") == "0.7.7", "Replay requires pinned PokerKit 0.7.7")
    entries = load_sources() if entries is None else entries
    accepted, rejected, duplicates = [], [], []
    identities, fingerprints = {}, set()
    paths = {}
    # An invalid conflicting copy must not let the other copy win by ordering.
    for entry in entries:
        require(entry["path"] not in paths or paths[entry["path"]] == entry["content"],
                "Conflicting records for same source path")
        paths[entry["path"]] = entry["content"]
    for entry in entries:
        if "/pluribus/" not in entry["path"]:
            continue
        try:
            result = replay(entry)
        except (ValueError, Warning, KeyError, TypeError, IndexError, AssertionError) as error:
            rejected.append({"path": entry["path"], "reason": str(error)})
            continue
        key, fingerprint = result["handId"], result["fingerprint"]
        require(key not in identities or identities[key] == result["recordIdentity"], "Conflicting records for same hand identity")
        if fingerprint in fingerprints or key in identities:
            duplicates.append({"path": entry["path"], "reason": "duplicate_hand_or_deal_actions"})
            continue
        identities[key] = result["recordIdentity"]
        fingerprints.add(fingerprint)
        accepted.append(result)
    counts, exclusions = Counter(), Counter()
    for r in accepted:
        counts.update(r["actions"])
        exclusions.update(r["exclusions"])
    rows = [row for r in accepted for row in r["rows"]]
    return {"schemaVersion": 1, "sourceCommit": COMMIT, "specCommit": SPEC_COMMIT, "parser": "PokerKit 0.7.7 direct parse_action",
            "sourceBytes": sum(f["bytes"] for f in entries), "sourceFiles": len(entries),
            "acceptedHands": len(accepted), "rejectedHands": rejected, "duplicates": duplicates,
            "actionCounts": dict(counts), "postflopExclusions": dict(exclusions),
            "binaryObservations": len(rows), "rows": rows,
            "handAudit": [{k: v for k, v in r.items() if k != "rows"} for r in accepted],
            "tournament": tournament_audit([f for f in entries if "/wsop/" in f["path"]])}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = run()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in ("rows", "handAudit", "tournament")}))
