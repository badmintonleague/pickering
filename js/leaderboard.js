let PLAYERS = {};
let STATS = [];
let ALL_TOURNAMENTS = [];

const leaderboardEl = document.getElementById("leaderboard");
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.onclick = () => menu.classList.toggle("hidden");

(async function () {
  PLAYERS = await loadPlayers();
  STATS = await apiGet("getRankings");
  ALL_TOURNAMENTS = await apiGet("getTournaments");

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

      if (i === 0) card.classList.add("rank-1");
      if (i === 1) card.classList.add("rank-2");
      if (i === 2) card.classList.add("rank-3");

      card.innerHTML = `
        <strong>#${i + 1} ${name}</strong><br>
        Win PCT: ${(p.winPct * 100).toFixed(1)}%<br>
        GP: ${p.gamesPlayed}
      `;

      card.onclick = () => openPlayerModal(p);
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

  document.getElementById("playerName").innerText = name;
  document.getElementById("playerEmoji").innerText =
    gender === "M" ? "♂️" : gender === "F" ? "♀️" : "";

  // Tabs
  const tabStats = document.getElementById("tabStats");
  const tabPartners = document.getElementById("tabPartners");
  const statsEl = document.getElementById("playerStats");
  const partnersEl = document.getElementById("playerPartners");

  // Default tab
  tabStats.classList.add("active");
  tabPartners.classList.remove("active");
  statsEl.classList.remove("hidden");
  partnersEl.classList.add("hidden");

  // Stats content (existing)
  statsEl.innerHTML = `
    <div class="player-stat"><span>Games Played</span><span>${playerStat.gamesPlayed}</span></div>
    <div class="player-stat"><span>Wins</span><span>${playerStat.wins}</span></div>
    <div class="player-stat"><span>Losses</span><span>${playerStat.losses}</span></div>
    <div class="player-stat"><span>Win %</span><span>${(playerStat.winPct * 100).toFixed(1)}%</span></div>
    <div class="player-stat"><span>Points For</span><span>${playerStat.pf}</span></div>
    <div class="player-stat"><span>Points Against</span><span>${playerStat.pa}</span></div>
  `;

  // Partners content
  partnersEl.innerHTML = renderPartnerStats(playerStat.playerId);

  // Tab handlers
  tabStats.onclick = () => {
    tabStats.classList.add("active");
    tabPartners.classList.remove("active");
    statsEl.classList.remove("hidden");
    partnersEl.classList.add("hidden");
  };

  tabPartners.onclick = () => {
    tabPartners.classList.add("active");
    tabStats.classList.remove("active");
    partnersEl.classList.remove("hidden");
    statsEl.classList.add("hidden");
  };

  document.getElementById("playerBackdrop").classList.remove("hidden");
  document.getElementById("playerModal").classList.remove("hidden");
}

function closePlayerModal() {
  document.getElementById("playerBackdrop").classList.add("hidden");
  document.getElementById("playerModal").classList.add("hidden");
}

/********************
 * PARTNER STATS
 ********************/

function renderPartnerStats(playerId) {
  const partners = {};
  const opponents = {};

  ALL_TOURNAMENTS.forEach(t => {
    t.games.forEach(g => {
      if (g.scoreTeam1 == null || g.scoreTeam2 == null) return;

      const teamA = g.team1;
      const teamB = g.team2;
      const scoreA = g.scoreTeam1;
      const scoreB = g.scoreTeam2;

      // ----- PARTNERS -----
      if (teamA.includes(playerId)) {
        const partnerId = teamA.find(p => p !== playerId);
        if (partnerId) {
          partners[partnerId] ??= { gp: 0, w: 0, l: 0 };
          partners[partnerId].gp++;
          scoreA > scoreB ? partners[partnerId].w++ : partners[partnerId].l++;
        }
      }

      if (teamB.includes(playerId)) {
        const partnerId = teamB.find(p => p !== playerId);
        if (partnerId) {
          partners[partnerId] ??= { gp: 0, w: 0, l: 0 };
          partners[partnerId].gp++;
          scoreB > scoreA ? partners[partnerId].w++ : partners[partnerId].l++;
        }
      }

      // ----- OPPONENTS -----
      if (teamA.includes(playerId)) {
        teamB.forEach(oppId => {
          opponents[oppId] ??= { gp: 0, l: 0 };
          opponents[oppId].gp++;
          if (scoreA < scoreB) opponents[oppId].l++;
        });
      }

      if (teamB.includes(playerId)) {
        teamA.forEach(oppId => {
          opponents[oppId] ??= { gp: 0, l: 0 };
          opponents[oppId].gp++;
          if (scoreB < scoreA) opponents[oppId].l++;
        });
      }
    });
  });

  const topPartners = Object.entries(partners)
    .filter(([_, s]) => s.gp >= 2)
    .map(([pid, s]) => ({
      name: PLAYERS[pid],
      ...s,
      winPct: s.w / s.gp
    }))
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 3);

  const toughestOpponents = Object.entries(opponents)
    .filter(([_, s]) => s.gp >= 2 && s.l > 0)
    .map(([pid, s]) => ({
      name: PLAYERS[pid],
      lossRate: s.l / s.gp
    }))
    .sort((a, b) => b.lossRate - a.lossRate)
    .slice(0, 3);

  let html = `<h3 class="partners-title">Favourite Partners</h3>`;

  html += topPartners.length
    ? topPartners.map(p => `
        <div class="player-stat">
          <span><strong>${p.name}</strong></span>
          <span>${p.w}–${p.l} (${(p.winPct * 100).toFixed(0)}%)</span>
        </div>
      `).join("")
    : `<p class="muted">No partner data yet.</p>`;

  html += `<h3 class="partners-title">Toughest Opponents</h3>`;

  html += toughestOpponents.length
    ? toughestOpponents.map(o => `
        <div class="player-stat">
          <span><strong>${o.name}</strong></span>
          <span>Loss rate ${(o.lossRate * 100).toFixed(0)}%</span>
        </div>
      `).join("")
    : `<p class="muted">No opponent data yet.</p>`;

  return html;
}

