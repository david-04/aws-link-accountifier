namespace AwsLinkAccountifier {

    let getAwsSessionCount = 0;

    //------------------------------------------------------------------------------------------------------------------
    // Extract the URL hint and start or schedule the redirect processing
    //------------------------------------------------------------------------------------------------------------------

    export function main() {
        if (isAwsUrl()) {
            extractUrlHint();
            initialiseMenu();
            if (document.readyState === "complete" || document.readyState === "interactive") {
                processNotificationsAndRedirects();
            } else {
                document.addEventListener("DOMContentLoaded", processNotificationsAndRedirects);
            }
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Redirect or inject messages to log out and in again
    //------------------------------------------------------------------------------------------------------------------

    function processNotificationsAndRedirects() {
        document.removeEventListener("DOMContentLoaded", processNotificationsAndRedirects);
        const redirectState = getRedirectState();
        if (redirectState) {
            if ("signin.aws.amazon.com" === window.location.host) {
                injectAccountSelectionHint(redirectState);
            } else if (window.location.host.endsWith(".console.aws.amazon.com")) {
                const awsSession = getCurrentAwsSession();
                if (awsSession || 10 * 10 < ++getAwsSessionCount) {
                    redirectOrDecorateConsolePage(redirectState, awsSession);
                } else {
                    setTimeout(processNotificationsAndRedirects, 100);
                }
            }
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Augment the console page
    //------------------------------------------------------------------------------------------------------------------

    function redirectOrDecorateConsolePage(redirectState: RedirectState, awsSession?: AwsSession) {
        if (!awsSession) {
            deleteRedirectState();
            console.error(
                `Failed to retrieve AWS user info - cookie ${AWS_USER_INFO_COOKIE_NAME} not set or format has changed?`
            );
        } else if (awsSession.matchesAccount(redirectState)) {
            deleteRedirectState();
            if (window.location.href !== redirectState.targetUrl) {
                window.location.href = redirectState.targetUrl;
            }
        } else if (redirectState.shouldAutoLogout) {
            setRedirectState({ ...redirectState, shouldAutoLogout: false });
            const account = redirectState.requiredAccount;
            const url = getSettings().accountSwitchUrl
                .replace(/\$\{ACCOUNT_ID\}/g, encodeURIComponent(account.id))
                .replace(/\$\{ACCOUNT_ALIAS\}/g, encodeURIComponent(account.alias ?? account.id))
                .replace(/\$\{ROLE_NAME\}/g, encodeURIComponent(account.exampleRole ?? ""));
            if (url !== window.location.href) {
                window.location.href = url;
            }
        }
    }
}
