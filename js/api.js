const API_URL = "https://script.google.com/macros/s/AKfycbxThMsJyVLa8dU-1OEbOHt1elMDDiZpwtPBIIU-8VwSHYu6IfrawuaGs5sVWGsdccKv9g/exec";

let PLAYER_MAP = null;

async function loadPlayers() {
  if (PLAYER_MAP) return PLAYER_MAP;

  const res = await fetch(`${API_URL}?action=getPlayers`);
  const players = await res.json();

  PLAYER_MAP = {};
  players.forEach(p => {
    PLAYER_MAP[p.id] = p.name;
  });

  return PLAYER_MAP;
}

async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${API_URL}?${query}`);
  return res.json();
}

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res.json();
}
