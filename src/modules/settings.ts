namespace AwsLinkAccountifier {

    const SETTINGS_KEY = "settings";

    //------------------------------------------------------------------------------------------------------------------
    // The application settings
    //------------------------------------------------------------------------------------------------------------------

    interface Settings {
        readonly accountSwitchUrl: string;
        readonly redirectUrl: string;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Default settings
    //------------------------------------------------------------------------------------------------------------------

    const DEFAULT_SETTINGS: Settings = {
        accountSwitchUrl: getPresetAccountSwitchUrl(),
        redirectUrl: getPresetRedirectUrl()
    }

    //------------------------------------------------------------------------------------------------------------------
    // Retrieve settings
    //------------------------------------------------------------------------------------------------------------------

    export function getSettings() {
        return migrateSettings({ ...DEFAULT_SETTINGS, ...GM_getValue("settings", DEFAULT_SETTINGS) as Settings });
    }

    //------------------------------------------------------------------------------------------------------------------
    // Update the settings
    //------------------------------------------------------------------------------------------------------------------

    export function updateSettings(settings: Partial<Settings>) {
        GM_setValue(SETTINGS_KEY, { ...getSettings(), ...settings });
    }

    //------------------------------------------------------------------------------------------------------------------
    // Migrate old settings
    //------------------------------------------------------------------------------------------------------------------

    function migrateSettings(settings: Settings) {
        const data: any = settings;
        if (data && "object" === typeof data) {
            if (data.redirectService) {
                if (!data.redirectUrl) {
                    data.redirectUrl = data.redirectService;
                }
                delete data.redirectService;
            }
        }
        return settings;
    }
}
