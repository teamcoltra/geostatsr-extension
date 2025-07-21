/* global chrome */

/* ───────── helpers ───────── */

async function getNcfaCookie() {
  return new Promise((res) =>
    chrome.cookies.get(
      { url: "https://www.geoguessr.com/", name: "_ncfa" },
      (c) => res(c ? c.value : null),
    ),
  );
}

async function getCfg() {
  return new Promise((res) =>
    chrome.storage.local.get(
      { apiRoot: "http://localhost:62826", apiKey: "" },
      (cfg) => res(cfg),
    ),
  );
}

async function fire(rawPath, returnResponse = false, options = {}) {
  const { apiRoot, apiKey } = await getCfg();

  const withKey =
    apiKey && !rawPath.includes("key=")
      ? `${rawPath}${rawPath.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
      : rawPath;

  try {
    const fetchOptions = { method: "GET", ...options };
    if (returnResponse) {
      // For requests that need response data, use cors mode
      const response = await fetch(`${apiRoot}${withKey}`, fetchOptions);
      return response;
    } else {
      // For fire-and-forget requests, keep no-cors mode
      await fetch(`${apiRoot}${withKey}`, fetchOptions);
    }
  } catch (e) {
    console.error("[GeoStatsr] fetch error", e);
    if (returnResponse) {
      throw e;
    }
  }
}

/* ───────── message hub ───────── */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      /* automatic ping from the content-script */
      case "GAME_FINISHED": {
        const ncfa = await getNcfaCookie();
        if (ncfa) {
          await fetch((await getCfg()).apiRoot + "/api/user-ncfa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ncfa }),
          });
        }
        await fire("/api/collect_now");
        break;
      }

      // All manual NCFA and collect logic is now handled in popup.js
      // Only legacy GAME_FINISHED trigger is kept for compatibility.
    }
  })().finally(() => {
    if (
      !msg.type.includes("SEND_NCFA_NOW") &&
      !msg.type.includes("TEST_SERVER")
    ) {
      sendResponse();
    }
  });

  return true; // keep the channel open for async work
});
