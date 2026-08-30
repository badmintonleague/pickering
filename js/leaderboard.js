let PLAYERS = {};
let STATS = [];
let ALL_TOURNAMENTS = null;
let TOURNAMENTS_LOADED_AT = 0;
let SEASONS = [];
let CURRENT_SEASON = "all";

// 🔹 Rank snapshot (baseline)
let RANK_SNAPSHOT = {};

const leaderboardEl = document.getElementById("leaderboard");
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.onclick = () => menu.classList.toggle("hidden");

/********************
 * INITIAL LOAD
 ********************/

(async function initLeaderboard() {
  const [players, seasons] = await Promise.all([
    loadPlayers(),
    apiGet("getSeasons")
  ]);

  PLAYERS = players;
  SEASONS = seasons;

  const activeSeason = SEASONS.find(s => s.isActive);
  CURRENT_SEASON = activeSeason ? activeSeason.seasonId : "all";

  STATS = await apiGet("getRankings", CURRENT_SEASON === "all" ? {} : { seasonId: CURRENT_SEASON });

  renderSeasonDropdown();
  renderLeaderboard();

  // 🔥 Background tasks (non-blocking)
  loadRankSnapshot();
  prefetchTournaments();
})();

/********************
 * SEASON DROPDOWN (header)
 ********************/

async function switchSeason(seasonId) {
  CURRENT_SEASON = seasonId;
  STATS = await apiGet("getRankings", seasonId === "all" ? {} : { seasonId });
  renderLeaderboard();
  renderSeasonDropdown();

  const menu = document.getElementById("seasonDropdownMenu");
  if (menu) menu.classList.add("hidden");
}

function toggleSeasonDropdown(e) {
  e.stopPropagation();
  const menu = document.getElementById("seasonDropdownMenu");
  if (menu) menu.classList.toggle("hidden");
}

document.addEventListener("click", (e) => {
  const wrap = document.querySelector(".season-dropdown");
  const menu = document.getElementById("seasonDropdownMenu");
  if (wrap && menu && !wrap.contains(e.target)) {
    menu.classList.add("hidden");
  }
});

function renderSeasonDropdown() {
  const label = document.getElementById("seasonPillLabel");
  const menu = document.getElementById("seasonDropdownMenu");

  const activeSeason = SEASONS.find(s => s.isActive);
  const currentLabel = CURRENT_SEASON === "all"
    ? "All-time"
    : (SEASONS.find(s => s.seasonId === CURRENT_SEASON)?.name || "Season");

  if (label) label.textContent = currentLabel.toUpperCase();
  if (!menu) return;

  menu.innerHTML = `
    ${activeSeason ? `<div onclick="switchSeason(${activeSeason.seasonId})">${activeSeason.name}</div>` : ""}
    <div onclick="switchSeason('all')">All-time</div>
    ${SEASONS.filter(s => !s.isActive).map(s => `<div onclick="switchSeason(${s.seasonId})">${s.name}</div>`).join("")}
  `;
}

/********************
 * RANK SNAPSHOT
 ********************/

async function loadRankSnapshot() {
  try {
    const rows = await apiGet("getRankSnapshot"); // [{ playerId, rank }]
    RANK_SNAPSHOT = {};
    rows.forEach(r => {
      RANK_SNAPSHOT[r.playerId] = r.rank;
    });

    renderLeaderboard(); // 🔥 RE-RENDER WITH SNAPSHOT
  } catch (e) {
    console.warn("Rank snapshot unavailable");
    RANK_SNAPSHOT = {};
  }
}


function getRankChange(playerId, currentRank) {
  const prevRank = RANK_SNAPSHOT[playerId];

  // ✅ Correct existence check
  if (prevRank === undefined) {
    return { text: "—", cls: "rank-same" };
  }

  const diff = prevRank - currentRank;

  if (diff > 0) return { text: `▲ ${diff}`, cls: "rank-up" };
  if (diff < 0) return { text: `▼ ${Math.abs(diff)}`, cls: "rank-down" };

  return { text: "—", cls: "rank-same" };
}


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
      const rankChange = getRankChange(p.playerId, i + 1);

      const medal = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";

      const row = document.createElement("div");
      row.className = "row";

      row.innerHTML = `
        <div class="badge ${medal}">${i + 1}</div>
        <div class="row-main">
          <div class="row-top">
            <span class="name">${name}</span>
            <span class="rank-change ${rankChange.cls}">${rankChange.text}</span>
          </div>
          <div class="stat-chips">
            <div class="chip"><span class="chip-val">${(p.winPct * 100).toFixed(1)}%</span><span class="chip-label">WIN</span></div>
            <div class="chip"><span class="chip-val">${p.gamesPlayed}</span><span class="chip-label">GP</span></div>
            <div class="chip"><span class="chip-val ${pd > 0 ? "pos" : pd < 0 ? "neg" : ""}">${pd > 0 ? "+" : ""}${pd}</span><span class="chip-label">PD</span></div>
          </div>
        </div>
      `;

      row.onclick = () => openPlayerModal(p);
      leaderboardEl.appendChild(row);
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

      // Partners
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

      // Opponents
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
