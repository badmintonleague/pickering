const container = document.getElementById("tournaments");

let CURRENT = {
  tournamentId: null,
  gameNumber: null,
  scoreA: 0,
  scoreB: 0,
  completeTournamentId: null,
  cancelTournamentId: null

};

/****************
 * RENDER PAGE
 ****************/

(async function render() {
  const players = await loadPlayers();
  const data = await apiGet("getTournaments");

  container.innerHTML = "";

  // ✅ START TOURNAMENT BUTTON
  const startBtn = document.createElement("button");
  startBtn.className = "start-btn";
  startBtn.innerText = "+ Start New Tournament";
  startBtn.onclick = () => openStartModal(players, data);

  container.appendChild(startBtn);

  const active = data.filter(t => t.status === "active");

  if (active.length === 0) {
    container.innerHTML += "<p>No active tournaments.</p>";
  }


  active.forEach(t => {
    const tCard = document.createElement("div");
    tCard.className = "card";

    const allGamesComplete = t.currentGame > t.games.length;

    tCard.innerHTML = `
      <strong>Tournament ${t.tournamentId}</strong><br>
      ${
        allGamesComplete
          ? "<span style='color:green;font-weight:bold;'>All Games Complete</span>"
          : `Current Game: ${t.currentGame}`
      }
      <br><br>
    `;


    t.games.forEach(g => {
      const gameDiv = document.createElement("div");
      gameDiv.className =
        "game-card" + (g.gameNumber === t.currentGame ? " current" : "");

      const team1Names = g.team1.map(id => players[id]).join(" + ");
      const team2Names = g.team2.map(id => players[id]).join(" + ");
      
      const hasScore = g.scoreTeam1 || g.scoreTeam2;
      const team1Won = hasScore && g.scoreTeam1 > g.scoreTeam2;
      const team2Won = hasScore && g.scoreTeam2 > g.scoreTeam1;
      
      if (hasScore) {
        gameDiv.classList.add("completed");
      }
      
      gameDiv.innerHTML = `
        <div>Game ${g.gameNumber}</div>
        <div>
          <span class="team ${team1Won ? "winner" : ""}">
            ${team1Names}
          </span>
          vs
          <span class="team ${team2Won ? "winner" : ""}">
            ${team2Names}
          </span>
          ${hasScore ? ` — ${g.scoreTeam1}:${g.scoreTeam2}` : ""}
        </div>
      `;


      gameDiv.addEventListener("click", () => {
        openScoreModal(t, g, team1Names, team2Names);
      });

      tCard.appendChild(gameDiv);
    });

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
})();

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

    if (checked === 0) {
      createBtn.innerText = "Create Tournament";
      createBtn.disabled = true;
    } else {
      createBtn.innerText = `Create Tournament (${checked} players)`;
      createBtn.disabled = checked < 4;
    }
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

    const checkbox = row.querySelector("input");
    checkbox.addEventListener("change", updateButton);

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
  const checkboxes = document.querySelectorAll(
    "#playerSelect input[type=checkbox]:checked"
  );

  const playerIds = Array.from(checkboxes).map(cb => Number(cb.value));

  if (playerIds.length < 4) {
    alert("Select at least 4 players.");
    return;
  }

  const res = await apiPost({
    action: "startTournament",
    playerIds
  });

  if (res.error) {
    alert(res.error);
    return;
  }

  closeStartModal();
  location.reload();
}

/****************
 * SCORE MODAL
 ****************/

function openScoreModal(tournament, game, team1, team2) {
  CURRENT.tournamentId = tournament.tournamentId;
  CURRENT.gameNumber = game.gameNumber;
  CURRENT.scoreA = game.scoreTeam1 || 0;
  CURRENT.scoreB = game.scoreTeam2 || 0;

  document.getElementById("modalTitle").innerText =
    `Game ${game.gameNumber}`;
  document.getElementById("modalTeams").innerText =
    `${team1} vs ${team2}`;

  document.getElementById("scoreA").innerText = CURRENT.scoreA;
  document.getElementById("scoreB").innerText = CURRENT.scoreB;

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

async function saveScore() {
  await apiPost({
    action: "submitScore",
    tournamentId: CURRENT.tournamentId,
    gameNumber: CURRENT.gameNumber,
    scoreTeam1: CURRENT.scoreA,
    scoreTeam2: CURRENT.scoreB
  });

  closeModal();
  location.reload();
}

/***********************
 * COMPLETE TOURNAMENT
 ***********************/

function openCompleteModal(tournamentId) {
  CURRENT.completeTournamentId = tournamentId;
  document.getElementById("completeBackdrop").classList.remove("hidden");
  document.getElementById("completeModal").classList.remove("hidden");
}

function closeCompleteModal() {
  document.getElementById("completeBackdrop").classList.add("hidden");
  document.getElementById("completeModal").classList.add("hidden");
}

async function confirmCompleteTournament() {
  await apiPost({
    action: "completeTournament",
    tournamentId: CURRENT.completeTournamentId
  });

  closeCompleteModal();
  location.reload();
}


function openCancelModal(tournamentId) {
  CURRENT.cancelTournamentId = tournamentId;
  document.getElementById("cancelBackdrop").classList.remove("hidden");
  document.getElementById("cancelModal").classList.remove("hidden");
}

function closeCancelModal() {
  document.getElementById("cancelBackdrop").classList.add("hidden");
  document.getElementById("cancelModal").classList.add("hidden");
}

async function confirmCancelTournament() {
  await apiPost({
    action: "cancelTournament",
    tournamentId: CURRENT.cancelTournamentId
  });

  closeCancelModal();
  location.reload();
}

