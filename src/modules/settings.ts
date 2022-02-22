namespace AwsLinkAccountifier {

    const SETTINGS_KEY = "settings";

    //------------------------------------------------------------------------------------------------------------------
    // The application settings
    //------------------------------------------------------------------------------------------------------------------

    interface Settings {
        readonly accountSwitchUrl: string;
        readonly redirectService: string;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Default settings
    //------------------------------------------------------------------------------------------------------------------

    const DEFAULT_SETTINGS: Settings = {
        accountSwitchUrl: "https://signin.aws.amazon.com/switchrole?account=${ACCOUNT_ID}&roleName=${ROLE_NAME}",
        redirectService: "https://david-04.github.io/aws-link-accountifier/aws-accountified-redirect.html"
    }

    //------------------------------------------------------------------------------------------------------------------
    // Retrieve settings
    //------------------------------------------------------------------------------------------------------------------

    export function getSettings() {
        return { ...DEFAULT_SETTINGS, ...GM_getValue("settings", DEFAULT_SETTINGS) as Settings };
    }

    //------------------------------------------------------------------------------------------------------------------
    // Update the settings
    //------------------------------------------------------------------------------------------------------------------

    export function updateSettings(settings: Partial<Settings>) {
        GM_setValue(SETTINGS_KEY, { ...getSettings(), ...settings });
    }
}
