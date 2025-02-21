document.addEventListener("DOMContentLoaded", function () {
  const domainInput = document.getElementById("domainInput");
  const addDomainBtn = document.getElementById("addDomain");
  const domainList = document.getElementById("domainList");
  const difficultySelect = document.getElementById("difficulty");

  // Load saved difficulty
  chrome.storage.local.get("difficulty", function (data) {
    if (data.difficulty) {
      difficultySelect.value = data.difficulty;
    }
  });

  // Save difficulty setting
  difficultySelect.addEventListener("change", function () {
    chrome.storage.local.set({ difficulty: difficultySelect.value });
  });
  function loadDomains() {
    chrome.storage.local.get("blockedDomains", function (data) {
      const domains = data.blockedDomains || [];
      domainList.innerHTML = "";
      domains.forEach((domain) => {
        const li = document.createElement("li");
        li.textContent = domain;
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "X";
        removeBtn.classList.add("remove");
        removeBtn.onclick = function () {
          removeDomain(domain);
        };
        li.appendChild(removeBtn);
        domainList.appendChild(li);
      });
    });
  }

  function isValidDomain(domain) {
    const domainPattern = /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z]{2,})+$/;
    return domainPattern.test(domain);
  }

  function addDomain() {
    const domain = domainInput.value.trim();
    if (!domain || !isValidDomain(domain)) {
      alert("Please enter a valid domain.");
      return;
    }
    chrome.storage.local.get("blockedDomains", function (data) {
      let domains = data.blockedDomains || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
        chrome.storage.local.set({ blockedDomains: domains }, loadDomains);
      }
    });
    domainInput.value = "";
  }

  function removeDomain(domain) {
    chrome.storage.local.get("blockedDomains", function (data) {
      let domains = data.blockedDomains || [];
      domains = domains.filter((d) => d !== domain);
      chrome.storage.local.set({ blockedDomains: domains }, loadDomains);
    });
  }

  addDomainBtn.addEventListener("click", addDomain);
  loadDomains();
});
