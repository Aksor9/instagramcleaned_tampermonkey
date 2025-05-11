// ==UserScript==
// @name         Instagram Cleaned
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Hides Reels and Suggested Posts from the main Instagram feed. Might break with Instagram updates.
// @author       Aksor9
// @match        https://www.instagram.com/*
// @icon         https://www.instagram.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    // Adjust these if your Instagram interface is not in English
    const SUGGESTED_POSTS_TEXT = "Suggested Posts"; // Or "Publicaciones sugeridas" for Spanish
    const ALL_CAUGHT_UP_TEXT = "You're all caught up"; // Or "Ya viste todas las publicaciones nuevas." for Spanish
    const VIEW_OLDER_POSTS_TEXT = "View older posts"; // Or "Ver publicaciones anteriores" for Spanish

    // --- SCRIPT LOGIC ---

    const FEED_SELECTOR = 'main[role="main"]'; // Main content area selector, might need adjustment
    const POST_CONTAINER_SELECTOR = 'article'; // Selector for individual post containers (articles)
    const ALL_CAUGHT_UP_CONTAINER_SELECTOR = 'div'; // The div containing the "All caught up" message

    let processingScheduled = false;
    let foundCaughtUpMessage = false;

    function hideElements() {
        // Reset flag if navigating away and back
        if (!document.querySelector(FEED_SELECTOR)) {
            foundCaughtUpMessage = false;
            return;
        }

        const feedContainer = document.querySelector(FEED_SELECTOR);
        if (!feedContainer) {
            // console.log("Feed container not found.");
            return; // Feed container not ready yet
        }

        const postContainers = feedContainer.querySelectorAll(POST_CONTAINER_SELECTOR + ', ' + ALL_CAUGHT_UP_CONTAINER_SELECTOR);
        let startHiding = foundCaughtUpMessage; // Start hiding immediately if we already found the message

        postContainers.forEach(container => {
            // 1. Hide Reels anywhere in the feed
            // Check if the container is an article and contains a link to a reel
            if (container.tagName.toLowerCase() === 'article' && container.querySelector('a[href*="/reel/"]')) {
                // console.log("Hiding Reel:", container);
                container.style.display = 'none';
                return; // Move to the next container
            }

            // 2. Find the "All caught up" message or "Suggested Posts" header
            // Check specifically for the "All Caught Up" block based on inner text
            const hasCaughtUpText = Array.from(container.querySelectorAll('span')).some(span => span.textContent.includes(ALL_CAUGHT_UP_TEXT));
            const hasViewOlderPostsLink = container.querySelector(`a[href*="variant=past_posts"]`); // More specific check for the link

            // Use the HTML structure you provided as a stronger indicator
            const isCaughtUpBlock = hasCaughtUpText && hasViewOlderPostsLink && container.querySelector('img[alt="Checkmark"]');

            if (isCaughtUpBlock) {
                // console.log("Found 'All Caught Up' message block.");
                foundCaughtUpMessage = true;
                startHiding = true; // Start hiding elements *after* this one
                return; // Don't hide the "caught up" message itself, move to next container
            }

            // Alternative: Find the "Suggested Posts" header directly (less reliable as it might be hidden initially)
            const suggestedHeader = container.querySelector('h3'); // Look for H3 within potential suggestion containers
             if (suggestedHeader && suggestedHeader.textContent === SUGGESTED_POSTS_TEXT) {
                 // console.log("Found 'Suggested Posts' header.");
                 foundCaughtUpMessage = true; // Treat this as the marker too
                 startHiding = true;
                 // Hide this container itself and subsequent ones
                 container.style.display = 'none';
                 return;
             }

            // 3. Hide suggested posts (everything after the "caught up" message)
            if (startHiding && container.tagName.toLowerCase() === 'article') {
                // console.log("Hiding Suggested Post:", container);
                container.style.display = 'none';
            }
        });
    }

    function scheduleProcessing() {
        if (processingScheduled) {
            return;
        }
        processingScheduled = true;
        // Use requestAnimationFrame for smoother execution before the next repaint
        requestAnimationFrame(() => {
            hideElements();
            processingScheduled = false;
        });
    }

    // --- OBSERVER TO HANDLE DYNAMIC CONTENT ---

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any added node could be a post container or part of the feed
                 let relevantChange = false;
                 mutation.addedNodes.forEach(node => {
                    // Check if the node itself is a post container or contains one
                    if (node.nodeType === Node.ELEMENT_NODE) {
                         if (node.matches(POST_CONTAINER_SELECTOR) || node.querySelector(POST_CONTAINER_SELECTOR) || node.textContent.includes(ALL_CAUGHT_UP_TEXT) || node.textContent.includes(SUGGESTED_POSTS_TEXT)) {
                             relevantChange = true;
                         }
                    }
                 });

                 if (relevantChange) {
                    // console.log("Feed content changed, scheduling processing.");
                    scheduleProcessing();
                    return; // No need to check other mutations if one relevant change was found
                 }
            }
        }
    });

    // --- INITIALIZATION ---

    function initialize() {
        const targetNode = document.querySelector(FEED_SELECTOR);
        if (targetNode) {
            console.log("Instagram Feed Cleaner: Initializing observer on main feed.");
            hideElements(); // Initial run
            observer.observe(targetNode, { childList: true, subtree: true });
        } else {
            // If the main feed isn't ready yet, try again shortly
            // console.log("Instagram Feed Cleaner: Main feed not found, retrying...");
            setTimeout(initialize, 500);
        }
    }

    // Start the process
     initialize();

     // Re-run check on navigation changes (Instagram uses SPA navigation)
     // Simple approach: check URL changes
     let lastUrl = location.href;
     new MutationObserver(() => {
       const url = location.href;
       if (url !== lastUrl) {
         lastUrl = url;
         foundCaughtUpMessage = false; // Reset state on navigation
         console.log("Instagram Feed Cleaner: Navigation detected, re-initializing.");
         // Disconnect previous observer if necessary and re-initialize
         observer.disconnect();
         setTimeout(initialize, 500); // Give page time to potentially change
       }
     }).observe(document, {subtree: true, childList: true});


})();