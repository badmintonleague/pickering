let PLAYERS = {};

const container = document.getElementById("achievements");

(async function renderAchievements() {
  const [players, rows, duos] = await Promise.all([
    loadPlayers(),
    apiGet("getAchievements"),
    apiGet("getDuos")
  ]);

  PLAYERS = players;

  container.innerHTML = "";

  renderTop3({
    title: "🏆 Tournament Champion",
    subtitle: "Most tournament wins",
    rows,
    valueKey: "tournamentWins"
  });

  renderTop3({
    title: "🔥 Streak Master",
    subtitle: "Longest win streak",
    rows,
    valueKey: "longestWinStreak"
  });

  renderTop3({
    title: "🧊 Clutch Factor",
    subtitle: "Most sudden-death wins",
    rows,
    valueKey: "clutchWins"
  });


    // STEP 6: Top Duos (by highest win %)
  renderTopDuos({
    title: "🤝 Top Duos",
    subtitle: "Highest win %",
    duos,
    minGames: 4
  });

  renderTop3({
    title: "🧱 Ever-Present",
    subtitle: "Most games played",
    rows,
    valueKey: "gamesPlayed"
  });

})();


/***********************
 * RENDER HELPERS
 ***********************/

function renderTop3({ title, subtitle, rows, valueKey }) {
  const card = document.createElement("div");
  card.className = "card";

  const top = rows
    .filter(r => Number(r[valueKey]) > 0)
    .sort((a, b) => b[valueKey] - a[valueKey])
    .slice(0, 5);

  let html = `
    <h3>${title}</h3>
    <p class="muted">${subtitle}</p>
  `;

  if (top.length === 0) {
    html += `<p class="muted">No data yet.</p>`;
  } else {
    top.forEach((r, i) => {
      html += `
        <div class="player-stat">
          <span>#${i + 1} ${r.name}</span>
          <strong>${r[valueKey]}</strong>
        </div>
      `;
    });
  }

  card.innerHTML = html;
  container.appendChild(card);
}


function renderTopDuos({ title, subtitle, duos, minGames }) {
  const card = document.createElement("div");
  card.className = "card";

  const top = duos
    .filter(d => d.gamesPlayed >= minGames)
    .sort((a, b) =>
      (b.winPct - a.winPct) ||
      (b.wins - a.wins) ||
      (b.gamesPlayed - a.gamesPlayed)
    )
    .slice(0, 5);

  let html = `
    <h3>${title}</h3>
    <p class="muted">${subtitle}</p>
  `;

  if (top.length === 0) {
    html += `<p class="muted">No duo data yet.</p>`;
  } else {
    top.forEach((d, i) => {
      const name1 = PLAYERS[d.p1] || `Player ${d.p1}`;
      const name2 = PLAYERS[d.p2] || `Player ${d.p2}`;
      const pct = Math.round(d.winPct * 100);
      const losses = d.gamesPlayed - d.wins;


      html += `
        <div class="player-stat">
          <span>#${i + 1} ${name1} & ${name2}</span>
          <strong>${d.wins}–${losses} (${pct}%)</strong>
        </div>
      `;
    });
  }

  card.innerHTML = html;
  container.appendChild(card);
}
