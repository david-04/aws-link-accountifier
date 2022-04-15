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
        return migrateSettings({ ...DEFAULT_SETTINGS, ...(GM_getValue("settings", DEFAULT_SETTINGS) ?? {}) });
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

    function migrateSettings(settings: Settings & { redirectService?: string }) {
        const redirectUrl = settings.redirectUrl ?? settings.redirectService;
        delete settings.redirectService;
        if ("string" === typeof redirectUrl) {
            return { ...settings, redirectUrl };
        } else {
            return settings;
        }
    }
}
