// ==UserScript==
// @name         AWS Link Accountifier
// @namespace    https://github.com/david-04/aws-link-accountifier
// @version      0.9
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
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    //------------------------------------------------------------------------------------------------------------------
    // Highlight the account/roles that should be used for the login
    //------------------------------------------------------------------------------------------------------------------
    function injectAccountSelectionHint(redirectState) {
        const accountId = redirectState.requiredAccount.id;
        const accountName = getDescriptiveAccountName(redirectState);
        const banner = document.createElement("DIV");
        banner.innerHTML = `
            <div id="accountified-aws-links-banner" style="width:100vw;background-color:yellow;border-bottom:1px solid black;padding:0.75em;font-size:1.4em;margin-bottom:1rem;">
                Please sign in to account <b>${AwsLinkAccountifier.sanitise(accountName)}</b>
                ... or
                <button style="font-size:1.1em;">Cancel this redirect</button>
            </div>
        `;
        const button = document.querySelector("#accountified-aws-links-banner button");
        if (button) {
            button.addEventListener("click", () => {
                AwsLinkAccountifier.deleteRedirectState();
                highlightAccount(accountId, null);
                banner.style.visibility = "hidden";
            });
        }
        document.body.insertBefore(banner, document.body.firstChild);
        highlightAccount(accountId, "yellow");
    }
    AwsLinkAccountifier.injectAccountSelectionHint = injectAccountSelectionHint;
    //------------------------------------------------------------------------------------------------------------------
    // Highlight the given account's login options
    //------------------------------------------------------------------------------------------------------------------
    function highlightAccount(accountId, colour) {
        document.querySelectorAll("* * .saml-account-name").forEach(node => {
            const element = node;
            const innerText = element.innerText;
            if (innerText.endsWith(` ${accountId}`) || innerText.endsWith(` (${accountId})`)) {
                const style = element.parentElement.parentElement.style;
                if (colour) {
                    style.backgroundColor = colour;
                }
                else {
                    style.removeProperty("background-color");
                }
                style.paddingTop = "1.5em";
                style.paddingBottom = "0.5em";
            }
        });
    }
    //------------------------------------------------------------------------------------------------------------------
    // Get a descriptive name for the account
    //------------------------------------------------------------------------------------------------------------------
    function getDescriptiveAccountName(redirectState) {
        const account = redirectState.requiredAccount;
        if (account.alias) {
            return `${account.alias} (${account.id})`;
        }
        else if (account.exampleRole) {
            return `${account.id} (e.g. ${account.exampleRole})`;
        }
        else {
            return account.id;
        }
    }
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    AwsLinkAccountifier.AWS_USER_INFO_COOKIE_NAME = "aws-userInfo";
    //------------------------------------------------------------------------------------------------------------------
    // Details about an AWS session
    //------------------------------------------------------------------------------------------------------------------
    class AwsSession {
        //--------------------------------------------------------------------------------------------------------------
        // Initialisation
        //--------------------------------------------------------------------------------------------------------------
        constructor(accountId, accountAlias, role) {
            this.accountId = accountId;
            this.accountAlias = accountAlias;
            this.role = role;
        }
        //--------------------------------------------------------------------------------------------------------------
        // Create a URL hint for this session's account
        //--------------------------------------------------------------------------------------------------------------
        toUrlHint() {
            const hint = { account: { id: this.accountId } };
            if (this.accountAlias && this.accountAlias !== this.accountId) {
                hint.account.alias = this.accountAlias;
            }
            if (this.role) {
                hint.account.exampleRole = this.role;
            }
            return hint;
        }
        //--------------------------------------------------------------------------------------------------------------
        // Verify if this session's account matches the redirect requirements
        //--------------------------------------------------------------------------------------------------------------
        matchesAccount(redirectState) {
            return redirectState.requiredAccount.id === this.accountId;
        }
    }
    AwsLinkAccountifier.AwsSession = AwsSession;
    //------------------------------------------------------------------------------------------------------------------
    // Retrieve information about the current session
    //------------------------------------------------------------------------------------------------------------------
    function getCurrentAwsSession() {
        const stringified = AwsLinkAccountifier.getCookie(AwsLinkAccountifier.AWS_USER_INFO_COOKIE_NAME);
        if (stringified) {
            const userInfo = JSON.parse(stringified);
            const accountId = extractPropertyFragment(userInfo, "arn", /^arn:aws:sts:[^:]*:/, /:.*/);
            if (accountId) {
                return new AwsSession(accountId, extractPropertyFragment(userInfo, "alias", /^/, /$/), extractPropertyFragment(userInfo, "arn", /^arn:aws:sts:[^:]*:[^:]*:assumed-role\//, /\/.*/));
            }
        }
        return undefined;
    }
    AwsLinkAccountifier.getCurrentAwsSession = getCurrentAwsSession;
    //------------------------------------------------------------------------------------------------------------------
    // Extract a piece of information from an object property
    //------------------------------------------------------------------------------------------------------------------
    function extractPropertyFragment(object, propertyName, matchAndRemove, remove) {
        const value = AwsLinkAccountifier.getStringProperty(object, propertyName);
        if (value && value.match(matchAndRemove)) {
            return value.replace(matchAndRemove, "").replace(remove, "");
        }
        return undefined;
    }
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    let getAwsSessionCount = 0;
    //------------------------------------------------------------------------------------------------------------------
    // Extract the URL hint and start or schedule the redirect processing
    //------------------------------------------------------------------------------------------------------------------
    function main() {
        if (AwsLinkAccountifier.isAwsUrl()) {
            AwsLinkAccountifier.extractUrlHint();
            AwsLinkAccountifier.initialiseMenu();
            if (document.readyState === "complete" || document.readyState === "interactive") {
                processNotificationsAndRedirects();
            }
            else {
                document.addEventListener("DOMContentLoaded", processNotificationsAndRedirects);
            }
        }
    }
    AwsLinkAccountifier.main = main;
    //------------------------------------------------------------------------------------------------------------------
    // Redirect or inject messages to log out and in again
    //------------------------------------------------------------------------------------------------------------------
    function processNotificationsAndRedirects() {
        document.removeEventListener("DOMContentLoaded", processNotificationsAndRedirects);
        const redirectState = AwsLinkAccountifier.getRedirectState();
        if (redirectState) {
            if ("signin.aws.amazon.com" === window.location.host) {
                AwsLinkAccountifier.injectAccountSelectionHint(redirectState);
            }
            else if (window.location.host.endsWith(".console.aws.amazon.com")) {
                const awsSession = AwsLinkAccountifier.getCurrentAwsSession();
                if (awsSession || 10 * 10 < ++getAwsSessionCount) {
                    redirectOrDecorateConsolePage(redirectState, awsSession);
                }
                else {
                    setTimeout(processNotificationsAndRedirects, 100);
                }
            }
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Augment the console page
    //------------------------------------------------------------------------------------------------------------------
    function redirectOrDecorateConsolePage(redirectState, awsSession) {
        var _a, _b;
        if (!awsSession) {
            AwsLinkAccountifier.deleteRedirectState();
            console.error(`Failed to retrieve AWS user info - cookie ${AwsLinkAccountifier.AWS_USER_INFO_COOKIE_NAME} not set or format has changed?`);
        }
        else if (awsSession.matchesAccount(redirectState)) {
            AwsLinkAccountifier.deleteRedirectState();
            if (window.location.href !== redirectState.targetUrl) {
                window.location.href = redirectState.targetUrl;
            }
        }
        else if (redirectState.shouldAutoLogout) {
            AwsLinkAccountifier.setRedirectState(Object.assign(Object.assign({}, redirectState), { shouldAutoLogout: false }));
            const account = redirectState.requiredAccount;
            const url = AwsLinkAccountifier.getSettings().accountSwitchUrl
                .replace(/\$\{ACCOUNT_ID\}/g, encodeURIComponent(account.id))
                .replace(/\$\{ACCOUNT_ALIAS\}/g, encodeURIComponent((_a = account.alias) !== null && _a !== void 0 ? _a : account.id))
                .replace(/\$\{ROLE_NAME\}/g, encodeURIComponent((_b = account.exampleRole) !== null && _b !== void 0 ? _b : ""));
            if (url !== window.location.href) {
                window.location.href = url;
            }
        }
    }
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    //------------------------------------------------------------------------------------------------------------------
    // Inject menu items
    //------------------------------------------------------------------------------------------------------------------
    function initialiseMenu() {
        if (window.location.host.endsWith(".console.aws.amazon.com")) {
            GM_registerMenuCommand("Copy link to clipboard", copyLinkToClipboard, "c");
        }
        GM_registerMenuCommand("Set account switch URL", setAccountSwitchUrl, "s");
    }
    AwsLinkAccountifier.initialiseMenu = initialiseMenu;
    //------------------------------------------------------------------------------------------------------------------
    // Menu actions
    //------------------------------------------------------------------------------------------------------------------
    function copyLinkToClipboard() {
        const awsSession = AwsLinkAccountifier.getCurrentAwsSession();
        const urlHint = awsSession === null || awsSession === void 0 ? void 0 : awsSession.toUrlHint();
        const url = urlHint ? AwsLinkAccountifier.getUrlWithAppendedHint(window.location.href, urlHint) : undefined;
        if (url) {
            GM_setClipboard(url);
        }
        else {
            GM_notification({
                title: "oh no",
                text: "Failed to retrieve AWS account details",
                silent: true
            });
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Set the URL for initiating an account switch
    //------------------------------------------------------------------------------------------------------------------
    function setAccountSwitchUrl() {
        const accountSwitchUrl = prompt(`
            Enter the URL to trigger an account change.
            Can include these placeholders:
            - \${ACCOUNT_ID}
            - \${ACCOUNT_ALIAS}
            - \${ROLE_NAME}
            `.trim().replace(/[ \t]*\r?\n[ \t]*/g, "\n"), AwsLinkAccountifier.getSettings().accountSwitchUrl);
        if (accountSwitchUrl) {
            AwsLinkAccountifier.updateSettings({ accountSwitchUrl });
        }
    }
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    const REDIRECT_STATE_KEY = "redirectState";
    //------------------------------------------------------------------------------------------------------------------
    // Set the redirect state
    //------------------------------------------------------------------------------------------------------------------
    function setRedirectState(state) {
        GM_setValue(REDIRECT_STATE_KEY, state);
    }
    AwsLinkAccountifier.setRedirectState = setRedirectState;
    //------------------------------------------------------------------------------------------------------------------
    // Delete the redirect state
    //------------------------------------------------------------------------------------------------------------------
    function deleteRedirectState() {
        GM_deleteValue(REDIRECT_STATE_KEY);
    }
    AwsLinkAccountifier.deleteRedirectState = deleteRedirectState;
    //------------------------------------------------------------------------------------------------------------------
    // Retrieve the current redirect state
    //------------------------------------------------------------------------------------------------------------------
    function getRedirectState() {
        const state = GM_getValue(REDIRECT_STATE_KEY, undefined);
        if (state) {
            if (new Date().getTime() <= state.expiresAt) {
                return state;
            }
            deleteRedirectState();
        }
        return undefined;
    }
    AwsLinkAccountifier.getRedirectState = getRedirectState;
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    const SETTINGS_KEY = "settings";
    //------------------------------------------------------------------------------------------------------------------
    // Default settings
    //------------------------------------------------------------------------------------------------------------------
    const DEFAULT_SETTINGS = {
        accountSwitchUrl: "https://signin.aws.amazon.com/switchrole?account=${ACCOUNT_ID}&roleName=${ROLE_NAME}"
    };
    //------------------------------------------------------------------------------------------------------------------
    // Retrieve settings
    //------------------------------------------------------------------------------------------------------------------
    function getSettings() {
        return GM_getValue("settings", DEFAULT_SETTINGS);
    }
    AwsLinkAccountifier.getSettings = getSettings;
    //------------------------------------------------------------------------------------------------------------------
    // Update the settings
    //------------------------------------------------------------------------------------------------------------------
    function updateSettings(settings) {
        GM_setValue(SETTINGS_KEY, Object.assign(Object.assign({}, getSettings()), settings));
    }
    AwsLinkAccountifier.updateSettings = updateSettings;
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    AwsLinkAccountifier.URL_HINT_PREFIX = "#acountified-aws-link=";
    //------------------------------------------------------------------------------------------------------------------
    // Extract the hint from the URL, store the re-direct state, and go to the non-hinted original URL
    //------------------------------------------------------------------------------------------------------------------
    function extractUrlHint() {
        try {
            const { url, hint } = splitUrlAndHint(window.location.href);
            if (undefined !== hint) {
                AwsLinkAccountifier.deleteRedirectState();
                if (hint) {
                    storeHint(url, parseHint(hint));
                }
                window.location.replace(url);
            }
        }
        catch (exception) {
            console.error(exception);
        }
    }
    AwsLinkAccountifier.extractUrlHint = extractUrlHint;
    //------------------------------------------------------------------------------------------------------------------
    // Split the URL into the original URL and the appended hint
    //------------------------------------------------------------------------------------------------------------------
    function splitUrlAndHint(url) {
        const index = url.indexOf(AwsLinkAccountifier.URL_HINT_PREFIX);
        if (0 < index) {
            return {
                url: url.substring(0, index),
                hint: url.substring(index + AwsLinkAccountifier.URL_HINT_PREFIX.length)
            };
        }
        else {
            return { url };
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Store the hint in a cookie to trigger redirects later on
    //------------------------------------------------------------------------------------------------------------------
    function storeHint(targetUrl, hint) {
        try {
            AwsLinkAccountifier.setRedirectState({
                targetUrl,
                requiredAccount: {
                    id: hint.account.id,
                    alias: hint.account.alias,
                    exampleRole: hint.account.exampleRole
                },
                shouldAutoLogout: true,
                expiresAt: new Date().getTime() + 10 * 60 * 1000
            });
        }
        catch (exception) {
            console.error(exception);
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Extract the details from the hint
    //------------------------------------------------------------------------------------------------------------------
    function parseHint(hint) {
        var _a;
        try {
            const json = JSON.parse(decodeURIComponent(hint));
            if (!json || "object" !== typeof json || "string" !== typeof ((_a = json === null || json === void 0 ? void 0 : json.account) === null || _a === void 0 ? void 0 : _a.id)) {
                throw `Invalid URL hint: ${hint} (account/id is missing)`;
            }
            return json;
        }
        catch (exception) {
            throw `Invalid URL hint: ${hint} (${exception})`;
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Append the given hint to the given URL
    //------------------------------------------------------------------------------------------------------------------
    function getUrlWithAppendedHint(url, hint) {
        return splitUrlAndHint(url).url + AwsLinkAccountifier.URL_HINT_PREFIX + encodeURIComponent(JSON.stringify(hint));
    }
    AwsLinkAccountifier.getUrlWithAppendedHint = getUrlWithAppendedHint;
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    //------------------------------------------------------------------------------------------------------------------
    // Check if the current URL is for the AWS console
    //------------------------------------------------------------------------------------------------------------------
    function isAwsUrl() {
        return !!window.location.host.toLowerCase().endsWith(".aws.amazon.com");
    }
    AwsLinkAccountifier.isAwsUrl = isAwsUrl;
    //------------------------------------------------------------------------------------------------------------------
    // Get a string property from an object
    //------------------------------------------------------------------------------------------------------------------
    function getStringProperty(object, key) {
        if (object && "object" === typeof object && "string" === typeof (object[key])) {
            return object[key];
        }
        else {
            return undefined;
        }
    }
    AwsLinkAccountifier.getStringProperty = getStringProperty;
    //------------------------------------------------------------------------------------------------------------------
    // Get a cookie
    //------------------------------------------------------------------------------------------------------------------
    function getCookie(cName) {
        const name = cName + "=";
        const cDecoded = decodeURIComponent(document.cookie);
        const array = cDecoded.split('; ');
        let result;
        array.forEach(value => {
            if (value.indexOf(name) === 0)
                result = value.substring(name.length);
        });
        return result;
    }
    AwsLinkAccountifier.getCookie = getCookie;
    //------------------------------------------------------------------------------------------------------------------
    // Set a cookie
    //------------------------------------------------------------------------------------------------------------------
    function setCookie(name, value, domain, path, ttlMs) {
        var expires = new Date(new Date().getTime() + ttlMs);
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};domain=${domain};path=${path}`;
    }
    AwsLinkAccountifier.setCookie = setCookie;
    //------------------------------------------------------------------------------------------------------------------
    // Sanitise HTML content
    //------------------------------------------------------------------------------------------------------------------
    function sanitise(text) {
        return text.replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    AwsLinkAccountifier.sanitise = sanitise;
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
AwsLinkAccountifier.main();
