function toggleLocationMenu() {
  document.getElementById("locationOptions").classList.toggle("hidden");
}

function switchLocation(day) {
  const locations = {
    monday:    "https://badmintonleague.github.io/scarborough/leaderboard.html",
    wednesday: "https://badmintonleague.github.io/general/leaderboard.html",
  };

  if (locations[day]) {
    window.location.href = locations[day];
  }
}
