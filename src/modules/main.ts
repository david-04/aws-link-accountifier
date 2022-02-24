namespace AwsLinkAccountifier {

    let getAwsSessionCount = 0;

    const isAwsConsole = window.location.host.toLowerCase().endsWith("aws.amazon.com");
    const isAwsSignin = window.location.host.toLowerCase().endsWith("signin.aws.amazon.com");
    const isRedirectPage = 0 <= window.location.pathname.indexOf("aws-accountified-redirect.htm");

    //------------------------------------------------------------------------------------------------------------------
    // Extract the URL hint and start or schedule the redirect processing
    //------------------------------------------------------------------------------------------------------------------

    export function main() {
        if (isRedirectPage) {
            processRedirectPage();
        }
        if (isAwsSignin) {
            const state = getRedirectState();
            if (state && state.shouldAutoLogout) {
                setRedirectState({ ...state, shouldAutoLogout: false });
                if (getSettings().accountSwitchUrl.toLowerCase().indexOf("signin.aws.amazon.com") < 0) {
                    // login is done via external SSO - redirect away from AWS' default login page
                    initiateAccountSwitch();
                    return;
                }
            }
        }
        if (isAwsConsole) {
            extractUrlHint();
            onDOMContentLoaded(processNotificationsAndRedirects);
        }
        initialiseMenu({
            copyLink: isAwsConsole && !isAwsSignin,
            switchRole: isAwsConsole && !isAwsSignin,
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
            if (isAwsSignin) {
                injectAccountSelectionHint(redirectState);
            } else if (isAwsConsole) {
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

    function processRedirectPage() {
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
