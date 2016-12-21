// ==UserScript==
// @name        pinboard-popup-mod
// @description Enhance the pinboard.in bookmarklet page
// @namespace   https://kafene.org
// @version     1.0.0
// @match       *://*.pinboard.in/add*
// @grant       none
// ==/UserScript==
/* jshint moz: true, esversion: 6 */

/*
 * This script does the following:
 *   - Highlights selected tags in the tag cloud and the suggested tag area.
 *   - Toggles tags when clicked, rather than simply appending them.
 *   - Keeps the list of selected tags unique.
 *   - Colors the description textarea green when the bookmark has already
 *     been added, to give a stronger visual indicator.
 *
 * Homepage: https://github.com/kafene/pinboard-popup-mod
 */

(function () {
    "use strict";

    if (!window.location.pathname.startsWith("/add")) {
        return;
    }

    const form = document.querySelector("form[method=post][action='/add']");
    if (!form) {
        console.warn("Missing form");
        return;
    }

    const tagsInput = form.querySelector("input[name=tags]");
    if (!tagsInput) {
        console.warn("Missing tagsInput");
        return;
    }

    const submitButton = form.querySelector("input[type=submit]");

    const $ = selector => document.querySelector(selector);

    const $$ = selector => Array.from(document.querySelectorAll(selector));

    const uniq = arr => arr.filter((e, i, a) => a.indexOf(e, i + 1) === -1);

    const appendSpace = () => {
        if (tagsInput.value.trim() !== "") {
            tagsInput.value += " ";
        }
    };

    const getTags = () => {
        let tags = tagsInput.value.trim();
        tags = tags.split(/[,\s]+/); // split by spaces/commas
        tags = uniq(tags); // make list unique
        tags = tags.filter(t => !!t); // remove any empty values
        return tags;
    };

    const setTags = tags => {
        tags = uniq(tags); // make list unique
        tags = tags.filter(t => !!t); // remove any empty values
        tags = tags.join(" ");
        tagsInput.value = tags;
        appendSpace();
    };

    const syncTags = () => {
        setTags(getTags());
    };

    const isTagLink = elem => elem.matches && elem.matches("div.pin-ac li,a.suggested_tag");

    const focusIfClick = button => {
        if (button === 0) {
            tagsInput.focus();
        }
    };

    const addTag = ({ target, button=null }) => {
        const tag = target.textContent.trim();
        const newTags = getTags();
        newTags.push(tag);
        setTags(newTags);
        highlightSelectedTags().then(() => focusIfClick(button));
    };

    const removeTag = ({ target, button=null }) => {
        const tag = target.textContent.trim();
        const newTags = getTags().filter(t => t !== tag);
        setTags(newTags);
        highlightSelectedTags().then(() => focusIfClick(button));
    };

    const unhighlightAllTags = () => {
        $$("a[onclick*=add_tag]").forEach(a => {
            a.classList.remove("add_tag_active");
        });
    };

    const activateSelectedTags = () => {
        getTags().forEach((tag) => {
            $$(`a[onclick*="add_tag('${tag}')"]`).forEach(a => {
                a.classList.add("add_tag_active");
                a.style.backgroundColor = "rgb(221,238,255)";
                a.removeEventListener("click", addTag);
                a.addEventListener("click", removeTag);
            });
        });
    };

    const deactivateNonSelectedTags = () => {
        $$("a[onclick*=add_tag]:not(.add_tag_active)").forEach(a => {
            a.classList.remove("add_tag_active");
            a.style.backgroundColor = "inherit";
            a.removeEventListener("click", removeTag);
            a.addEventListener("click", addTag);
        });
    };

    const highlightSelectedTags = () => {
        return new Promise((resolve, reject) => {
            try {
                unhighlightAllTags();
                activateSelectedTags();
                deactivateNonSelectedTags();
                resolve();
            } catch (err) {
                console.exception(err);
                reject(err);
            }
        });
    };

    tagsInput.addEventListener("change", highlightSelectedTags);
    tagsInput.addEventListener("input", highlightSelectedTags);
    tagsInput.addEventListener("keypress", highlightSelectedTags);
    tagsInput.addEventListener("blur", syncTags);

    tagsInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            syncTags();
        }
    });

    submitButton.addEventListener("mousedown", syncTags);
    submitButton.addEventListener("keydown", syncTags);

    document.addEventListener("mousedown", e => {
        if (isTagLink(e.target)) {
            highlightSelectedTags();
        }
    });

    // Make the body background green if the bookmark was already added.
    if ($("#popup_header div.alert")) {
        $("textarea").style.backgroundColor = "#ced";
    }

    highlightSelectedTags().then(() => {
        appendSpace();
        tagsInput.focus();
    });

    // Watch for suggested tags to be loaded
    new MutationObserver(function (mutations) {
        const observer = this;
        mutations.forEach(mutation => {
            if (mutation.addedNodes) {
                Array.forEach(mutation.addedNodes, node => {
                    if (node && node.matches && node.matches("a.suggested_tag")) {
                        // let tag = node.textContent.trim();
                        observer.disconnect();
                        highlightSelectedTags();
                    }
                });
            }
        });
    }).observe(document.body, {childList: true, subtree: true});
})();
