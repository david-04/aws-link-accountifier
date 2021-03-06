namespace AwsLinkAccountifier {

    export const URL_HINT_PREFIX = "#aws-link-accountifier=";

    //------------------------------------------------------------------------------------------------------------------
    // Data structure of the stringified URL hint
    //------------------------------------------------------------------------------------------------------------------

    export interface UrlHint {
        account: {
            id: string;
            alias?: string;
            exampleRole?: string;
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Extract the hint from the URL, store the re-direct state, and go to the non-hinted original URL
    //------------------------------------------------------------------------------------------------------------------

    export function extractUrlHint() {
        try {
            const { url, hint } = splitUrlAndHint(window.location.href);
            if (undefined !== hint) {
                deleteRedirectState();
                if (hint) {
                    storeHint(url, parseHint(hint));
                }
                window.location.replace(url);
            }
        } catch (exception) {
            console.error(exception);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Split the URL into the original URL and the appended hint
    //------------------------------------------------------------------------------------------------------------------

    function splitUrlAndHint(url: string) {
        const index = url.indexOf(URL_HINT_PREFIX);
        if (0 < index) {
            return {
                url: url.substring(0, index),
                hint: url.substring(index + URL_HINT_PREFIX.length)
            };
        } else {
            return { url };
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Store the hint to trigger redirects later on
    //------------------------------------------------------------------------------------------------------------------

    export function storeHint(targetUrl: string, hint: UrlHint) {
        try {
            setRedirectState({
                targetUrl,
                requiredAccount: {
                    id: hint.account.id,
                    alias: hint.account.alias,
                    exampleRole: hint.account.exampleRole
                },
                shouldAutoLogout: true,
                expiresAt: new Date().getTime() + 10 * 60 * 1000
            });
        } catch (exception) {
            console.error(exception);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Extract the details from the hint
    //------------------------------------------------------------------------------------------------------------------

    function parseHint(hint: string): UrlHint {
        try {
            const json = JSON.parse(decodeURIComponent(hint));
            if (!json || "object" !== typeof json || "string" !== typeof json?.account?.id) {
                throw new Error(`account/id is missing`);
            }
            return json as UrlHint;
        } catch (exception) {
            throw new Error(`Invalid URL hint: ${hint} - (${exception})`);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Generate a direct link with an embedded hint
    //------------------------------------------------------------------------------------------------------------------

    export function createDirectLink(url: string, hint: UrlHint) {
        return splitUrlAndHint(url).url + URL_HINT_PREFIX + encodeURIComponent(JSON.stringify(hint));
    }

    //------------------------------------------------------------------------------------------------------------------
    // Generate a redirecting link
    //------------------------------------------------------------------------------------------------------------------

    export function createRedirectLink(url: string, hint: UrlHint) {
        return `${getSettings().redirectUrl}#${encodeURIComponent(JSON.stringify({ ...hint, url }))}`;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Trigger an account switch based on the current redirect state
    //------------------------------------------------------------------------------------------------------------------

    export function initiateAccountSwitch() {
        const account = getRedirectState()?.requiredAccount;
        if (account) {
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
