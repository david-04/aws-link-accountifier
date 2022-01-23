namespace AwsLinkAccountifier {

    //------------------------------------------------------------------------------------------------------------------
    // Inject menu items
    //------------------------------------------------------------------------------------------------------------------

    export function initialiseMenu() {
        if (window.location.host.endsWith(".console.aws.amazon.com")) {
            GM_registerMenuCommand("Copy link to clipboard", copyLinkToClipboard, "c");
        }
        GM_registerMenuCommand("Set account switch URL", setAccountSwitchUrl, "s");
    }

    //------------------------------------------------------------------------------------------------------------------
    // Menu actions
    //------------------------------------------------------------------------------------------------------------------

    function copyLinkToClipboard() {
        const awsSession = getCurrentAwsSession();
        const urlHint = awsSession?.toUrlHint();
        const url = urlHint ? getUrlWithAppendedHint(window.location.href, urlHint) : undefined;
        if (url) {
            GM_setClipboard(url);
        } else {
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
            `.trim().replace(/[ \t]*\r?\n[ \t]*/g, "\n"),
            getSettings().accountSwitchUrl
        );
        if (accountSwitchUrl) {
            updateSettings({ accountSwitchUrl });
        }
    }
}
