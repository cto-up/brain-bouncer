// Add timer storage at the top
let accessTimers = {};

function handleTabUpdate(tabId, changeInfo, tab) {
  // Only run when the page is finished loading
  // Only run when the page is finished loading
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Tab updated:", tab.url, tabId);

    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      // Get base domain (e.g., "example.com" from "www.example.com")
      const domain = hostname.replace(/^(.*\.)?([^.]+\.[^.]+)$/, "$2");

      console.log("Domain to check:", domain);
      checkBlockedDomain(domain, tabId);
    } catch (e) {
      console.error("Error processing URL:", e);
    }
  }
}

chrome.tabs.onUpdated.addListener(handleTabUpdate);

function checkBlockedDomain(domain, tabId) {
  chrome.storage.local.get(["blockedDomains"], function (data) {
    const blockedDomains = data.blockedDomains || [];
    if (blockedDomains.includes(domain)) {
      // Check if there's a valid timer for this domain
      const currentTime = Date.now();
      if (!accessTimers[domain] || accessTimers[domain] < currentTime) {
        console.log("Blocked domain detected or timer expired:", domain, tabId);
        chrome.tabs.sendMessage(tabId, { action: "startChallenge" });
      } else {
        console.log("Domain still in allowed time period:", domain);
      }
    } else {
      console.log("Domain not blocked:", domain, tabId);
    }
  });
}

function extractBaseDomain(hostname) {
  return hostname.replace(/^(.*\.)?([^.]+\.[^.]+)$/, "$2");
}

function addTimer(sender, sendResponse) {
  try {
    const url = new URL(sender.tab.url);
    const hostname = url.hostname;
    const domain = extractBaseDomain(hostname);

    // Set 30-minute timer for this domain
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    accessTimers[domain] = Date.now() + thirtyMinutes;

    console.log(`Access granted to ${domain} for 30 minutes`);

    // Store timer in local storage for persistence
    chrome.storage.local.get(["accessTimers"], function (data) {
      const storedTimers = data.accessTimers || {};
      storedTimers[domain] = accessTimers[domain];
      chrome.storage.local.set({ accessTimers: storedTimers });
    });

    sendResponse({ success: true });
  } catch (e) {
    console.error("Error Adding Timer:", e);
    sendResponse({ success: false, error: e.message });
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "challengeSolved") {
    console.log("Challenge solved on tab:", sender.tab.id);

    addTimer(sender, sendResponse);
    return true;
  }
});

// Load saved timers when extension starts
chrome.storage.local.get(["accessTimers"], function (data) {
  if (data.accessTimers) {
    accessTimers = data.accessTimers;
    // Clean up expired timers
    const currentTime = Date.now();
    for (const domain in accessTimers) {
      if (accessTimers[domain] < currentTime) {
        delete accessTimers[domain];
      }
    }
    chrome.storage.local.set({ accessTimers: accessTimers });
  }
});
