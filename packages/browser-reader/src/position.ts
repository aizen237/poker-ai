import type { SeatState } from "./gameState.js";

export type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";

/**
 * Assigns each occupied seat's table position relative to the dealer
 * button. Filters on isOccupied only, never isFolded -- a seat's
 * position is fixed at the start of the hand and does not change if
 * that player later folds.
 *
 * Positions finer than this 6-label schema (UTG/HJ/CO/BTN/SB/BB) can
 * express are all collapsed into "UTG" -- a deliberate V1
 * simplification: a 9-handed table has four genuinely different
 * early/middle positions that all get labeled "UTG" here.
 *
 * Heads-up (2 occupied seats) is a special case: the button also posts
 * the small blind in real heads-up play, so there is no separate SB
 * seat -- the button seat is labeled BTN and the other seat BB.
 */
export function assignPositions(seats: readonly SeatState[], dealerSeatNumber: number): Map<number, Position> {
  const occupied = seats.filter((s) => s.isOccupied).sort((a, b) => a.seatNumber - b.seatNumber);
  const positions = new Map<number, Position>();
  if (occupied.length === 0) return positions;

  const dealerIndex = occupied.findIndex((s) => s.seatNumber === dealerSeatNumber);
  if (dealerIndex === -1) {
    // Dealer button is on a seat we don't recognize as occupied (stale
    // read, or a seat that just left) -- can't safely assign positions.
    return positions;
  }

  // Rotate so the button seat is first, in clockwise (ascending,
  // wrapping) seat-number order from there.
  const clockwise = [...occupied.slice(dealerIndex), ...occupied.slice(0, dealerIndex)];
  const n = clockwise.length;

  clockwise.forEach((seat, i) => {
    let position: Position;
    if (i === 0) {
      position = "BTN";
    } else if (n === 2) {
      position = "BB"; // heads-up: no separate SB seat, see doc comment above
    } else if (i === 1) {
      position = "SB";
    } else if (i === 2) {
      position = "BB";
    } else if (i === n - 1) {
      position = "CO";
    } else if (i === n - 2 && n >= 6) {
      position = "HJ";
    } else {
      position = "UTG";
    }
    positions.set(seat.seatNumber, position);
  });

  return positions;
}