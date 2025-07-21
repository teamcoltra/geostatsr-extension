/* global chrome */

(() => {
  const POLL_MS = 1000;
  let pingSent = false;
  let timerId = null;

  // Listen for messages from popup to fetch GeoGuessr profile
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "GET_GEOGUESSR_PROFILE") {
      fetch("https://www.geoguessr.com/api/v3/profiles", {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((profile) => sendResponse({ profile }))
        .catch(() => sendResponse({ profile: null }));
      return true; // async
    }
  });

  function ctx() {
    const p = location.pathname;

    if (p.startsWith("/duels/") && !p.endsWith("/summary")) {
      const id = p.split("/")[2];
      return {
        mode: "duels",
        api: `https://game-server.geoguessr.com/api/duels/${id}`,
        done: (d) => d.status === "Finished",
      };
    }
    if (p.startsWith("/game/")) {
      const id = p.split("/")[2];
      return {
        mode: "classic",
        api: `https://www.geoguessr.com/api/v3/games/${id}`,
        done: (d) => d.state === "finished",
      };
    }
    if (p.startsWith("/challenge/")) {
      const id = p.split("/")[2];
      return {
        mode: "challenge",
        api: `https://www.geoguessr.com/api/v3/challenges/${id}/game`,
        done: (d) => d.state === "finished",
      };
    }
    return null;
  }

  async function poll(c) {
    if (pingSent) return;
    try {
      const res = await fetch(c.api, { credentials: "include" });
      const json = await res.json();
      if (c.done(json)) {
        pingSent = true;
        clearInterval(timerId);
        chrome.runtime.sendMessage({ type: "GAME_FINISHED" });
      }
    } catch {}
  }

  const c = ctx();
  if (!c) return;

  timerId = setInterval(() => poll(c), POLL_MS);
  window.addEventListener("pagehide", () => poll(c)); // last chance
})();
