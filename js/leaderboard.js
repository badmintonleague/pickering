let PLAYERS = {};
let STATS = [];
let ALL_TOURNAMENTS = null;
let TOURNAMENTS_LOADED_AT = 0;

const leaderboardEl = document.getElementById("leaderboard");
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.onclick = () => menu.classList.toggle("hidden");

/********************
 * INITIAL LOAD
 ********************/

(async function initLeaderboard() {
  const [players, rankings] = await Promise.all([
    loadPlayers(),
    apiGet("getRankings")
  ]);

  PLAYERS = players;
  STATS = rankings;

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

  // Reset tabs
  tabStats.classList.add("active");
  tabMatchups.classList.remove("active");
  statsEl.classList.remove("hidden");
  matchupsEl.classList.add("hidden");

  // Stats content
  statsEl.innerHTML = `
    <div class="player-stat"><span>Games Played</span><span>${playerStat.gamesPlayed}</span></div>
    <div class="player-stat"><span>Wins</span><span>${playerStat.wins}</span></div>
    <div class="player-stat"><span>Losses</span><span>${playerStat.losses}</span></div>
    <div class="player-stat"><span>Win %</span><span>${(playerStat.winPct * 100).toFixed(1)}%</span></div>
    <div class="player-stat"><span>Points For</span><span>${playerStat.pf}</span></div>
    <div class="player-stat"><span>Points Against</span><span>${playerStat.pa}</span></div>
  `;

  // Tabs
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

    // Lazy-load tournaments only once (or every 5 min)
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
  // already loaded or already fetching
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


/********************
 * MATCHUP STATS
 ********************/

function renderMatchupStats(playerId) {
  const partners = {};
  const opponents = {};

  ALL_TOURNAMENTS.forEach(t => {
    t.games.forEach(g => {
      if (
        !Number.isFinite(g.scoreTeam1) ||
        !Number.isFinite(g.scoreTeam2) ||
        g.scoreTeam1 === g.scoreTeam2
      ) return;

      const { team1, team2, scoreTeam1, scoreTeam2 } = g;

      // ---- PARTNERS ----
      if (team1.includes(playerId)) {
        const p = team1.find(x => x !== playerId);
        if (p) {
          partners[p] ??= { gp: 0, w: 0, l: 0 };
          partners[p].gp++;
          scoreTeam1 > scoreTeam2 ? partners[p].w++ : partners[p].l++;
        }
      }

      if (team2.includes(playerId)) {
        const p = team2.find(x => x !== playerId);
        if (p) {
          partners[p] ??= { gp: 0, w: 0, l: 0 };
          partners[p].gp++;
          scoreTeam2 > scoreTeam1 ? partners[p].w++ : partners[p].l++;
        }
      }

      // ---- OPPONENTS ----
      if (team1.includes(playerId)) {
        team2.forEach(o => {
          opponents[o] ??= { gp: 0, l: 0 };
          opponents[o].gp++;
          if (scoreTeam1 < scoreTeam2) opponents[o].l++;
        });
      }

      if (team2.includes(playerId)) {
        team1.forEach(o => {
          opponents[o] ??= { gp: 0, l: 0 };
          opponents[o].gp++;
          if (scoreTeam2 < scoreTeam1) opponents[o].l++;
        });
      }
    });
  });

  const topPartners = Object.entries(partners)
    .filter(([_, s]) => s.gp >= 2)
    .map(([id, s]) => ({
      name: PLAYERS[id],
      w: s.w,
      l: s.l,
      pct: s.w / s.gp
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const toughestOpponents = Object.entries(opponents)
    .filter(([_, s]) => s.gp >= 2 && s.l > 0)
    .map(([id, s]) => ({
      name: PLAYERS[id],
      l: s.l,
      gp: s.gp,
      pct: s.l / s.gp
    }))
    .sort((a, b) => b.pct - a.pct)
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
          <span>${o.l} losses (${(o.pct * 100).toFixed(0)}%)</span>
        </div>
      `).join("")
    : `<p class="muted">No opponent data yet.</p>`;

  return html;
}
