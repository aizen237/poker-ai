import Database from "better-sqlite3";
import type { PlayerHandActions } from "./types.js";

export type OpponentDatabase = ReturnType<typeof openDatabase>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS player_hand_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  vpip INTEGER NOT NULL,
  pfr INTEGER NOT NULL,
  three_bet INTEGER NOT NULL,
  faced_three_bet INTEGER NOT NULL,
  folded_to_three_bet INTEGER NOT NULL,
  c_bet INTEGER NOT NULL,
  had_c_bet_opportunity INTEGER NOT NULL,
  faced_c_bet INTEGER NOT NULL,
  folded_to_c_bet INTEGER NOT NULL,
  went_to_showdown INTEGER NOT NULL,
  won_at_showdown INTEGER NOT NULL,
  bets_and_raises INTEGER NOT NULL,
  calls INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_player_hand_actions_player_name
  ON player_hand_actions(player_name);
`;

/**
 * Opens (creating if needed) a SQLite database at the given path, or
 * ":memory:" for an ephemeral in-memory database (used by tests, so
 * they never touch disk or leave artifacts behind).
 */
export function openDatabase(filePath: string) {
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);

  const insertStmt = db.prepare(`
    INSERT INTO player_hand_actions (
      player_name, vpip, pfr, three_bet, faced_three_bet, folded_to_three_bet,
      c_bet, had_c_bet_opportunity, faced_c_bet, folded_to_c_bet,
      went_to_showdown, won_at_showdown, bets_and_raises, calls
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const selectByPlayerStmt = db.prepare(`
    SELECT * FROM player_hand_actions WHERE player_name = ?
  `);

  function recordHandActions(actions: PlayerHandActions): void {
    insertStmt.run(
      actions.playerName,
      actions.vpip ? 1 : 0,
      actions.pfr ? 1 : 0,
      actions.threeBet ? 1 : 0,
      actions.facedThreeBet ? 1 : 0,
      actions.foldedToThreeBet ? 1 : 0,
      actions.cBet ? 1 : 0,
      actions.hadCBetOpportunity ? 1 : 0,
      actions.facedCBet ? 1 : 0,
      actions.foldedToCBet ? 1 : 0,
      actions.wentToShowdown ? 1 : 0,
      actions.wonAtShowdown ? 1 : 0,
      actions.betsAndRaises,
      actions.calls,
    );
  }

  function getPlayerHandActions(playerName: string): PlayerHandActions[] {
    const rows = selectByPlayerStmt.all(playerName) as Record<string, unknown>[];
    return rows.map((row) => ({
      playerName: row.player_name as string,
      vpip: Boolean(row.vpip),
      pfr: Boolean(row.pfr),
      threeBet: Boolean(row.three_bet),
      facedThreeBet: Boolean(row.faced_three_bet),
      foldedToThreeBet: Boolean(row.folded_to_three_bet),
      cBet: Boolean(row.c_bet),
      hadCBetOpportunity: Boolean(row.had_c_bet_opportunity),
      facedCBet: Boolean(row.faced_c_bet),
      foldedToCBet: Boolean(row.folded_to_c_bet),
      wentToShowdown: Boolean(row.went_to_showdown),
      wonAtShowdown: Boolean(row.won_at_showdown),
      betsAndRaises: row.bets_and_raises as number,
      calls: row.calls as number,
    }));
  }

  function close(): void {
    db.close();
  }

  return { recordHandActions, getPlayerHandActions, close };
}