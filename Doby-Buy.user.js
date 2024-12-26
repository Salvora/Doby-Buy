// ==UserScript==
// @name        Doby-Buy
// @namespace   https://github.com/Salvora
// @version     1.0.1
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
  "use strict";
  let isInitialized = false;

  // Apply custom CSS
  try {
    GM_addStyle(GM_getResourceText('customCSS'));
    console.log("Custom CSS applied successfully.");
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
        setTimeout(() => reject(new Error('Request timed out')), timeout)
      )
    ]);
  }

  /**
   * Finds premium chapters and adds checkboxes to them.
   * Clicking anywhere other than the title will toggle the checkbox.
   */
  function findPremium() {
    const chapterList = document.querySelector('.eplister.eplisterfull');
    if (!chapterList) {
      console.warn("Chapter list not found.");
      return;
    }

    const coinElements = chapterList.querySelectorAll('li:has(.premium-icon)');
    console.log(`Found ${coinElements.length} coin elements`);

    coinElements.forEach(item => {
      // Check if checkbox already exists
      if (item.querySelector('.premium-checkbox')) return;

      const eplNum = item.querySelector('.epl-num');
      const eplTitle = item.querySelector('.epl-title');
      const link = item.querySelector('a');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'premium-checkbox';

      eplNum.parentNode.insertBefore(checkbox, eplNum.nextSibling);

      // Prevent default link behavior when clicking outside the title
      link.addEventListener('click', (e) => {
        if (!eplTitle.contains(e.target)) {
          e.preventDefault();
        }
      });

      // Add event listener for checkbox toggle
      item.addEventListener('click', (event) => {
        if (!eplTitle.contains(event.target) && event.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
      });
    });
  }

  /**
   * Adds the "Unlock Checked" button next to the "Bookmarked" button.
   */
  function unlockCheckedButton() {
    const bookmarkElement = document.querySelector('.serbookmark .bookmark');
    const followedElement = document.querySelector('.serbookmark .bmc');

    if (!bookmarkElement) {
      console.warn("Bookmark element not found.");
      return;
    }

      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container';

      const bookmarkWrapper = document.createElement('div');
      bookmarkWrapper.className = 'bookmark-wrapper';

      const unlockButton = document.createElement('div');
      unlockButton.className = 'bookmark marked';
      unlockButton.innerHTML = '<i class="fas fa-unlock" aria-hidden="true"></i> Unlock Checked';
      unlockButton.addEventListener("click", async () => {
        unlockButton.classList.add('click-animation');
        setTimeout(() => {
          unlockButton.classList.remove('click-animation');
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
    const token = await findToken();
    if (!token) {
      console.error('Token not found.');
      return;
    }

    const checkedBoxes = document.querySelectorAll('.premium-checkbox:checked');
    if (checkedBoxes.length === 0) {
      console.log('No chapters selected.');
      return;
    }

    const unlockPromises = Array.from(checkedBoxes).map(async checkbox => {
      const chapterItem = checkbox.closest('li');
      const postID = chapterItem.getAttribute('data-id');
      const chapterLink = chapterItem.querySelector('a').href;

      console.log(`Unlocking chapter ${postID}...`);
      const success = await unlockChapter(chapterLink, token, postID);
      if (success) {
        console.log(`Chapter ${postID} unlocked successfully.`);
      } else {
        console.error(`Failed to unlock chapter ${postID}.`);
      }
    });

    await Promise.all(unlockPromises);
    console.log('All unlock requests have been processed.');
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
   * Finds a token by randomly selecting a premium chapter and extracting the token from the response.
   * @returns {Promise<string|null>} - A promise that resolves to the token if found, otherwise null.
   */
  async function findToken() {
    const chapterList = document.querySelector('.eplister.eplisterfull');
    if (!chapterList) {
      console.error('Chapter list not found.');
      return null;
    }    
    const premiumChapters = chapterList.querySelectorAll('li:has(.premium-icon)');

    if (premiumChapters.length === 0) {
      console.error('No premium chapters found.');
      return null;
    }

    const randomChapter = premiumChapters[Math.floor(Math.random() * premiumChapters.length)];
    const chapterLink = randomChapter.querySelector('a').href;

    try {
      const response = await fetch(chapterLink);
      const text = await response.text();

      const tokenMatch = text.match(/var myCREDBuyContent = \{"ajaxurl":"[^"]+","token":"([^"]+)"/);
      if (tokenMatch && tokenMatch[1]) {
        console.log('Token found:', tokenMatch[1]);
        return tokenMatch[1];
      } else {
        console.error('Token not found in the response.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching the chapter:', error);
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
    document.querySelectorAll('.premium-checkbox').forEach(el => el.remove());
    document.querySelectorAll('.button-container').forEach(el => el.remove());
  }

  /**
   * Observes DOM changes for dynamic content
   */
  function observeDOMChanges() {
    const observer = new MutationObserver(
      debounce((mutations) => {
        // Check if relevant nodes were added/removed
        const hasRelevantChanges = mutations.some(mutation => {
          return Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (
              node.matches('.eplister.eplisterfull') ||
              node.matches('.serbookmark')
            )
          );
        });

        if (hasRelevantChanges) {
          isInitialized = false;
          cleanup();
          init();
        }
      }, 300)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Initializes the script
   */
  function init() {
    if (isInitialized) return;
    
    findPremium();
    unlockCheckedButton();
    isInitialized = true;
  }


  // Initialize script and observe changes
  init();
  observeDOMChanges();
})();