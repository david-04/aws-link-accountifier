// ==UserScript==
// @name         AWS Link Accountifier
// @namespace    https://github.com/david-04/aws-link-accountifier
// @version      0.1
// @author       David Hofmann
// @description  Bind AWS console links to an account and - when opening such links - trigger an account change if required
// @homepage     https://github.com/david-04/aws-link-accountifier
// @updateURL    https://raw.githubusercontent.com/david-04/aws-link-accountifier/main/dist/tampermonkey/aws-link-accountifier.js
// @downloadURL  https://raw.githubusercontent.com/david-04/aws-link-accountifier/main/dist/tampermonkey/aws-link-accountifier.js
// @match        *://*.aws.amazon.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// ==/UserScript==
