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
      const name = PLAYERS[p.playerId];

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

  document.getElementById("playerName").innerText = player;
  document.getElementById("playerEmoji").innerText = "";

  const tabStats = document.getElementById("tabStats");
  const tabPartners = document.getElementById("tabPartners");
  const statsEl = document.getElementById("playerStats");
  const partnersEl = document.getElementById("playerPartners");

  tabStats.classList.add("active");
  tabPartners.classList.remove("active");
  statsEl.classList.remove("hidden");
  partnersEl.classList.add("hidden");

  statsEl.innerHTML = `
    <div class="player-stat"><span>Games Played</span><span>${playerStat.gamesPlayed}</span></div>
    <div class="player-stat"><span>Wins</span><span>${playerStat.wins}</span></div>
    <div class="player-stat"><span>Losses</span><span>${playerStat.losses}</span></div>
    <div class="player-stat"><span>Win %</span><span>${(playerStat.winPct * 100).toFixed(1)}%</span></div>
    <div class="player-stat"><span>Points For</span><span>${playerStat.pf}</span></div>
    <div class="player-stat"><span>Points Against</span><span>${playerStat.pa}</span></div>
  `;

  partnersEl.innerHTML = renderPartnerStats(playerStat.playerId);

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
 * PARTNER + OPPONENT STATS
 ********************/

function renderPartnerStats(playerId) {
  const partners = {};
  const opponents = {};

  ALL_TOURNAMENTS.forEach(t => {
    t.games.forEach(g => {
      if (!Number.isFinite(g.scoreTeam1) || !Number.isFinite(g.scoreTeam2)) return;
      if (g.scoreTeam1 === g.scoreTeam2) return;


      const { team1, team2, scoreTeam1, scoreTeam2 } = g;

      // ---- PARTNERS ----
      if (team1.includes(playerId)) {
        const partner = team1.find(p => p !== playerId);
        if (partner) {
          partners[partner] ??= { gp: 0, w: 0, l: 0 };
          partners[partner].gp++;
          scoreTeam1 > scoreTeam2 ? partners[partner].w++ : partners[partner].l++;
        }
      }

      if (team2.includes(playerId)) {
        const partner = team2.find(p => p !== playerId);
        if (partner) {
          partners[partner] ??= { gp: 0, w: 0, l: 0 };
          partners[partner].gp++;
          scoreTeam2 > scoreTeam1 ? partners[partner].w++ : partners[partner].l++;
        }
      }

      // ---- OPPONENTS ----
      if (team1.includes(playerId)) {
        team2.forEach(opp => {
          opponents[opp] ??= { gp: 0, w: 0, l: 0 };
          opponents[opp].gp++;
          scoreTeam1 > scoreTeam2 ? opponents[opp].w++ : opponents[opp].l++;
        });
      }

      if (team2.includes(playerId)) {
        team1.forEach(opp => {
          opponents[opp] ??= { gp: 0, w: 0, l: 0 };
          opponents[opp].gp++;
          scoreTeam2 > scoreTeam1 ? opponents[opp].w++ : opponents[opp].l++;
        });
      }
    });
  });

  const topPartners = Object.entries(partners)
    .filter(([_, s]) => s.gp >= 2)
    .map(([pid, s]) => ({
      name: PLAYERS[pid],
      w: s.w,
      l: s.l,
      pct: s.w / s.gp
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const toughestOpponents = Object.entries(opponents)
    .filter(([_, s]) => s.gp >= 2 && s.l > 0)
    .map(([pid, s]) => ({
      name: PLAYERS[pid],
      w: s.w,
      l: s.l,
      lossPct: s.l / s.gp
    }))
    .sort((a, b) => b.lossPct - a.lossPct)
    .slice(0, 3);

  let html = `<h3 class="partners-title">Favourite Partners</h3>`;

  html += topPartners.length
    ? topPartners.map(p => `
        <div class="player-stat">
          <span><strong>${p.name}</strong></span>
          <span>${p.w}–${p.l} (${(p.pct * 100).toFixed(0)}%)</span>
        </div>
      `).join("")
    : `<p class="muted">No partner data yet.</p>`;

  html += `<h3 class="partners-title">Toughest Opponents</h3>`;

  html += toughestOpponents.length
    ? toughestOpponents.map(o => `
        <div class="player-stat">
          <span><strong>${o.name}</strong></span>
          <span>${o.w}–${o.l} (${(o.lossPct * 100).toFixed(0)}%)</span>
        </div>
      `).join("")
    : `<p class="muted">No opponent data yet.</p>`;

  return html;
}
