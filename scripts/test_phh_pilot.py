"""Real fixture replay plus explicitly synthetic corruption/visibility tests."""
import copy
import json
from pathlib import Path
import unittest
from unittest.mock import patch

import phh_pilot as pilot


class PhhPilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.entries = pilot.load_sources()
        cls.report = pilot.run(cls.entries)

    def entry(self, suffix="100/0.phh"):
        return copy.deepcopy(next(e for e in self.entries if e["path"].endswith(suffix)))

    def test_real_census_and_exact_regeneration(self):
        report = self.report
        self.assertEqual(report["sourceBytes"], 314705)
        self.assertEqual(report["acceptedHands"], 447)
        self.assertEqual(report["actionCounts"], {"preflop": 2758, "flop": 609, "turn": 376, "river": 258})
        self.assertEqual(report["duplicates"], [])
        self.assertEqual(len(report["rejectedHands"]), 1)
        self.assertEqual(report["rejectedHands"][0]["path"], "data/pluribus/102/0.phh")
        self.assertEqual(report["postflopExclusions"], {"not_heads_up_binary_response": 1235})
        expected = json.loads((pilot.ROOT / "scripts/fixtures/phh/observations.json").read_text())
        self.assertEqual({k: report[k] for k in expected}, expected)

    def test_tournament_stays_separate(self):
        t = self.report["tournament"]
        self.assertEqual(t["hands"], 83)
        self.assertEqual(t["variants"]["NT"], 11)
        self.assertTrue(all(r["players"] == 5 and r["antes"][1] / r["blinds"][1] == 1.5
                            for r in t["records"] if r["variant"] == "NT"))
        self.assertTrue(all("wsop" not in r["sourcePath"] for r in self.report["rows"]))

    def test_pre_action_accounting_not_post_action_totals(self):
        r = pilot.replay(self.entry("105/14.phh"))["rows"][0]
        self.assertEqual(r["legalContext"], {"actorStack": 3975, "actorBet": 3050,
                         "otherStack": 0, "otherBet": 7025, "activePlayers": 2, "canRaise": False})
        self.assertEqual(r["potBB"], 161.75)
        self.assertEqual(r["facingAmountBB"], (7025 - 3050) / 100)
        self.assertEqual(r["callToBB"], (3050 + 3975) / 100)
        self.assertEqual((r["position"], r["facingPosition"], r["priorRaises"], r["facing"]), ("UTG", "HJ", 1, "raise"))

    def test_missing_check_is_rejected_not_repaired(self):
        e = self.entry()
        e["content"] = e["content"].replace("'d db 7d5h9d', 'p1 cc',", "'d db 7d5h9d',")
        with self.assertRaisesRegex(ValueError, "Out-of-order actor"):
            pilot.replay(e)

    def test_incomplete_history_is_rejected(self):
        e = self.entry()
        e["content"] = e["content"].replace(", 'p4 f']", "]")
        with self.assertRaisesRegex(ValueError, "nonterminal"):
            pilot.replay(e)

    def test_illegal_raise_is_rejected(self):
        e = self.entry()
        e["content"] = e["content"].replace("p4 cbr 210", "p4 cbr 150")
        with self.assertRaises(ValueError):
            pilot.replay(e)

    def test_duplicate_cards_are_rejected(self):
        e = self.entry()
        e["content"] = e["content"].replace("d db 7d5h9d", "d db Tc5h9d")
        with self.assertRaises((ValueError, Warning)):
            pilot.replay(e)

    def test_whole_hand_failure_discards_prior_candidate(self):
        e = self.entry("100/61.phh")
        d = pilot.tomllib.loads(e["content"])
        before = str(d["finishing_stacks"])
        changed = list(d["finishing_stacks"])
        changed[0] += 1
        changed[1] -= 1
        self.assertIn(before, e["content"])
        e["content"] = e["content"].replace(before, str(changed))
        result = pilot.run([e])
        self.assertEqual(result["binaryObservations"], 0)
        self.assertIn("Final stacks mismatch", result["rejectedHands"][0]["reason"])

    def test_unknown_opponent_cards_never_guessed(self):
        e = self.entry("102/23.phh")
        e["content"] = e["content"].replace("d dh p6 TdAd", "d dh p6 ????")
        self.assertIsNone(pilot.replay(e)["rows"][0]["holeCards"])

    def test_unknown_observer_cards_excluded(self):
        e = self.entry("102/23.phh")
        e["content"] = e["content"].replace("d dh p2 6d2d", "d dh p2 ????")
        result = pilot.replay(e)
        self.assertEqual(result["rows"], [])
        self.assertEqual(result["exclusions"]["unknown_observer_cards"], 1)

    def test_duplicate_hand_and_unordered_deal_not_double_counted(self):
        a, b = self.entry(), self.entry()
        self.assertEqual(len(pilot.run([a, b])["duplicates"]), 1)
        b["path"] = "data/pluribus/103/999.phh"
        b["content"] = b["content"].replace("hand = 0", "hand = 999").replace("TcQc", "QcTc")
        result = pilot.run([a, b])
        self.assertEqual(result["acceptedHands"], 1)
        self.assertEqual(len(result["duplicates"]), 1)

    def test_conflicting_same_hand_identity_rejects_cohort(self):
        a, b = self.entry(), self.entry()
        b["content"] = b["content"].replace("MrBlue", "different-public-alias")
        with self.assertRaisesRegex(ValueError, "Conflicting records"):
            pilot.run([a, b])

    def test_invalid_conflicting_copy_cannot_hide_behind_rejection(self):
        a, b = self.entry(), self.entry()
        b["content"] = b["content"].replace("p4 cbr 210", "p4 cbr 150")
        for entries in ([a, b], [b, a]):
            with self.assertRaisesRegex(ValueError, "Conflicting records"):
                pilot.run(entries)

    def test_modified_source_bytes_rejected_before_replay(self):
        bundle = json.loads((pilot.ROOT / "scripts/fixtures/phh/pilot.json").read_text())
        bundle["files"][0]["content"] += " "
        with patch.object(Path, "read_text", return_value=json.dumps(bundle)):
            with self.assertRaisesRegex(ValueError, "byte count mismatch"):
                pilot.load_sources()


if __name__ == "__main__":
    unittest.main()
