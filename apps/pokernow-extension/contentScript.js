console.log("[Poker AI Reader] Content script loaded on:", window.location.href);

function readBoardCards() {
  const boardContainer = document.querySelector(".table-cards");
  if (!boardContainer) {
    return null;
  }

  const cardContainers = boardContainer.querySelectorAll(".card-container");
  const cards = [];

  for (const container of cardContainers) {
    const valueEl = container.querySelector(".value");
    const suitEl = container.querySelector(".suit");
    if (valueEl && suitEl) {
      cards.push({ value: valueEl.textContent.trim(), suit: suitEl.textContent.trim() });
    }
  }

  return cards;
}

let lastBoardJson = null;

setInterval(() => {
  const board = readBoardCards();
  const boardJson = JSON.stringify(board);

  // Only log when something actually changed, so the console isn't
  // spammed every second with identical output.
  if (boardJson !== lastBoardJson) {
    console.log("[Poker AI Reader] Board cards changed:", board);
    lastBoardJson = boardJson;
  }
}, 1000);