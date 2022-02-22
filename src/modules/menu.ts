namespace AwsLinkAccountifier {

    //------------------------------------------------------------------------------------------------------------------
    // Initialise the context menu
    //------------------------------------------------------------------------------------------------------------------

    export function initialiseMenu(options: {
        copyLink: boolean, switchRole: boolean, setAccountSwitchUrl: boolean, useThisPageForRedirects: boolean
    }) {
        if (options.copyLink) {
            GM_registerMenuCommand("Copy link (redirect)", () => copyLinkToClipboard(createRedirectLink), "c");
            GM_registerMenuCommand("Copy link (direct)", () => copyLinkToClipboard(createDirectLink), "d");
        }
        if (options.switchRole) {
            GM_registerMenuCommand("Switch role", switchRole, "s");
        }
        if (options.setAccountSwitchUrl) {
            GM_registerMenuCommand("Set account-switch URL", setAccountSwitchUrl, "u");
        }
        if (options.useThisPageForRedirects) {
            onDOMContentLoaded(setRedirectUrl);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Copy link to clipboard
    //------------------------------------------------------------------------------------------------------------------

    function copyLinkToClipboard(generateLink: (url: string, urlHint: UrlHint) => string) {
        const urlHint = getCurrentAwsSession()?.toUrlHint();
        const url = urlHint ? generateLink(window.location.href, urlHint) : undefined;
        if (url) {
            GM_setClipboard(url);
        } else {
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
            const account = getCurrentAwsSession();
            if (account?.role) {
                setRedirectState({
                    targetUrl: window.location.href,
                    requiredAccount: {
                        id: account.accountId,
                        alias: account.accountAlias,
                        exampleRole: account.role,
                        excludeExampleRole: true
                    },
                    shouldAutoLogout: true,
                    expiresAt: new Date().getTime() + 10 * 60 * 1000
                });
                initiateAccountSwitch();
            }
        } catch (exception) {
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
            `.trim().replace(/[ \t]*\r?\n[ \t]*/g, "\n"),
            getSettings().accountSwitchUrl
        );
        if (accountSwitchUrl) {
            updateSettings({ accountSwitchUrl });
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Use this page for redirects
    //------------------------------------------------------------------------------------------------------------------

    function setRedirectUrl() {
        const redirectVersion = document.body.dataset.awsAccountifiedRedirectVersion;
        if (redirectVersion && "string" === typeof redirectVersion) {
            const callback = () => updateSettings({ redirectService: window.location.href.replace(/#.*/, "") });
            GM_registerMenuCommand("Use this page for redirects", callback, "s");
        }
    }
}
