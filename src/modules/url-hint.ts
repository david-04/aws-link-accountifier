namespace AwsLinkAccountifier {

    export const URL_HINT_PREFIX = "#aws-link-accountifier=";

    //------------------------------------------------------------------------------------------------------------------
    // Data structure of the stringified URL hint
    //------------------------------------------------------------------------------------------------------------------

    export interface UrlHint {
        account: {
            id: string;
            alias?: string;
            exampleRole?: string
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
    // Store the hint in a cookie to trigger redirects later on
    //------------------------------------------------------------------------------------------------------------------

    function storeHint(targetUrl: string, hint: UrlHint) {
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
                throw `Invalid URL hint: ${hint} (account/id is missing)`;
            }
            return json as UrlHint;
        } catch (exception) {
            throw `Invalid URL hint: ${hint} (${exception})`;
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Append the given hint to the given URL
    //------------------------------------------------------------------------------------------------------------------

    export function getUrlWithAppendedHint(url: string, hint: UrlHint) {
        return splitUrlAndHint(url).url + URL_HINT_PREFIX + encodeURIComponent(JSON.stringify(hint));
    }
}
