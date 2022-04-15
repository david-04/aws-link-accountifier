namespace AwsLinkAccountifier {

    //------------------------------------------------------------------------------------------------------------------
    // Highlight the account/roles that should be used for the login
    //------------------------------------------------------------------------------------------------------------------

    export function injectAccountSelectionHint(redirectState: RedirectState) {
        const accountId = redirectState.requiredAccount.id;
        const accountName = getDescriptiveAccountName(redirectState);
        const banner = document.createElement("DIV");
        banner.innerHTML = `Please sign in to account <b>${sanitize(accountName)}</b>`;

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

    //------------------------------------------------------------------------------------------------------------------
    // Highlight the given account's login options
    //------------------------------------------------------------------------------------------------------------------

    function highlightAccount(accountId: string, color: string | null) {
        document.querySelectorAll("* * .saml-account-name").forEach(node => {
            const element = node as HTMLElement;
            const innerText = element.innerText;
            if (innerText.endsWith(` ${accountId}`) || innerText.endsWith(` (${accountId})`)) {
                const style = element.parentElement?.parentElement?.style;
                if (style) {
                    if (color) {
                        style.backgroundColor = color;
                    } else {
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
