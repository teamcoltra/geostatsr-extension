/*  popup logic  */
const rootInput   = document.getElementById('root');
const keyInput    = document.getElementById('pkey');
const saveBtn     = document.getElementById('save');
const sendCookie  = document.getElementById('sendCookie');
const collectNow  = document.getElementById('collectNow');

/* load saved settings */
chrome.storage.local.get(
  { apiRoot: 'http://localhost:62826', apiKey: '' },
  data => {
    rootInput.value = data.apiRoot;
    keyInput.value  = data.apiKey;
  }
);

/* save */
saveBtn.addEventListener('click', () => {
  const rootVal = rootInput.value.trim().replace(/\/+$/,'');
  const keyVal  = keyInput.value.trim();

  if (!/^https?:\/\/.+/i.test(rootVal)) {
    showStatus('Must start with http:// or https://');
    return;
  }
  
  chrome.storage.local.set({ apiRoot: rootVal, apiKey: keyVal }, () => {
    // Test server connection after saving
    chrome.runtime.sendMessage({ type: 'TEST_SERVER' }, (response) => {
      if (response.success) {
        if (response.isGeoStatsr) {
          showStatus('Saved successfully');
        } else {
          showStatus('Saved but this doesn\'t seem like a GeoStatsr server');
        }
      } else {
        showStatus('Saved!');
      }
    });
  });
});

/* manual triggers */
sendCookie.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SEND_NCFA_NOW' }, (response) => {
    if (response.success) {
      showStatus(response.message);
    } else {
      showStatus(`This system is buggy right now, you can usually ignore most errors. Just try running collect now anyway. Error: ${response.error}`);
    }
  });
});
collectNow.addEventListener('click', () => {
  collectNow.disabled = true;
  chrome.runtime.sendMessage({ type: 'COLLECT_NOW' }, () => {
    collectNow.disabled = false;
    showStatus('Collect triggered, may take a few minutes to start populating', 1500);
  });
});

// Helper for showing status messages
function showStatus(msg, timeout = 3000) {
  const statusElem = document.getElementById('status');
  if (!statusElem) return;
  statusElem.textContent = msg;
  if (timeout > 0) setTimeout(() => { statusElem.textContent = ''; }, timeout);
}
