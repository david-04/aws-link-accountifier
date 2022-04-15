// ==UserScript==
// @name         AWS Link Accountifier
// @namespace    https://github.com/david-04/aws-link-accountifier
// @version      1.0
// @author       David Hofmann
// @description  Bind AWS console links to an account and - when opening such links - trigger an account change if required
// @homepage     https://github.com/david-04/aws-link-accountifier
// @updateURL    https://raw.githubusercontent.com/david-04/aws-link-accountifier/main/dist/aws-link-accountifier.js
// @downloadURL  https://raw.githubusercontent.com/david-04/aws-link-accountifier/main/dist/aws-link-accountifier.js
// @match        *://*.aws.amazon.com/*
// @match        *://*/*aws-accountified-redirect.htm*
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
        banner.innerHTML = `Please sign in to account <b>${AwsLinkAccountifier.sanitize(accountName)}</b>`;
        const style = banner.style;
        style.backgroundColor = "yellow";
        style.fontSize = "1.4em";
        style.borderBottom = "1px solid black";
        style.padding = "0.75em";
        style.marginBottom = "1rem";
        style.width = "calc(100vw + 50px)";
        style.maxWidth = "calc(100vw + 50px)";
        style.marginLeft = "-50px";
        style.paddingLeft = "calc(50px + 0.75em)";
        document.body.insertBefore(banner, document.body.firstChild);
        highlightAccount(accountId, "yellow");
    }
    AwsLinkAccountifier.injectAccountSelectionHint = injectAccountSelectionHint;
    //------------------------------------------------------------------------------------------------------------------
    // Highlight the given account's login options
    //------------------------------------------------------------------------------------------------------------------
    function highlightAccount(accountId, color) {
        document.querySelectorAll("* * .saml-account-name").forEach(node => {
            var _a, _b;
            const element = node;
            const innerText = element.innerText;
            if (innerText.endsWith(` ${accountId}`) || innerText.endsWith(` (${accountId})`)) {
                const style = (_b = (_a = element.parentElement) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.style;
                if (style) {
                    if (color) {
                        style.backgroundColor = color;
                    }
                    else {
                        style.removeProperty("background-color");
                    }
                    style.paddingTop = "1.5em";
                    style.paddingBottom = "0.5em";
                }
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
        // Initialization
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
    const isAwsConsole = window.location.host.toLowerCase().endsWith("aws.amazon.com");
    const isAwsSignIn = window.location.host.toLowerCase().endsWith("signin.aws.amazon.com");
    const isRedirectPage = 0 <= window.location.pathname.indexOf("aws-accountified-redirect.htm");
    //------------------------------------------------------------------------------------------------------------------
    // Extract the URL hint and start or schedule the redirect processing
    //------------------------------------------------------------------------------------------------------------------
    function main() {
        if (isRedirectPage) {
            processRedirectPage();
        }
        if (isAwsSignIn) {
            const state = AwsLinkAccountifier.getRedirectState();
            if (state && state.shouldAutoLogout) {
                AwsLinkAccountifier.setRedirectState(Object.assign(Object.assign({}, state), { shouldAutoLogout: false }));
                if (AwsLinkAccountifier.getSettings().accountSwitchUrl.toLowerCase().indexOf("signin.aws.amazon.com") < 0) {
                    // login is done via external SSO - redirect away from AWS' default login page
                    AwsLinkAccountifier.initiateAccountSwitch();
                    return;
                }
            }
        }
        if (isAwsConsole) {
            AwsLinkAccountifier.extractUrlHint();
            AwsLinkAccountifier.onDOMContentLoaded(processNotificationsAndRedirects);
        }
        AwsLinkAccountifier.initializeMenu({
            copyLink: isAwsConsole && !isAwsSignIn,
            switchRole: isAwsConsole && !isAwsSignIn,
            setAccountSwitchUrl: isAwsConsole || isRedirectPage,
            useThisPageForRedirects: isRedirectPage
        });
    }
    AwsLinkAccountifier.main = main;
    //------------------------------------------------------------------------------------------------------------------
    // Redirect or inject messages to log out and in again
    //------------------------------------------------------------------------------------------------------------------
    function processNotificationsAndRedirects() {
        document.removeEventListener("DOMContentLoaded", processNotificationsAndRedirects);
        const redirectState = AwsLinkAccountifier.getRedirectState();
        if (redirectState) {
            if (isAwsSignIn) {
                AwsLinkAccountifier.injectAccountSelectionHint(redirectState);
            }
            else if (isAwsConsole) {
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
            AwsLinkAccountifier.initiateAccountSwitch();
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Intercept redirect service page loads
    //------------------------------------------------------------------------------------------------------------------
    function processRedirectPage() {
        var _a;
        try {
            const hash = decodeURIComponent(((_a = window.location.hash) !== null && _a !== void 0 ? _a : "").replace(/^#/, "").trim());
            if (hash) {
                const parameters = JSON.parse(hash);
                if (parameters
                    && "object" === typeof parameters
                    && "string" === typeof parameters.url
                    && parameters.url.match(/^http/)
                    && parameters.account
                    && "object" === typeof parameters.account) {
                    AwsLinkAccountifier.storeHint(parameters.url, { account: parameters.account });
                    window.location.href = parameters.url;
                }
                else {
                    console.error("The hash does not contain a valid 'url'");
                }
            }
        }
        catch (exception) {
            console.error(exception);
        }
    }
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    //------------------------------------------------------------------------------------------------------------------
    // Initialize the context menu
    //------------------------------------------------------------------------------------------------------------------
    function initializeMenu(options) {
        if (options.copyLink) {
            GM_registerMenuCommand("Copy link (redirect)", () => copyLinkToClipboard(AwsLinkAccountifier.createRedirectLink), "c");
            GM_registerMenuCommand("Copy link (direct)", () => copyLinkToClipboard(AwsLinkAccountifier.createDirectLink), "d");
        }
        if (options.switchRole) {
            GM_registerMenuCommand("Switch role", switchRole, "s");
        }
        if (options.setAccountSwitchUrl) {
            GM_registerMenuCommand("Set account-switch URL", setAccountSwitchUrl, "u");
        }
        if (options.useThisPageForRedirects) {
            AwsLinkAccountifier.onDOMContentLoaded(setRedirectUrl);
        }
    }
    AwsLinkAccountifier.initializeMenu = initializeMenu;
    //------------------------------------------------------------------------------------------------------------------
    // Copy link to clipboard
    //------------------------------------------------------------------------------------------------------------------
    function copyLinkToClipboard(generateLink) {
        var _a;
        const urlHint = (_a = AwsLinkAccountifier.getCurrentAwsSession()) === null || _a === void 0 ? void 0 : _a.toUrlHint();
        const url = urlHint ? generateLink(window.location.href, urlHint) : undefined;
        if (url) {
            GM_setClipboard(url);
        }
        else {
            GM_notification({
                title: "Error",
                text: "Failed to retrieve AWS account details",
                silent: true
            });
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Trigger an account switch
    //------------------------------------------------------------------------------------------------------------------
    function switchRole() {
        try {
            const account = AwsLinkAccountifier.getCurrentAwsSession();
            if (account === null || account === void 0 ? void 0 : account.role) {
                AwsLinkAccountifier.setRedirectState({
                    targetUrl: window.location.href,
                    requiredAccount: {
                        id: account.accountId,
                        alias: account.accountAlias,
                        exampleRole: account.role
                    },
                    shouldAutoLogout: false,
                    expiresAt: new Date().getTime() + 10 * 60 * 1000
                });
                AwsLinkAccountifier.initiateAccountSwitch();
            }
        }
        catch (exception) {
            console.error(exception);
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Set account switch URL
    //------------------------------------------------------------------------------------------------------------------
    function setAccountSwitchUrl() {
        const accountSwitchUrl = prompt(`
            Enter the URL to trigger an account change.
            It can include these placeholders:
            - \${ACCOUNT_ID}
            - \${ACCOUNT_ALIAS}
            - \${ROLE_NAME}
            `.trim().replace(/[ \t]*\r?\n[ \t]*/g, "\n"), AwsLinkAccountifier.getSettings().accountSwitchUrl);
        if (accountSwitchUrl) {
            AwsLinkAccountifier.updateSettings({ accountSwitchUrl });
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Use this page for redirects
    //------------------------------------------------------------------------------------------------------------------
    function setRedirectUrl() {
        const redirectVersion = document.body.dataset.awsAccountifiedRedirectVersion;
        if (redirectVersion && "string" === typeof redirectVersion) {
            const callback = () => AwsLinkAccountifier.updateSettings({ redirectUrl: window.location.href.replace(/#.*/, "") });
            GM_registerMenuCommand("Use this page for redirects", callback, "s");
        }
    }
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    function getPresetAccountSwitchUrl() {
        return "https://signin.aws.amazon.com/switchrole?account=${ACCOUNT_ID}&roleName=${ROLE_NAME}";
    }
    AwsLinkAccountifier.getPresetAccountSwitchUrl = getPresetAccountSwitchUrl;
    function getPresetRedirectUrl() {
        return "https://david-04.github.io/aws-link-accountifier/aws-accountified-redirect.html";
    }
    AwsLinkAccountifier.getPresetRedirectUrl = getPresetRedirectUrl;
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
        accountSwitchUrl: AwsLinkAccountifier.getPresetAccountSwitchUrl(),
        redirectUrl: AwsLinkAccountifier.getPresetRedirectUrl()
    };
    //------------------------------------------------------------------------------------------------------------------
    // Retrieve settings
    //------------------------------------------------------------------------------------------------------------------
    function getSettings() {
        var _a;
        return migrateSettings(Object.assign(Object.assign({}, DEFAULT_SETTINGS), ((_a = GM_getValue("settings", DEFAULT_SETTINGS)) !== null && _a !== void 0 ? _a : {})));
    }
    AwsLinkAccountifier.getSettings = getSettings;
    //------------------------------------------------------------------------------------------------------------------
    // Update the settings
    //------------------------------------------------------------------------------------------------------------------
    function updateSettings(settings) {
        GM_setValue(SETTINGS_KEY, Object.assign(Object.assign({}, getSettings()), settings));
    }
    AwsLinkAccountifier.updateSettings = updateSettings;
    //------------------------------------------------------------------------------------------------------------------
    // Migrate old settings
    //------------------------------------------------------------------------------------------------------------------
    function migrateSettings(settings) {
        var _a;
        const redirectUrl = (_a = settings.redirectUrl) !== null && _a !== void 0 ? _a : settings.redirectService;
        delete settings.redirectService;
        if ("string" === typeof redirectUrl) {
            return Object.assign(Object.assign({}, settings), { redirectUrl });
        }
        else {
            return settings;
        }
    }
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
    AwsLinkAccountifier.URL_HINT_PREFIX = "#aws-link-accountifier=";
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
    // Store the hint to trigger redirects later on
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
    AwsLinkAccountifier.storeHint = storeHint;
    //------------------------------------------------------------------------------------------------------------------
    // Extract the details from the hint
    //------------------------------------------------------------------------------------------------------------------
    function parseHint(hint) {
        var _a;
        try {
            const json = JSON.parse(decodeURIComponent(hint));
            if (!json || "object" !== typeof json || "string" !== typeof ((_a = json === null || json === void 0 ? void 0 : json.account) === null || _a === void 0 ? void 0 : _a.id)) {
                throw new Error(`account/id is missing`);
            }
            return json;
        }
        catch (exception) {
            throw new Error(`Invalid URL hint: ${hint} - (${exception})`);
        }
    }
    //------------------------------------------------------------------------------------------------------------------
    // Generate a direct link with an embedded hint
    //------------------------------------------------------------------------------------------------------------------
    function createDirectLink(url, hint) {
        return splitUrlAndHint(url).url + AwsLinkAccountifier.URL_HINT_PREFIX + encodeURIComponent(JSON.stringify(hint));
    }
    AwsLinkAccountifier.createDirectLink = createDirectLink;
    //------------------------------------------------------------------------------------------------------------------
    // Generate a redirecting link
    //------------------------------------------------------------------------------------------------------------------
    function createRedirectLink(url, hint) {
        return `${AwsLinkAccountifier.getSettings().redirectUrl}#${encodeURIComponent(JSON.stringify(Object.assign(Object.assign({}, hint), { url })))}`;
    }
    AwsLinkAccountifier.createRedirectLink = createRedirectLink;
    //------------------------------------------------------------------------------------------------------------------
    // Trigger an account switch based on the current redirect state
    //------------------------------------------------------------------------------------------------------------------
    function initiateAccountSwitch() {
        var _a, _b, _c;
        const account = (_a = AwsLinkAccountifier.getRedirectState()) === null || _a === void 0 ? void 0 : _a.requiredAccount;
        if (account) {
            const url = AwsLinkAccountifier.getSettings().accountSwitchUrl
                .replace(/\$\{ACCOUNT_ID\}/g, encodeURIComponent(account.id))
                .replace(/\$\{ACCOUNT_ALIAS\}/g, encodeURIComponent((_b = account.alias) !== null && _b !== void 0 ? _b : account.id))
                .replace(/\$\{ROLE_NAME\}/g, encodeURIComponent((_c = account.exampleRole) !== null && _c !== void 0 ? _c : ""));
            if (url !== window.location.href) {
                window.location.href = url;
            }
        }
    }
    AwsLinkAccountifier.initiateAccountSwitch = initiateAccountSwitch;
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
var AwsLinkAccountifier;
(function (AwsLinkAccountifier) {
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
        const expires = new Date(new Date().getTime() + ttlMs);
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};domain=${domain};path=${path}`;
    }
    AwsLinkAccountifier.setCookie = setCookie;
    //------------------------------------------------------------------------------------------------------------------
    // Sanitize HTML content
    //------------------------------------------------------------------------------------------------------------------
    function sanitize(text) {
        return text.replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    AwsLinkAccountifier.sanitize = sanitize;
    //------------------------------------------------------------------------------------------------------------------
    // Execute the given callback when the page has been loaded
    //------------------------------------------------------------------------------------------------------------------
    function onDOMContentLoaded(callback) {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            callback();
        }
        else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }
    AwsLinkAccountifier.onDOMContentLoaded = onDOMContentLoaded;
})(AwsLinkAccountifier || (AwsLinkAccountifier = {}));
AwsLinkAccountifier.main();
