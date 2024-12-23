// ==UserScript==
// @name        Doby-Buy
// @namespace   https://github.com/Salvora
// @version     1.0.0
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_setValue
// @grant       GM_getValue
// @author      Salvora
// @description Userscript For Doby Translations
// @match       https://dobytranslations.com/series/*
// @license     GPL-3.0-or-later
// @run-at      document-end
// ==/UserScript==

(function () {
  "use strict";

  /**
   * Send HTTP request with timeout
   * @param {string} url - The URL to send the request to
   * @param {Object} options - Request options
   * @param {number} [timeout=10000] - Timeout in milliseconds
   * @returns {Promise<Response>} Fetch response
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



function findPremium() {
  const chapterList = document.querySelector('.eplister.eplisterfull');
  const coinElements = chapterList.querySelectorAll('li:has(.premium-icon)');
  console.log(`Found ${coinElements.length} coin elements`);

  coinElements.forEach(item => {
    const eplNum = item.querySelector('.epl-num');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'premium-checkbox';
    checkbox.style.marginRight = '5px'; // Adjust the margin as needed
    checkbox.style.width = '20px'; // Increase width
    checkbox.style.height = '20px'; // Increase height

    eplNum.parentNode.insertBefore(checkbox, eplNum.nextSibling);
  });
}

function unlockCheckedButton() {
  const bookmarkElement = document.querySelector('.serbookmark');
  if (bookmarkElement) {
    const unlockButton = document.createElement('div');
    unlockButton.className = 'bookmark marked'; // Use similar class for styling
    unlockButton.style.marginLeft = '10px'; // Adjust margin as needed
    unlockButton.innerHTML = '<i class="fas fa-unlock" aria-hidden="true"></i> Unlock Checked';

    // Add event listener for the button
    unlockButton.addEventListener('click', () => {
      unlockChecked();
    });

    // Insert the button next to the "Bookmarked" element
    bookmarkElement.insertAdjacentElement('afterend', unlockButton);
  }
}

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

  async function findToken() {
    const chapterList = document.querySelector('.eplister.eplisterfull');
    const premiumChapters = chapterList.querySelectorAll('li:has(.premium-icon)');
  
    if (premiumChapters.length === 0) {
      console.error('No premium chapters found.');
      return null;
    }
  
    // Randomly select a premium chapter
    const randomChapter = premiumChapters[Math.floor(Math.random() * premiumChapters.length)];
    const chapterLink = randomChapter.querySelector('a').href;
  
    try {
      const response = await fetch(chapterLink);
      const text = await response.text();
  
      // Extract the token from the response
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
   * Main initialization function
   */
  function init() {
    findPremium();
    unlockCheckedButton();
  }

  init();
})();