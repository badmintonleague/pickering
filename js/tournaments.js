const container = document.getElementById("tournaments");

let CURRENT = {
  tournamentId: null,
  gameNumber: null,
  scoreA: 0,
  scoreB: 0,
  completeTournamentId: null
};

(async function render() {
  const players = await loadPlayers();
  const data = await apiGet("getTournaments");

  container.innerHTML = "";

  const active = data.filter(t => t.status === "active");

  if (active.length === 0) {
    container.innerHTML = "<p>No active tournaments.</p>";
    return;
  }

  active.forEach(t => {
    const tCard = document.createElement("div");
    tCard.className = "card";

    tCard.innerHTML = `
      <strong>Tournament ${t.tournamentId}</strong><br>
      Current Game: ${t.currentGame}<br><br>
    `;

    t.games.forEach(g => {
      const gameDiv = document.createElement("div");
      gameDiv.className =
        "game-card" + (g.gameNumber === t.currentGame ? " current" : "");

      const team1 = g.team1.map(id => players[id]).join(" + ");
      const team2 = g.team2.map(id => players[id]).join(" + ");
      const score = g.scoreTeam1 ? ` — ${g.scoreTeam1}:${g.scoreTeam2}` : "";

      gameDiv.innerHTML = `
        Game ${g.gameNumber}<br>
        ${team1} vs ${team2}${score}
      `;

      gameDiv.onclick = () => openScoreModal(t, g, team1, team2);
      tCard.appendChild(gameDiv);
    });

    // ✅ COMPLETE BUTTON
    const completeBtn = document.createElement("button");
    completeBtn.className = "complete-btn";
    completeBtn.innerText = "Complete Tournament";
    completeBtn.onclick = () => openCompleteModal(t.tournamentId);

    tCard.appendChild(completeBtn);
    container.appendChild(tCard);
  });
})();

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
