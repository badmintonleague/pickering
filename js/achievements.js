let PLAYERS = {};

const container = document.getElementById("achievements");

(async function renderAchievements() {
  PLAYERS = await loadPlayers();
  const rows = await apiGet("getAchievements");

  container.innerHTML = "";

  renderTop3({
    title: "🏆 Tournament Champion",
    subtitle: "Most tournament wins",
    rows,
    valueKey: "tournamentWins"
  });

  renderTop3({
    title: "🔥 Streak Master",
    subtitle: "Longest win streak",
    rows,
    valueKey: "longestWinStreak"
  });

  renderTop3({
    title: "🧱 Ever-Present",
    subtitle: "Most games played",
    rows,
    valueKey: "gamesPlayed"
  });
})();

/***********************
 * RENDER HELPERS
 ***********************/

function renderTop3({ title, subtitle, rows, valueKey }) {
  const card = document.createElement("div");
  card.className = "card";

  const top = rows
    .filter(r => Number(r[valueKey]) > 0)
    .sort((a, b) => b[valueKey] - a[valueKey])
    .slice(0, 3);

  let html = `
    <h3>${title}</h3>
    <p class="muted">${subtitle}</p>
  `;

  if (top.length === 0) {
    html += `<p class="muted">No data yet.</p>`;
  } else {
    top.forEach((r, i) => {
      const name = PLAYERS[r.playerId] || `Player ${r.playerId}`;
      html += `
        <div class="player-stat">
          <span>#${i + 1} ${name}</span>
          <strong>${r[valueKey]}</strong>
        </div>
      `;
    });
  }

  card.innerHTML = html;
  container.appendChild(card);
}
