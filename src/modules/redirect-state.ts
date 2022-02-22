namespace AwsLinkAccountifier {

    const REDIRECT_STATE_KEY = "redirectState";

    //------------------------------------------------------------------------------------------------------------------
    // The application's state (stored as a cookie)
    //------------------------------------------------------------------------------------------------------------------

    export interface RedirectState {
        targetUrl: string;
        requiredAccount: {
            id: string;
            alias?: string;
            exampleRole?: string;
            excludeExampleRole?: boolean;
        }
        shouldAutoLogout: boolean;
        expiresAt: number
    }

    //------------------------------------------------------------------------------------------------------------------
    // Set the redirect state
    //------------------------------------------------------------------------------------------------------------------

    export function setRedirectState(state: RedirectState) {
        GM_setValue(REDIRECT_STATE_KEY, state);
    }

    //------------------------------------------------------------------------------------------------------------------
    // Delete the redirect state
    //------------------------------------------------------------------------------------------------------------------

    export function deleteRedirectState() {
        GM_deleteValue(REDIRECT_STATE_KEY);
    }

    //------------------------------------------------------------------------------------------------------------------
    // Retrieve the current redirect state
    //------------------------------------------------------------------------------------------------------------------

    export function getRedirectState() {
        const state = GM_getValue(REDIRECT_STATE_KEY, undefined) as RedirectState | undefined;
        if (state) {
            if (new Date().getTime() <= state.expiresAt) {
                return state;
            }
            deleteRedirectState();
        }
        return undefined;
    }
}
