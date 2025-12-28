const leaderboardEl = document.getElementById("leaderboard");
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

menuBtn.onclick = () => menu.classList.toggle("hidden");

apiGet("getRankings").then(data => {
  leaderboardEl.innerHTML = "";

  data
    .sort((a, b) => b.winPct - a.winPct)
    .forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <strong>#${i + 1} Player ${p.playerId}</strong><br>
        Win%: ${(p.winPct * 100).toFixed(1)}%<br>
        GP: ${p.gamesPlayed}<br>
        PF: ${p.pf} | PA: ${p.pa}
      `;
      leaderboardEl.appendChild(card);
    });
});

const tournamentsLink = document.getElementById("tournamentsLink");

tournamentsLink.onclick = () => {
  menu.classList.add("hidden"); // close menu before navigation
};

