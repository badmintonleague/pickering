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
    title: "Tournament Champion",
    subtitle: "Most tournament wins",
    icon: "🏆",
    rows,
    valueKey: "tournamentWins",
    unit: "titles"
  });

  renderTop3({
    title: "Streak Master",
    subtitle: "Longest win streak",
    icon: "🔥",
    rows,
    valueKey: "longestWinStreak",
    unit: "game streak"
  });

  renderTop3({
    title: "Clutch Factor",
    subtitle: "Most sudden-death wins",
    icon: "🧊",
    rows,
    valueKey: "clutchWins",
    unit: "clutch wins"
  });

  renderTopDuos({
    title: "Top Duos",
    subtitle: "Highest win %",
    icon: "🤝",
    duos,
    minGames: 4
  });

  renderTop3({
    title: "Ever-Present",
    subtitle: "Most games played",
    icon: "🧱",
    rows,
    valueKey: "gamesPlayed",
    unit: "games played"
  });

})();


/***********************
 * RENDER HELPERS
 ***********************/

function renderTop3({ title, subtitle, icon, rows, valueKey, unit }) {
  const card = document.createElement("div");
  card.className = "trophy-card";

  const top = rows
    .filter(r => Number(r[valueKey]) > 0)
    .sort((a, b) => b[valueKey] - a[valueKey])
    .slice(0, 5);

  let html = `
    <div class="trophy-header">
      <span class="trophy-icon">${icon}</span>
      <div>
        <h3>${title}</h3>
        <p class="trophy-sub">${subtitle}</p>
      </div>
    </div>
  `;

  if (top.length === 0) {
    html += `<p class="muted">No data yet.</p>`;
  } else {
    html += `<div class="trophy-list">`;
    top.forEach((r, i) => {
      const medal = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      html += `
        <div class="trophy-row">
          <div class="mini-badge ${medal}">${i + 1}</div>
          <span class="trophy-name">${r.name}</span>
          <span class="trophy-value">${r[valueKey]}${unit ? ` <span class="trophy-unit">${unit}</span>` : ""}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  card.innerHTML = html;
  container.appendChild(card);
}


function renderTopDuos({ title, subtitle, icon, duos, minGames }) {
  const card = document.createElement("div");
  card.className = "trophy-card";

  const top = duos
    .filter(d => d.gamesPlayed >= minGames)
    .sort((a, b) =>
      (b.winPct - a.winPct) ||
      (b.wins - a.wins) ||
      (b.gamesPlayed - a.gamesPlayed)
    )
    .slice(0, 5);

  let html = `
    <div class="trophy-header">
      <span class="trophy-icon">${icon}</span>
      <div>
        <h3>${title}</h3>
        <p class="trophy-sub">${subtitle}</p>
      </div>
    </div>
  `;

  if (top.length === 0) {
    html += `<p class="muted">No duo data yet.</p>`;
  } else {
    html += `<div class="trophy-list">`;
    top.forEach((d, i) => {
      const name1 = PLAYERS[d.p1] || `Player ${d.p1}`;
      const name2 = PLAYERS[d.p2] || `Player ${d.p2}`;
      const pct = Math.round(d.winPct * 100);
      const losses = d.gamesPlayed - d.wins;
      const medal = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";

      html += `
        <div class="trophy-row">
          <div class="mini-badge ${medal}">${i + 1}</div>
          <span class="trophy-name">${name1} & ${name2}</span>
          <span class="trophy-value">${d.wins}–${losses} <span class="trophy-unit">${pct}%</span></span>
        </div>
      `;
    });
    html += `</div>`;
  }

  card.innerHTML = html;
  container.appendChild(card);
}
