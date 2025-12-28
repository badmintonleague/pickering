let PLAYERS = {};
let STATS = [];

const leaderboardEl = document.getElementById("leaderboard");
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.onclick = () => menu.classList.toggle("hidden");

(async function () {
  PLAYERS = await loadPlayers();
  STATS = await apiGet("getRankings");

  leaderboardEl.innerHTML = "";

  STATS
    .sort((a, b) => b.winPct - a.winPct)
    .forEach((p, i) => {
      const name = PLAYERS[p.playerId]?.name || `Player ${p.playerId}`;

      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";

      card.innerHTML = `
        <strong>#${i + 1} ${name}</strong><br>
        Win%: ${(p.winPct * 100).toFixed(1)}%<br>
        GP: ${p.gamesPlayed}<br>
        PF: ${p.pf} | PA: ${p.pa}
      `;

      card.addEventListener("click", () => openPlayerModal(p));

      leaderboardEl.appendChild(card);
    });
})();

function openPlayerModal(playerStat) {
  const player = PLAYERS[playerStat.playerId];
  if (!player) return;

  const emoji = player.gender === "M" ? "♂️" : "♀️";

  document.getElementById("playerName").innerText = player.name;
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
