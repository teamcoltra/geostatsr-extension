/* global chrome */
console.log("[GeoStatsr] popup.js loaded");

// --- DOM Elements ---
const loginBlocked = document.getElementById("login-blocked");
const mainUI = document.getElementById("main-ui");
const greeting = document.getElementById("greeting");
const updateNcfaBtn = document.getElementById("update-ncfa");
const collectStatsBtn = document.getElementById("collect-stats");
const collectingAnim = document.getElementById("collecting-animation");
const apiMessage = document.getElementById("api-message");

// Advanced/settings
const advancedBtn = document.getElementById("advancedBtn");
const advancedSection = document.getElementById("advancedSection");
const rootInput = document.getElementById("root");
const keyInput = document.getElementById("pkey");
const saveBtn = document.getElementById("save");
const statusElem = document.getElementById("status");

// --- State ---
let userId = null;
let userNick = null;
let ncfaToken = null;
let apiRoot = "https://geostatsr.com";
let apiKey = "";

// --- Utility ---
function show(elem) {
  if (elem) elem.classList.remove("hidden");
}
function hide(elem) {
  if (elem) elem.classList.add("hidden");
}
function setApiMessage(msg, color = "#b4ff35") {
  if (apiMessage) {
    apiMessage.textContent = msg;
    apiMessage.style.color = color;
  }
}
function setStatus(msg, color = "#b4ff35", timeout = 3000) {
  if (statusElem) {
    statusElem.textContent = msg;
    statusElem.style.color = color;
    if (timeout > 0)
      setTimeout(() => {
        statusElem.textContent = "";
      }, timeout);
  }
}

// --- Advanced/settings logic ---
if (advancedBtn && advancedSection) {
  console.log("[GeoStatsr] Advanced button and section found");
  advancedBtn.addEventListener("click", () => {
    console.log("[GeoStatsr] Advanced button clicked");
    if (advancedSection.style.display === "block") {
      advancedSection.style.display = "none";
    } else {
      advancedSection.style.display = "block";
    }
  });
} else {
  console.log("[GeoStatsr] Advanced button or section NOT found");
}

// Load settings for advanced section
console.log("[GeoStatsr] Loading settings from chrome.storage.local");
chrome.storage.local.get(
  { apiRoot: "https://geostatsr.com", apiKey: "" },
  (data) => {
    apiRoot = data.apiRoot || "https://geostatsr.com";
    apiKey = data.apiKey || "";
    if (rootInput) rootInput.value = apiRoot;
    if (keyInput) keyInput.value = apiKey;
    console.log("[GeoStatsr] Loaded settings:", { apiRoot, apiKey });
  },
);

// Save settings
if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    console.log("[GeoStatsr] Save button clicked");
    const rootVal = rootInput.value.trim().replace(/\/+$/, "");
    const keyVal = keyInput.value.trim();
    if (!/^https?:\/\/.+/i.test(rootVal)) {
      setStatus("Must start with http:// or https://", "#ff5555");
      return;
    }
    chrome.storage.local.set({ apiRoot: rootVal, apiKey: keyVal }, () => {
      setStatus("Saved!", "#b4ff35");
      apiRoot = rootVal;
      apiKey = keyVal;
      console.log("[GeoStatsr] Settings saved:", { apiRoot, apiKey });
    });
  });
}

// --- GeoGuessr login/profile logic ---
function getProfileAndNcfa(callback) {
  console.log("[GeoStatsr] getProfileAndNcfa called");
  // Try to get _ncfa cookie first
  chrome.cookies.get(
    { url: "https://www.geoguessr.com/", name: "_ncfa" },
    (cookie) => {
      console.log("[GeoStatsr] chrome.cookies.get returned:", cookie);
      if (!cookie || !cookie.value) {
        console.log("[GeoStatsr] No _ncfa cookie found");
        callback(null, null, null);
        return;
      }
      ncfaToken = cookie.value;
      // Try to get profile via content script (must be on geoguessr.com)
      chrome.tabs.query({ url: "*://www.geoguessr.com/*" }, (tabs) => {
        console.log("[GeoStatsr] chrome.tabs.query returned:", tabs);
        if (tabs && tabs.length > 0) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: "GET_GEOGUESSR_PROFILE" },
            (resp) => {
              console.log(
                "[GeoStatsr] chrome.tabs.sendMessage response:",
                resp,
                "lastError:",
                chrome.runtime.lastError,
              );
              if (chrome.runtime.lastError || !resp) {
                setApiMessage(
                  "Please open geoguessr.com in a tab and refresh the page, then try again.",
                  "#ff5555",
                );
                callback(null, null, null);
              } else if (
                resp &&
                resp.profile &&
                resp.profile.user &&
                resp.profile.user.id
              ) {
                callback(
                  resp.profile.user.id,
                  resp.profile.user.nick,
                  ncfaToken,
                );
              } else {
                callback(null, null, null);
              }
            },
          );
        } else {
          console.log("[GeoStatsr] No geoguessr.com tab found");
          callback(null, null, null);
        }
      });
    },
  );
}

// --- UI State Management ---
function blockUI() {
  hide(mainUI);
  show(loginBlocked);
}
function showMainUI() {
  hide(loginBlocked);
  show(mainUI);
  if (greeting && userNick) {
    greeting.textContent = `Hello, ${userNick}!`;
  }
}

// --- POST to /api/user-ncfa ---
function postNcfaToken() {
  if (!ncfaToken) {
    setApiMessage("No NCFA token found.", "#ff5555");
    return;
  }
  setApiMessage("Updating NCFA token...");
  fetch(`${apiRoot}/api/user-ncfa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ncfa: ncfaToken }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data && data.success) {
        setApiMessage(`${data.message} (User: ${data.nick})`, "#b4ff35");
        // Optionally update userId/nick if returned
        if (data.user_id) userId = data.user_id;
        if (data.nick) userNick = data.nick;
        if (greeting && userNick) greeting.textContent = `Hello, ${userNick}!`;
      } else {
        setApiMessage(
          `Failed: ${data && data.message ? data.message : "Unknown error"}`,
          "#ff5555",
        );
      }
    })
    .catch((e) => setApiMessage(`Error: ${e.message}`, "#ff5555"));
}

// --- POST to /api/user-collect-now ---
function postCollectNow() {
  if (!userId) {
    setApiMessage("No user ID found.", "#ff5555");
    return;
  }
  setApiMessage("");
  show(collectingAnim);
  fetch(`${apiRoot}/api/user-collect-now`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  })
    .then((r) => r.json())
    .then((data) => {
      hide(collectingAnim);
      if (data && data.success) {
        setApiMessage(`${data.message} (User: ${data.nick})`, "#b4ff35");
      } else {
        setApiMessage(
          `Failed: ${data && data.message ? data.message : "Unknown error"}`,
          "#ff5555",
        );
      }
    })
    .catch((e) => {
      hide(collectingAnim);
      setApiMessage(`Error: ${e.message}`, "#ff5555");
    });
}

// --- Button Handlers ---
if (updateNcfaBtn) {
  updateNcfaBtn.addEventListener("click", postNcfaToken);
}
if (collectStatsBtn) {
  collectStatsBtn.addEventListener("click", () => {
    setApiMessage(
      "Collecting data, this may take 1-5 minutes especially on first run...",
    );
    postCollectNow();
  });
}

// --- On Load: Check login/profile and set up UI ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("[GeoStatsr] DOMContentLoaded");
  hide(mainUI);
  hide(loginBlocked);
  hide(collectingAnim);
  setApiMessage("");

  // Show login-blocked by default, hide main UI
  const loginBlockedElem = document.getElementById("login-blocked");
  const loginMsgElem = document.getElementById("login-message");
  const updatingMsgElem = document.getElementById("updating-message");
  show(loginBlockedElem);
  if (loginMsgElem) {
    loginMsgElem.style.display = "block";
  }
  if (updatingMsgElem) {
    updatingMsgElem.style.display = "none";
  }

  // Try to get NCFA cookie and profile
  chrome.cookies.get(
    { url: "https://www.geoguessr.com/", name: "_ncfa" },
    (cookie) => {
      console.log("[GeoStatsr] chrome.cookies.get returned:", cookie);
      if (!cookie || !cookie.value) {
        // Not logged in: show big login message
        show(loginBlockedElem);
        if (loginMsgElem) loginMsgElem.style.display = "block";
        if (updatingMsgElem) updatingMsgElem.style.display = "none";
        hide(mainUI);
        return;
      }
      // We have a token, show "Updating..." while waiting for profile
      if (loginBlockedElem) show(loginBlockedElem);
      if (loginMsgElem) loginMsgElem.style.display = "none";
      if (updatingMsgElem) updatingMsgElem.style.display = "block";
      hide(mainUI);

      // Now try to get the profile
      chrome.tabs.query({ url: "*://www.geoguessr.com/*" }, (tabs) => {
        console.log("[GeoStatsr] chrome.tabs.query returned:", tabs);
        if (tabs && tabs.length > 0) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: "GET_GEOGUESSR_PROFILE" },
            (resp) => {
              console.log(
                "[GeoStatsr] chrome.tabs.sendMessage response:",
                resp,
                "lastError:",
                chrome.runtime.lastError,
              );
              if (chrome.runtime.lastError || !resp) {
                setApiMessage(
                  "Please open geoguessr.com in a tab and reload the page, then try again.",
                  "#ff5555",
                );
                show(loginBlockedElem);
                if (loginMsgElem) loginMsgElem.style.display = "block";
                if (updatingMsgElem) updatingMsgElem.style.display = "none";
                hide(mainUI);
                return;
              }
              if (
                resp &&
                resp.profile &&
                resp.profile.user &&
                resp.profile.user.id
              ) {
                userId = resp.profile.user.id;
                userNick = resp.profile.user.nick;
                ncfaToken = cookie.value;
                showMainUI();
                hide(loginBlockedElem);
                if (loginMsgElem) loginMsgElem.style.display = "none";
                if (updatingMsgElem) updatingMsgElem.style.display = "none";
                console.log("[GeoStatsr] Main UI shown", {
                  userId,
                  userNick,
                  ncfaToken,
                });
              } else {
                show(loginBlockedElem);
                if (loginMsgElem) loginMsgElem.style.display = "block";
                if (updatingMsgElem) updatingMsgElem.style.display = "none";
                hide(mainUI);
              }
            },
          );
        } else {
          show(loginBlockedElem);
          if (loginMsgElem) loginMsgElem.style.display = "block";
          if (updatingMsgElem) updatingMsgElem.style.display = "none";
          hide(mainUI);
        }
      });
    },
  );
});
