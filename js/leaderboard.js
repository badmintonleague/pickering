let PLAYERS = {};
let STATS = [];

const leaderboardEl = document.getElementById("leaderboard");
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.onclick = () => menu.classList.toggle("hidden");

(async function () {
  // ✅ load players as-is
  PLAYERS = await loadPlayers();

  STATS = await apiGet("getRankings");

  leaderboardEl.innerHTML = "";

  STATS
    .sort((a, b) => b.winPct - a.winPct)
    .forEach((p, i) => {
      const player = PLAYERS[p.playerId];
      const name =
        typeof player === "string"
          ? player
          : player?.name || `Player ${p.playerId}`;

      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";
      
      // Apply rank styling
      if (i === 0) card.classList.add("rank-1");
      if (i === 1) card.classList.add("rank-2");
      if (i === 2) card.classList.add("rank-3");


      card.innerHTML = `
        <strong>#${i + 1} ${name}</strong><br>
        Win PCT: ${(p.winPct * 100).toFixed(1)}%<br>
        GP: ${p.gamesPlayed}<br>
        <!-- PF: ${p.pf} | PA: ${p.pa} -->
      `;

      card.addEventListener("click", () => openPlayerModal(p));

      leaderboardEl.appendChild(card);
    });
})();

/********************
 * PLAYER MODAL
 ********************/

function openPlayerModal(playerStat) {
  const player = PLAYERS[playerStat.playerId];
  if (!player) return;

  const gender = typeof player === "string" ? null : player.gender;
  const name = typeof player === "string" ? player : player.name;

  const emoji =
    gender === "M" ? "♂️" :
    gender === "F" ? "♀️" :
    "";

  document.getElementById("playerName").innerText = name;
  document.getElementById("playerEmoji").innerText = emoji;

  document.getElementById("playerStats").innerHTML = `
    <div class="player-stat"><span>Games Played</span><span>${playerStat.gamesPlayed}</span></div>
    <div class="player-stat"><span>Wins</span><span>${playerStat.wins}</span></div>
    <div class="player-stat"><span>Losses</span><span>${playerStat.losses}</span></div>
    <div class="player-stat"><span>Win %</span><span>${(playerStat.winPct * 100).toFixed(1)}%</span></div>
    <div class="player-stat"><span>Points For</span><span>${playerStat.pf}</span></div>
    <div class="player-stat"><span>Points Against</span><span>${playerStat.pa}</span></div>
  `;

  document.getElementById("playerBackdrop").classList.remove("hidden");
  document.getElementById("playerModal").classList.remove("hidden");
}

function closePlayerModal() {
  document.getElementById("playerBackdrop").classList.add("hidden");
  document.getElementById("playerModal").classList.add("hidden");
}
