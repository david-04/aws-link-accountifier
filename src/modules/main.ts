namespace AwsLinkAccountifier {

    let getAwsSessionCount = 0;

    //------------------------------------------------------------------------------------------------------------------
    // Extract the URL hint and start or schedule the redirect processing
    //------------------------------------------------------------------------------------------------------------------

    export function main() {
        const isAwsConsole = window.location.host.toLowerCase().endsWith(".aws.amazon.com");
        const isRedirectPage = 0 <= window.location.pathname.indexOf("aws-accountified-redirect.htm");
        if (isAwsConsole) {
            extractUrlHint();
            onDOMContentLoaded(processNotificationsAndRedirects);
        }
        if (isRedirectPage) {
            processRedirectUrl();
        }
        initialiseMenu({
            copyLink: isAwsConsole,
            switchRole: isAwsConsole,
            setAccountSwitchUrl: isAwsConsole || isRedirectPage,
            useThisPageForRedirects: isRedirectPage
        });
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
            initiateAccountSwitch();
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Intercept redirect service page loads
    //------------------------------------------------------------------------------------------------------------------

    function processRedirectUrl() {
        try {
            const hash = decodeURIComponent((window.location.hash ?? "").replace(/^#/, "").trim());
            if (hash) {
                const parameters = JSON.parse(hash) as UrlHint & { url: string };
                if (parameters
                    && "object" === typeof parameters
                    && "string" === typeof parameters.url
                    && parameters.url.match(/^http/)
                    && parameters.account
                    && "object" === typeof parameters.account) {
                    storeHint(parameters.url, { account: parameters.account });
                    window.location.href = parameters.url;
                } else {
                    console.error("The hash does not contain a valid 'url'");
                }
            }
        } catch (exception) {
            console.error(exception);
        }
    }
}
