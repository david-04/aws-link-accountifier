namespace AwsLinkAccountifier {

    export function getPresetAccountSwitchUrl() {
        return "https://signin.aws.amazon.com/switchrole?account=${ACCOUNT_ID}&roleName=${ROLE_NAME}";
    }

    export function getPresetRedirectUrl() {
        return "https://david-04.github.io/aws-link-accountifier/aws-accountified-redirect.html";
    }
}
