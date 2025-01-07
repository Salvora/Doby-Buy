// ==UserScript==
// @name        Doby-Buy
// @namespace   https://github.com/Salvora
// @version     1.2.1
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_setValue
// @grant       GM_getValue
// @resource    customCSS https://github.com/Salvora/Doby-Buy/raw/refs/heads/main/styles.css?v=1.0.0
// @author      Salvora
// @homepageURL https://github.com/Salvora/Doby-Buy
// @updateURL   https://github.com/Salvora/Doby-Buy/raw/refs/heads/main/Doby-Buy.user.js
// @downloadURL https://github.com/Salvora/Doby-Buy/raw/refs/heads/main/Doby-Buy.user.js
// @supportURL  https://github.com/Salvora/Doby-Buy/issues
// @description Userscript For Doby Translations
// @match       https://dobytranslations.com/series/*
// @license     GPL-3.0-or-later
// @run-at      document-end
// ==/UserScript==

(function () {
  ("use strict");
  let isInitialized = false;

  // Apply custom CSS
  try {
    GM_addStyle(GM_getResourceText("customCSS"));
  } catch (e) {
    console.error("Failed to apply custom CSS:", e);
  }

  /**
   * Sends a request to the specified URL with the given options and timeout.
   * @param {string} url - The URL to send the request to.
   * @param {Object} [options={}] - The options for the fetch request.
   * @param {number} [timeout=10000] - The timeout for the request in milliseconds.
   * @returns {Promise<Response>} - A promise that resolves to the response of the request.
   */
  async function sendRequest(url, options = {}, timeout = 10000) {
    const { signal, ...fetchOptions } = options;

    return Promise.race([
      fetch(url, { ...fetchOptions, signal }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), timeout)
      ),
    ]);
  }

  /**
   * Debounces function calls to limit the rate at which a function can fire.
   * @param {Function} func - The function to debounce.
   * @param {number} wait - The debounce interval in milliseconds.
   * @returns {Function} - The debounced function.
   */
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Finds premium chapters and adds checkboxes to them.
   * Clicking anywhere other than the title will toggle the checkbox.
   */
  function findPremiumChapters() {
    const chapterList = document.querySelector(".eplister.eplisterfull");

    if (!chapterList) {
      console.warn("Chapter list not found.");
      return;
    }

    const premiumChapters = chapterList.querySelectorAll(
      "li:has(.premium-icon)"
    );
    console.log(`Found ${premiumChapters.length} premium chapters`);

    premiumChapters.forEach((chapter) => {
      // Avoid adding multiple checkboxes to the same chapter
      if (chapter.querySelector(".premium-checkbox")) return;

      const chapterNumberElement = chapter.querySelector(".epl-num");

      // Ensure essential elements exist
      if (!chapterNumberElement) {
        console.warn(
          "Essential chapter elements missing. Skipping this chapter."
        );
        return;
      }

      // Create and insert the checkbox
      const checkbox = createCheckbox();
      chapterNumberElement.parentNode.insertBefore(
        checkbox,
        chapterNumberElement.nextSibling
      );
    });

    // Attach a single event listener using Event Delegation
    if (!chapterList.dataset.dobybuyListener) {
      chapterList.addEventListener("click", (event) => {
        const chapter = event.target.closest("li:has(.premium-icon)");
        if (!chapter) return;

        const chapterTitleElement = chapter.querySelector(".epl-title");
        const checkbox = chapter.querySelector(".premium-checkbox");
        const chapterLink = chapter.querySelector("a");

        if (!chapterTitleElement || !checkbox || !chapterLink) return;

        // Prevent default link behavior when clicking outside the title
        if (
          chapterLink.contains(event.target) &&
          !chapterTitleElement.contains(event.target)
        ) {
          event.preventDefault();
        }

        // Toggle checkbox when clicking outside the title and checkbox
        if (
          !chapterTitleElement.contains(event.target) &&
          event.target !== checkbox
        ) {
          toggleCheckbox(checkbox);
        }
      });

      // Mark as listener added
      chapterList.dataset.dobybuyListener = "true";
    }
  }

  async function checkChapterLockStatus(chapterList) {
    const lockIdentifierId = "mycred-buy-content";
  }

  function isLoggedIn() {
    const loginDiv = document.querySelector(".wpd-login");
    if (loginDiv && loginDiv.innerHTML.includes("You are logged in as")) {
      return true;
    }
    return false;
  }

  /**
   * Creates a checkbox element with the class 'premium-checkbox'.
   * @returns {HTMLInputElement} The created checkbox element.
   */
  function createCheckbox() {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "premium-checkbox";
    return checkbox;
  }

  /**
   * Toggles the checked state of a checkbox.
   * @param {HTMLInputElement} checkbox - The checkbox to toggle.
   */
  function toggleCheckbox(checkbox) {
    checkbox.checked = !checkbox.checked;
  }

  /**
   * Adds the "Unlock Checked" button next to the "Bookmarked" button.
   */
  function addUnlockCheckedButton() {
    const bookmarkElement = document.querySelector(".serbookmark .bookmark");
    const followedElement = document.querySelector(".serbookmark .bmc");

    if (document.getElementById("unlock-checked-button")) {
      console.warn("Unlock Checked button already exists.");
      return;
    }

    if (!bookmarkElement) {
      console.warn("Bookmark element not found.");
      return;
    }

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const bookmarkWrapper = document.createElement("div");
    bookmarkWrapper.className = "bookmark-wrapper";

    const unlockButton = document.createElement("div");
    unlockButton.className = "bookmark";
    unlockButton.id = "unlock-checked-button";
    const icon = document.createElement("i");
    icon.className = "fas fa-unlock";
    icon.setAttribute("aria-hidden", "true");

    const span = document.createElement("span");
    span.className = "button-text";
    span.textContent = "Unlock Checked";

    unlockButton.textContent = ""; // Clear any existing content
    unlockButton.appendChild(icon);
    unlockButton.appendChild(document.createTextNode(" ")); // Add space between icon and text
    unlockButton.appendChild(span);

    unlockButton.addEventListener("click", async () => {
      unlockButton.classList.add("click-animation");
      setTimeout(() => {
        unlockButton.classList.remove("click-animation");
      }, 200);
      await unlockChecked();
    });

    bookmarkElement.parentNode.insertBefore(buttonContainer, bookmarkElement);
    bookmarkWrapper.appendChild(bookmarkElement);
    if (followedElement) {
      bookmarkWrapper.appendChild(followedElement);
    }
    buttonContainer.appendChild(bookmarkWrapper);
    buttonContainer.appendChild(unlockButton);
    console.log("Unlock Checked button added to the DOM.");
  }

  /**
   * Unlocks the selected premium chapters.
   */
  async function unlockChecked() {
    let checkedBoxes;
    try {
      const token = await findToken();
      if (!token) {
        console.error("Token not found.");
        return;
      }

      checkedBoxes = document.querySelectorAll(".premium-checkbox:checked");
      if (checkedBoxes.length === 0) {
        console.log("No chapters selected.");
        return;
      }

      const unlockPromises = Array.from(checkedBoxes).map(async (checkbox) => {
        const chapterItem = checkbox.closest("li");
        const postID = chapterItem.getAttribute("data-id");
        const chapterLink = chapterItem.querySelector("a").href;

        console.log(`Unlocking chapter ${postID}...`);
        const success = await unlockChapter(chapterLink, token, postID);
        if (success) {
          console.log(`Chapter ${postID} unlocked successfully.`);
        } else {
          console.error(`Failed to unlock chapter ${postID}.`);
        }
      });

      await Promise.all(unlockPromises);
      console.log("All unlock requests have been processed.");
    } catch (error) {
      console.error("An error occurred during the unlock process:", error);
    } finally {
      // Uncheck all checkboxes
      if (checkedBoxes) {
        checkedBoxes.forEach((checkbox) => {
          checkbox.checked = false;
        });
      }
      console.log("Unlock process completed and checkboxes cleared.");
    }
  }

  /**
   * Unlocks a single chapter.
   * @param {string} URL - The URL of the chapter to unlock.
   * @param {string} token - The token for unlocking the chapter.
   * @param {string} postID - The ID of the post to unlock.
   * @returns {Promise<boolean>} - A promise that resolves to true if the chapter was unlocked successfully, otherwise false.
   */
  async function unlockChapter(URL, token, postID) {
    const postData = new URLSearchParams({
      action: "mycred-buy-content",
      token: token,
      postid: postID,
      ctype: "mycred_default",
    });

    try {
      const response = await sendRequest(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: postData.toString(),
      });

      if (!response.ok) {
        console.error("Network response was not ok");
        return false;
      }

      const data = await response.json();
      console.log("Successfully sent the request:", data);

      if (data.success) {
        console.log("Chapter unlocked successfully");
        return true;
      } else {
        console.error("Failed to buy chapter:", data.data);
        return false;
      }
    } catch (error) {
      console.error("Error:", error);
      return false;
    }
  }

  /**
   * Function to show or hide a spinner on an element
   * @param {HTMLElement} element - The element to show or hide the spinner on
   * @param {boolean} show - Whether to show or hide the spinner
   */
  function elementSpinner(element, show) {
    let spinner = element.querySelector(".spinner");
    let buttonText = element.querySelector(".button-text");

    if (show) {
      if (!spinner) {
        spinner = document.createElement("div");
        spinner.className = "spinner";
        element.appendChild(spinner);
      }
      buttonText.style.visibility = "hidden";
      spinner.classList.add("show");
    } else {
      if (spinner) {
        spinner.classList.remove("show");
      }
      buttonText.style.visibility = "visible";
    }
  }

  /**
   * Finds a token by randomly selecting a premium chapter and extracting the token from the response.
   * @returns {Promise<string|null>} - A promise that resolves to the token if found, otherwise null.
   */
  async function findToken() {
    const chapterList = document.querySelector(".eplister.eplisterfull");
    if (!chapterList) {
      console.error("Chapter list not found.");
      return null;
    }
    const premiumChapters = chapterList.querySelectorAll(
      "li:has(.premium-icon)"
    );

    if (premiumChapters.length === 0) {
      console.error("No premium chapters found.");
      return null;
    }

    const randomChapter =
      premiumChapters[Math.floor(Math.random() * premiumChapters.length)];
    const chapterLink = randomChapter.querySelector("a").href;

    try {
      const response = await fetch(chapterLink);
      const text = await response.text();

      const tokenMatch = text.match(
        /var\s+myCREDBuyContent\s*=\s*\{[^}]*"token"\s*:\s*"([^"]+)"/
      );

      if (tokenMatch && tokenMatch[1]) {
        console.log("Token found:", tokenMatch[1]);
        return tokenMatch[1];
      } else {
        console.error("Token not found in the response.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching the chapter:", error);
      return null;
    }
  }

  /**
   * Debounces function calls
   */
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Removes existing elements to prevent duplicates
   */
  function cleanup() {
    document.querySelectorAll(".premium-checkbox").forEach((el) => el.remove());
    document.querySelectorAll(".button-container").forEach((el) => el.remove());
  }

  /**
   * Observes DOM changes to handle dynamic content loading.
   * Re-initializes the script upon detecting relevant changes.
   */
  function observeDOMChanges() {
    const observer = new MutationObserver(
      debounce((mutations) => {
        const relevantChanges = mutations.some((mutation) =>
          Array.from(mutation.addedNodes).some(
            (node) =>
              node.nodeType === 1 &&
              (node.matches(".eplister.eplisterfull") ||
                node.matches(".serbookmark"))
          )
        );

        if (relevantChanges) {
          console.log("Relevant DOM changes detected. Re-initializing script.");
          cleanup();
          init();
        }
      }, 300)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("MutationObserver initialized to watch for DOM changes.");
  }

  function init() {
    if (isInitialized) {
      console.warn("Script is already initialized.");
      return;
    }

    if (!isLoggedIn()) {
      console.warn("Not logged in. Skipping Doby-Buy script initialization.");
      return;
    }

    findPremiumChapters();
    addUnlockCheckedButton();
    observeDOMChanges(); // Moved observeDOMChanges into init
    isInitialized = true;
    console.log("Script initialization completed.");
  }

  // Initialize script
  init();
})();
