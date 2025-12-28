const API_URL = "https://script.google.com/macros/s/AKfycbxThMsJyVLa8dU-1OEbOHt1elMDDiZpwtPBIIU-8VwSHYu6IfrawuaGs5sVWGsdccKv9g/exec";

async function apiGet(action) {
  const res = await fetch(`${API_URL}?action=${action}`);
  return res.json();
}

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res.json();
}
