const container = document.getElementById("tournaments");

let CURRENT = {
  tournamentId: null,
  gameNumber: null,
  scoreA: 0,
  scoreB: 0,
  completeTournamentId: null,
  cancelTournamentId: null
};

// ✅ FIX #2: tournament cache
let TOURNAMENT_CACHE = null;

async function getTournamentsCached(force = false) {
  if (TOURNAMENT_CACHE && !force) return TOURNAMENT_CACHE;
  TOURNAMENT_CACHE = await apiGet("getTournaments");
  return TOURNAMENT_CACHE;
}

/****************
 * RENDER PAGE
 ****************/

async function render() {
  // ✅ FIX #1: instant UI paint
  container.innerHTML = `
    <button class="start-btn">+ Start New Tournament</button>
    <p class="loading">Loading tournaments…</p>
  `;

  // load in parallel
  const playersPromise = loadPlayers();
  const tournamentsPromise = getTournamentsCached();
  const rankingsPromise = apiGet("getRankings");

  const players = await playersPromise;
  const data = await tournamentsPromise;
  const rankings = await rankingsPromise;

  const statsById = {};
  rankings.forEach(r => (statsById[r.playerId] = r));

  container.innerHTML = "";

  // START TOURNAMENT BUTTON
  const startBtn = document.createElement("button");
  startBtn.className = "start-btn";
  startBtn.innerText = "+ Start New Tournament";
  startBtn.onclick = () => openStartModal(players, data);
  container.appendChild(startBtn);

  const active = data.filter(t => t.status === "active");

  const eyebrow = document.getElementById("tournamentsEyebrow");
  if (eyebrow) {
    eyebrow.textContent = active.length === 0
      ? "NO ACTIVE MATCHES"
      : `${active.length} ACTIVE ${active.length === 1 ? "MATCH" : "MATCHES"}`;
  }

  if (active.length === 0) {
    const msg = document.createElement("p");
    msg.className = "empty-msg";
    msg.innerText = "No active tournaments.";
    container.appendChild(msg);
    return;
  }

  active.forEach(t => {
    const tCard = document.createElement("div");
    tCard.className = "t-card";

    const completedCount = t.games.filter(g => g.scoreTeam1 || g.scoreTeam2).length;

    tCard.innerHTML = `
      <div class="t-header-row">
        <div class="t-id">
          <span class="t-label">TOURNAMENT</span>
          <span class="t-number">#${t.tournamentId}</span>
        </div>
        <button class="stats-btn">Stats ▾</button>
      </div>
      <span class="progress-chip">${completedCount} / ${t.games.length} GAMES</span>
      <div class="tournament-stats hidden"></div>
      <div class="games"></div>
    `;

    // STATS TOGGLE
    const statsBtn = tCard.querySelector(".stats-btn");
    const statsContainer = tCard.querySelector(".tournament-stats");

    statsBtn.onclick = () => {
      const isHidden = statsContainer.classList.contains("hidden");
      statsContainer.classList.toggle("hidden");
      statsBtn.innerText = isHidden ? "Hide Stats ▴" : "Stats ▾";

      if (isHidden && statsContainer.innerHTML === "") {
        renderTournamentStats(t, players, statsContainer);
      }
    };

    // GAMES
    const gamesEl = tCard.querySelector(".games");

    t.games.forEach(g => {
      const gameDiv = document.createElement("div");
      gameDiv.className =
        "game-row" + (g.gameNumber === t.currentGame ? " current" : "");

      const team1Names = g.team1.map(id => players[id]).join(" + ");
      const team2Names = g.team2.map(id => players[id]).join(" + ");

      const hasScore = g.scoreTeam1 || g.scoreTeam2;
      const team1Won = hasScore && g.scoreTeam1 > g.scoreTeam2;
      const team2Won = hasScore && g.scoreTeam2 > g.scoreTeam1;

      if (hasScore) gameDiv.classList.add("completed");

      let odds1Html = "";
      let odds2Html = "";
      let centerHtml = `<span class="vs">VS</span>`;

      if (!hasScore) {
        const odds = getTeamWinOdds(g.team1, g.team2, statsById);
        const pct1 = Math.round(odds.p1 * 100);
        const pct2 = 100 - pct1;

        odds1Html = `<span class="odds-badge ${pct1 >= pct2 ? "fav" : "dog"}">${pct1}%</span>`;
        odds2Html = `<span class="odds-badge ${pct2 > pct1 ? "fav" : "dog"}">${pct2}%</span>`;
      } else {
        centerHtml = `<span class="score">${g.scoreTeam1}–${g.scoreTeam2}</span>`;
      }

      gameDiv.innerHTML = `
        <div class="game-num">G${g.gameNumber}</div>
        <div class="matchup">
          <div class="side ${team1Won ? "win" : ""}">
            <span class="side-names">${team1Names}</span>
            ${odds1Html}
          </div>
          <div class="vs-score">${centerHtml}</div>
          <div class="side ${team2Won ? "win" : ""}">
            <span class="side-names">${team2Names}</span>
            ${odds2Html}
          </div>
        </div>
      `;

      gameDiv.onclick = () =>
        openScoreModal(t, g, team1Names, team2Names);

      gamesEl.appendChild(gameDiv);
    });

    // ACTION BUTTONS
    const buttonRow = document.createElement("div");
    buttonRow.className = "tournament-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel-tournament-btn";
    cancelBtn.innerText = "Cancel";
    cancelBtn.onclick = () => openCancelModal(t.tournamentId);

    const completeBtn = document.createElement("button");
    completeBtn.className = "complete-btn";
    completeBtn.innerText = "Complete";
    completeBtn.onclick = () => openCompleteModal(t.tournamentId);

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(completeBtn);
    tCard.appendChild(buttonRow);

    container.appendChild(tCard);
  });
}

/***********************
 * WIN ODDS (based on career winPct)
 ***********************/

function getTeamWinOdds(team1, team2, statsById) {
  const teamStrength = ids => {
    const vals = ids.map(id => {
      const s = statsById[id];
      if (!s || !s.gamesPlayed) return 0.5; // no history yet -> coin flip
      return Number(s.winPct);
    });
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const s1 = teamStrength(team1);
  const s2 = teamStrength(team2);
  const total = s1 + s2;

  let p1 = total > 0 ? s1 / total : 0.5;
  p1 = Math.min(0.9, Math.max(0.1, p1)); // never show a "sure thing"

  return { p1, p2: 1 - p1 };
}

/***********************
 * TOURNAMENT STATS
 ***********************/

function renderTournamentStats(tournament, players, container) {
  const stats = {};

  tournament.games.forEach(g => {
    if (!g.scoreTeam1 && !g.scoreTeam2) return;

    const team1 = g.team1;
    const team2 = g.team2;
    const scoreA = g.scoreTeam1;
    const scoreB = g.scoreTeam2;

    [...team1, ...team2].forEach(p => {
      if (!stats[p]) stats[p] = { gp: 0, w: 0, l: 0, pf: 0, pa: 0 };
      stats[p].gp++;
    });

    if (scoreA > scoreB) {
      team1.forEach(p => stats[p].w++);
      team2.forEach(p => stats[p].l++);
    } else {
      team2.forEach(p => stats[p].w++);
      team1.forEach(p => stats[p].l++);
    }

    team1.forEach(p => {
      stats[p].pf += scoreA;
      stats[p].pa += scoreB;
    });

    team2.forEach(p => {
      stats[p].pf += scoreB;
      stats[p].pa += scoreA;
    });
  });

  Object.entries(stats)
    .sort((a, b) => {
      // 1️⃣ Wins
      if (b[1].w !== a[1].w) {
        return b[1].w - a[1].w;
      }
    
      // 2️⃣ Point Differential (PF - PA)
      const diffA = a[1].pf - a[1].pa;
      const diffB = b[1].pf - b[1].pa;
      return diffB - diffA;
    })

    .forEach(([pid, s]) => {
      const row = document.createElement("div");
      row.className = "player-stat";

      row.innerHTML = `
        <div class="stat-name">${players[pid]}</div>
        <div class="stat-row">
          <div><span>GP</span><strong>${s.gp}</strong></div>
          <div><span>W</span><strong>${s.w}</strong></div>
          <div><span>L</span><strong>${s.l}</strong></div>
          <div><span>PF</span><strong>${s.pf}</strong></div>
          <div><span>PA</span><strong>${s.pa}</strong></div>
        </div>
      `;

      container.appendChild(row);
    });
}

/****************
 * START TOURNAMENT
 ****************/

function openStartModal(players, tournaments) {
  const activePlayers = new Set();

  tournaments
    .filter(t => t.status === "active")
    .forEach(t => {
      t.games.forEach(g => {
        [...g.team1, ...g.team2].forEach(p => activePlayers.add(p));
      });
    });

  const list = document.getElementById("playerSelect");
  list.innerHTML = "";

  const createBtn = document.querySelector("#startModal .submit-btn");
  createBtn.innerText = "Create Tournament";
  createBtn.disabled = true;

  function updateButton() {
    const checked = document.querySelectorAll(
      "#playerSelect input[type=checkbox]:checked"
    ).length;

    createBtn.innerText =
      checked === 0
        ? "Create Tournament"
        : `Create Tournament (${checked} players)`;

    createBtn.disabled = checked < 4;
  }

  Object.entries(players).forEach(([id, name]) => {
    const disabled = activePlayers.has(Number(id));

    const row = document.createElement("div");
    row.style.marginBottom = "8px";

    row.innerHTML = `
      <label>
        <input type="checkbox" value="${id}" ${disabled ? "disabled" : ""}>
        ${name} ${disabled ? "(in active tournament)" : ""}
      </label>
    `;

    row.querySelector("input").addEventListener("change", updateButton);
    list.appendChild(row);
  });

  updateButton();

  document.getElementById("startBackdrop").classList.remove("hidden");
  document.getElementById("startModal").classList.remove("hidden");
}

function closeStartModal() {
  document.getElementById("startBackdrop").classList.add("hidden");
  document.getElementById("startModal").classList.add("hidden");
}

async function createTournament() {
  const btn = document.getElementById("createTournamentBtn");

  btn.disabled = true;
  btn.innerText = "Creating…";

  const checkboxes = document.querySelectorAll(
    "#playerSelect input[type=checkbox]:checked"
  );

  const playerIds = Array.from(checkboxes).map(cb => Number(cb.value));

  if (playerIds.length < 4) {
    alert("Select at least 4 players.");
    btn.disabled = false;
    btn.innerText = "Create Tournament";
    return;
  }

  try {
    const res = await apiPost({
      action: "startTournament",
      playerIds
    });

    if (res.error) throw new Error(res.error);

    closeStartModal();
    await getTournamentsCached(true);
    await render();

  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.innerText = "Create Tournament";
  }
}

/****************
 * SCORE MODAL
 ****************/

async function saveScore() {
  const btn = document.getElementById("saveScoreBtn");

  btn.disabled = true;
  btn.innerText = "Saving…";

  try {
    await apiPost({
      action: "submitScore",
      tournamentId: CURRENT.tournamentId,
      gameNumber: CURRENT.gameNumber,
      scoreTeam1: CURRENT.scoreA,
      scoreTeam2: CURRENT.scoreB
    });

    closeModal();
    await getTournamentsCached(true);
    await render();

  } catch (err) {
    console.error(err);
    alert("Failed to save score.");
    btn.disabled = false;
    btn.innerText = "Save Score";
  }
}

function openScoreModal(tournament, game, team1, team2) {
  CURRENT.tournamentId = tournament.tournamentId;
  CURRENT.gameNumber = game.gameNumber;
  CURRENT.scoreA = game.scoreTeam1 || 0;
  CURRENT.scoreB = game.scoreTeam2 || 0;

  document.getElementById("modalTitle").innerText = `Game ${game.gameNumber}`;
  document.getElementById("modalTeamA").innerText = team1;
  document.getElementById("modalTeamB").innerText = team2;

  document.getElementById("scoreA").innerText = CURRENT.scoreA;
  document.getElementById("scoreB").innerText = CURRENT.scoreB;

  const saveBtn = document.getElementById("saveScoreBtn");
  saveBtn.disabled = false;
  saveBtn.innerText = "Save Score";

  document.getElementById("modalBackdrop").classList.remove("hidden");
  document.getElementById("scoreModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.add("hidden");
  document.getElementById("scoreModal").classList.add("hidden");
}

function changeScore(team, delta) {
  if (team === "a") {
    CURRENT.scoreA = Math.max(0, CURRENT.scoreA + delta);
    document.getElementById("scoreA").innerText = CURRENT.scoreA;
  } else {
    CURRENT.scoreB = Math.max(0, CURRENT.scoreB + delta);
    document.getElementById("scoreB").innerText = CURRENT.scoreB;
  }
}

/***********************
 * COMPLETE / CANCEL
 ***********************/

function openCompleteModal(tournamentId) {
  CURRENT.completeTournamentId = tournamentId;
  document.getElementById("completeBackdrop").classList.remove("hidden");
  document.getElementById("completeModal").classList.remove("hidden");
}

function openCancelModal(tournamentId) {
  CURRENT.cancelTournamentId = tournamentId;
  document.getElementById("cancelBackdrop").classList.remove("hidden");
  document.getElementById("cancelModal").classList.remove("hidden");
}

function closeCompleteModal() {
  document.getElementById("completeBackdrop").classList.add("hidden");
  document.getElementById("completeModal").classList.add("hidden");
}

function closeCancelModal() {
  document.getElementById("cancelBackdrop").classList.add("hidden");
  document.getElementById("cancelModal").classList.add("hidden");
}



async function confirmCompleteTournament() {
  const btn = document.querySelector("#completeModal .success-btn");

  // ✅ instant UI feedback
  btn.disabled = true;
  btn.innerText = "Completing…";

  try {
    await apiPost({
      action: "completeTournament",
      tournamentId: CURRENT.completeTournamentId
    });

    closeCompleteModal();
    location.reload();

  } catch (err) {
    console.error(err);
    alert("Failed to complete tournament.");

    // ❌ restore UI on failure
    btn.disabled = false;
    btn.innerText = "Complete Tournament";
  }
}


async function confirmCancelTournament() {
  const btn = document.querySelector("#cancelModal .danger-btn");

  // ✅ instant UI feedback
  btn.disabled = true;
  btn.innerText = "Cancelling…";

  try {
    await apiPost({
      action: "cancelTournament",
      tournamentId: CURRENT.cancelTournamentId
    });

    closeCancelModal();
    location.reload();

  } catch (err) {
    console.error(err);
    alert("Failed to cancel tournament.");

    // ❌ restore UI on failure
    btn.disabled = false;
    btn.innerText = "Cancel Tournament";
  }
}


// ✅ initial load
render();
