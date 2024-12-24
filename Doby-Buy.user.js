// ==UserScript==
// @name        Doby-Buy
// @namespace   https://github.com/Salvora
// @version     1.0.0
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_setValue
// @grant       GM_getValue
// @resource    customCSS https://raw.githubusercontent.com/Salvora/Doby-Buy/refs/heads/main/styles.css?token=GHSAT0AAAAAACXMCGYVUQ3J5SFFKYBJL2JWZ3KUR7Q&v=1.0.0
// @author      Salvora
// @homepageURL https://github.com/Salvora/Doby-Buy
// @updateURL   https://raw.githubusercontent.com/Salvora/Doby-Buy/refs/heads/main/Doby-Buy.user.js?token=GHSAT0AAAAAAC4LMOFYEMQGFDDFL3GFBLOOZ3KUW2Q
// @downloadURL https://raw.githubusercontent.com/Salvora/Doby-Buy/refs/heads/main/Doby-Buy.user.js?token=GHSAT0AAAAAAC4LMOFYEMQGFDDFL3GFBLOOZ3KUW2Q
// @supportURL  https://github.com/Salvora/Doby-Buy/issues
// @description Userscript For Doby Translations
// @match       https://dobytranslations.com/series/*
// @license     GPL-3.0-or-later
// @run-at      document-end
// ==/UserScript==

(function () {
  "use strict";

  GM_addStyle(GM_getResourceText('customCSS'));

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

      eplNum.parentNode.insertBefore(checkbox, eplNum.nextSibling);
    });
  }

  function unlockCheckedButton() {
    const bookmarkElement = document.querySelector('.serbookmark .bookmark');
    const followedElement = document.querySelector('.serbookmark .bmc');

    if (bookmarkElement) {
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'button-container';

      const bookmarkWrapper = document.createElement('div');
      bookmarkWrapper.className = 'bookmark-wrapper';

      const unlockButton = document.createElement('div');
      unlockButton.className = 'bookmark marked';
      unlockButton.innerHTML = '<i class="fas fa-unlock" aria-hidden="true"></i> Unlock Checked';
      unlockButton.addEventListener('click', () => {
        unlockChecked();
      });

      bookmarkElement.parentNode.insertBefore(buttonContainer, bookmarkElement);
      bookmarkWrapper.appendChild(bookmarkElement);
      if (followedElement) {
        bookmarkWrapper.appendChild(followedElement);
      }
      buttonContainer.appendChild(bookmarkWrapper);
      buttonContainer.appendChild(unlockButton);
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

  function init() {
    findPremium();
    unlockCheckedButton();
  }

  init();
})();