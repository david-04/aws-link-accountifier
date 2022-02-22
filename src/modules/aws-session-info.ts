namespace AwsLinkAccountifier {

    export const AWS_USER_INFO_COOKIE_NAME = "aws-userInfo";

    //------------------------------------------------------------------------------------------------------------------
    // Details about an AWS session
    //------------------------------------------------------------------------------------------------------------------

    export class AwsSession {

        //--------------------------------------------------------------------------------------------------------------
        // Initialisation
        //--------------------------------------------------------------------------------------------------------------

        public constructor(
            public readonly accountId: string,
            public readonly accountAlias?: string,
            public readonly role?: string
        ) { }

        //--------------------------------------------------------------------------------------------------------------
        // Create a URL hint for this session's account
        //--------------------------------------------------------------------------------------------------------------

        public toUrlHint(): UrlHint {
            const hint: UrlHint = { account: { id: this.accountId } };
            if (this.accountAlias && this.accountAlias !== this.accountId) {
                hint.account.alias = this.accountAlias;
            }
            if (this.role) {
                hint.account.exampleRole = this.role;
            }
            return hint;
        }

        //--------------------------------------------------------------------------------------------------------------
        // Verify if this session's account matches the redirect requirements
        //--------------------------------------------------------------------------------------------------------------

        public matchesAccount(redirectState: RedirectState) {
            const requiredAccount = redirectState.requiredAccount;
            if (requiredAccount.id !== this.accountId) {
                return false;
            } else if (requiredAccount.excludeExampleRole
                && requiredAccount.exampleRole
                && this.role === requiredAccount.exampleRole) {
                return false;
            } else {
                return true;
            }
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Retrieve information about the current session
    //------------------------------------------------------------------------------------------------------------------

    export function getCurrentAwsSession(): AwsSession | undefined {
        const stringified = getCookie(AWS_USER_INFO_COOKIE_NAME);
        if (stringified) {
            const userInfo = JSON.parse(stringified);
            const accountId = extractPropertyFragment(userInfo, "arn", /^arn:aws:sts:[^:]*:/, /:.*/);
            if (accountId) {
                return new AwsSession(
                    accountId,
                    extractPropertyFragment(userInfo, "alias", /^/, /$/),
                    extractPropertyFragment(userInfo, "arn", /^arn:aws:sts:[^:]*:[^:]*:assumed-role\//, /\/.*/)
                )
            }
        }
        return undefined;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Extract a piece of information from an object property
    //------------------------------------------------------------------------------------------------------------------

    function extractPropertyFragment(object: any, propertyName: string, matchAndRemove: RegExp, remove: RegExp) {
        const value = getStringProperty(object, propertyName);
        if (value && value.match(matchAndRemove)) {
            return value.replace(matchAndRemove, "").replace(remove, "");
        }
        return undefined;
    }
}
