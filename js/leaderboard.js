let PLAYERS = {};
let STATS = [];
let ALL_TOURNAMENTS = null;
let TOURNAMENTS_LOADED_AT = 0;
let RANK_CHANGES = {}; // 👈 NEW

const leaderboardEl = document.getElementById("leaderboard");
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.onclick = () => menu.classList.toggle("hidden");

/********************
 * INITIAL LOAD
 ********************/

(async function initLeaderboard() {
  const [players, rankings, rankChanges] = await Promise.all([
    loadPlayers(),
    apiGet("getRankings"),
    apiGet("getRankChanges") // 👈 NEW
  ]);

  PLAYERS = players;
  STATS = rankings;
  RANK_CHANGES = rankChanges || {};

  renderLeaderboard();

  // 🔥 Background prefetch (non-blocking)
  prefetchTournaments();
})();

/********************
 * RENDER LEADERBOARD
 ********************/

function renderLeaderboard() {
  leaderboardEl.innerHTML = "";

  STATS
    .sort((a, b) =>
      (b.winPct - a.winPct) ||
      ((b.pf - b.pa) - (a.pf - a.pa)) ||
      (b.wins - a.wins)
    )
    .forEach((p, i) => {
      const name = PLAYERS[p.playerId] || `Player ${p.playerId}`;
      const pd = p.pf - p.pa;

      // 👇 Rank movement logic
      const delta = RANK_CHANGES[p.playerId];
      let movement = "—";
      let movementClass = "rank-flat";

      if (delta === null) {
        movement = "🆕";
        movementClass = "rank-new";
      } else if (delta > 0) {
        movement = `⬆️ ${delta}`;
        movementClass = "rank-up";
      } else if (delta < 0) {
        movement = `⬇️ ${Math.abs(delta)}`;
        movementClass = "rank-down";
      }

      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";

      if (i === 0) card.classList.add("rank-1");
      if (i === 1) card.classList.add("rank-2");
      if (i === 2) card.classList.add("rank-3");

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>#${i + 1} ${name}</strong>
          <span class="rank-move ${movementClass}">${movement}</span>
        </div>
        Win PCT: ${(p.winPct * 100).toFixed(1)}%<br>
        GP: ${p.gamesPlayed} || PD: ${pd > 0 ? "+" : ""}${pd}
      `;

      card.onclick = () => openPlayerModal(p);
      leaderboardEl.appendChild(card);
    });
}

/********************
 * PLAYER MODAL
 ********************/

function openPlayerModal(playerStat) {
  const playerName = PLAYERS[playerStat.playerId];
  if (!playerName) return;

  document.getElementById("playerName").innerText = playerName;
  document.getElementById("playerEmoji").innerText = "";

  const tabStats = document.getElementById("tabStats");
  const tabMatchups = document.getElementById("tabPartners");
  const statsEl = document.getElementById("playerStats");
  const matchupsEl = document.getElementById("playerPartners");

  tabStats.classList.add("active");
  tabMatchups.classList.remove("active");
  statsEl.classList.remove("hidden");
  matchupsEl.classList.add("hidden");

  statsEl.innerHTML = `
    <div class="player-stat"><span>Games Played</span><span>${playerStat.gamesPlayed}</span></div>
    <div class="player-stat"><span>Wins</span><span>${playerStat.wins}</span></div>
    <div class="player-stat"><span>Losses</span><span>${playerStat.losses}</span></div>
    <div class="player-stat"><span>Win %</span><span>${(playerStat.winPct * 100).toFixed(1)}%</span></div>
    <div class="player-stat"><span>Points For</span><span>${playerStat.pf}</span></div>
    <div class="player-stat"><span>Points Against</span><span>${playerStat.pa}</span></div>
  `;

  tabStats.onclick = () => {
    tabStats.classList.add("active");
    tabMatchups.classList.remove("active");
    statsEl.classList.remove("hidden");
    matchupsEl.classList.add("hidden");
  };

  tabMatchups.onclick = async () => {
    tabMatchups.classList.add("active");
    tabStats.classList.remove("active");
    matchupsEl.classList.remove("hidden");
    statsEl.classList.add("hidden");

    await loadTournamentsIfNeeded();
    matchupsEl.innerHTML = renderMatchupStats(playerStat.playerId);
  };

  document.getElementById("playerBackdrop").classList.remove("hidden");
  document.getElementById("playerModal").classList.remove("hidden");
}

function closePlayerModal() {
  document.getElementById("playerBackdrop").classList.add("hidden");
  document.getElementById("playerModal").classList.add("hidden");
}

/********************
 * TOURNAMENT CACHE
 ********************/

async function loadTournamentsIfNeeded() {
  const FIVE_MIN = 5 * 60 * 1000;
  const now = Date.now();

  if (!ALL_TOURNAMENTS || now - TOURNAMENTS_LOADED_AT > FIVE_MIN) {
    ALL_TOURNAMENTS = await apiGet("getTournaments");
    TOURNAMENTS_LOADED_AT = now;
  }
}

function prefetchTournaments() {
  if (ALL_TOURNAMENTS) return;

  apiGet("getTournaments")
    .then(data => {
      ALL_TOURNAMENTS = data;
      TOURNAMENTS_LOADED_AT = Date.now();
    })
    .catch(err => {
      console.warn("Background tournament prefetch failed", err);
    });
}
