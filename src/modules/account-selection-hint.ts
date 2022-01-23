namespace AwsLinkAccountifier {

    //------------------------------------------------------------------------------------------------------------------
    // Highlight the account/roles that should be used for the login
    //------------------------------------------------------------------------------------------------------------------

    export function injectAccountSelectionHint(redirectState: RedirectState) {
        const accountId = redirectState.requiredAccount.id;
        const accountName = getDescriptiveAccountName(redirectState);
        const banner = document.createElement("DIV");
        banner.innerHTML = `
            <div id="accountified-aws-links-banner" style="width:100vw;background-color:yellow;border-bottom:1px solid black;padding:0.75em;font-size:1.4em;margin-bottom:1rem;">
                Please sign in to account <b>${sanitise(accountName)}</b>
                ... or
                <button style="font-size:1.1em;">Cancel this redirect</button>
            </div>
        `;
        const button = document.querySelector("#accountified-aws-links-banner button") as HTMLButtonElement | null;
        if (button) {
            button.addEventListener("click", () => {
                deleteRedirectState();
                highlightAccount(accountId, null);
                banner.style.visibility = "hidden";
            });
        }
        document.body.insertBefore(banner, document.body.firstChild);
        highlightAccount(accountId, "yellow");
    }

    //------------------------------------------------------------------------------------------------------------------
    // Highlight the given account's login options
    //------------------------------------------------------------------------------------------------------------------

    function highlightAccount(accountId: string, colour: string | null) {
        document.querySelectorAll("* * .saml-account-name").forEach(node => {
            const element = node as HTMLElement;
            const innerText = element.innerText;
            if (innerText.endsWith(` ${accountId}`) || innerText.endsWith(` (${accountId})`)) {
                const style = element.parentElement!.parentElement!.style;
                if (colour) {
                    style.backgroundColor = colour;
                } else {
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

    function getDescriptiveAccountName(redirectState: RedirectState) {
        const account = redirectState.requiredAccount;
        if (account.alias) {
            return `${account.alias} (${account.id})`;
        } else if (account.exampleRole) {
            return `${account.id} (e.g. ${account.exampleRole})`;
        } else {
            return account.id;
        }
    }
}
