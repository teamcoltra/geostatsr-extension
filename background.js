/* global chrome */

/* ───────── helpers ───────── */

async function getNcfaCookie() {
  return new Promise(res =>
    chrome.cookies.get(
      { url: 'https://www.geoguessr.com/', name: '_ncfa' },
      c => res(c ? c.value : null)
    )
  );
}

async function getCfg() {
  return new Promise(res =>
    chrome.storage.local.get(
      { apiRoot: 'http://localhost:62825', apiKey: '' },
      cfg => res(cfg)
    )
  );
}

async function fire(rawPath, returnResponse = false) {
  const { apiRoot, apiKey } = await getCfg();

  const withKey =
    apiKey && !rawPath.includes('key=')
      ? `${rawPath}${rawPath.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`
      : rawPath;

  try {
    if (returnResponse) {
      // For requests that need response data, use cors mode
      const response = await fetch(`${apiRoot}${withKey}`, { method:'GET' });
      return response;
    } else {
      // For fire-and-forget requests, keep no-cors mode
      await fetch(`${apiRoot}${withKey}`, { method:'GET', mode:'no-cors' });
    }
  } catch (e) {
    console.error('[GeoStatsr] fetch error', e);
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
      case 'GAME_FINISHED': {
        const ncfa = await getNcfaCookie();
        if (ncfa) await fire(`/api/update_ncfa?token=${encodeURIComponent(ncfa)}`);
        await fire('/api/collect_now');
        break;
      }

      /* manual buttons */
      case 'SEND_NCFA_NOW': {
        const ncfa = await getNcfaCookie();
        if (ncfa) {
          try {
            const response = await fire(`/api/update_ncfa?token=${encodeURIComponent(ncfa)}`, true);
            const responseText = await response.text();
            sendResponse({ success: true, message: responseText });
          } catch (e) {
            sendResponse({ success: false, error: e.message });
          }
        } else {
          sendResponse({ success: false, error: 'No _ncfa cookie found' });
        }
        return true; // Keep channel open for async response
      }
      case 'COLLECT_NOW':
        await fire('/api/collect_now');
        break;
      
      /* test server connection */
      case 'TEST_SERVER': {
        try {
          const response = await fire('/api/summary', true);
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              sendResponse({ success: true, isGeoStatsr: true });
            } else {
              sendResponse({ success: true, isGeoStatsr: false });
            }
          } else {
            sendResponse({ success: false, error: `Server responded with ${response.status}` });
          }
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        return true; // Keep channel open for async response
      }
    }
  })().finally(() => {
    if (!msg.type.includes('SEND_NCFA_NOW') && !msg.type.includes('TEST_SERVER')) {
      sendResponse();
    }
  });

  return true;   // keep the channel open for async work
});
