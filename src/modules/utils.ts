namespace AwsLinkAccountifier {

    //------------------------------------------------------------------------------------------------------------------
    // Check if the current URL is for the AWS console
    //------------------------------------------------------------------------------------------------------------------

    export function isAwsUrl() {
        return !!window.location.host.toLowerCase().endsWith(".aws.amazon.com");
    }

    //------------------------------------------------------------------------------------------------------------------
    // Get a string property from an object
    //------------------------------------------------------------------------------------------------------------------

    export function getStringProperty(object: any, key: string) {
        if (object && "object" === typeof object && "string" === typeof (object[key])) {
            return object[key] as string;
        } else {
            return undefined;
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Get a cookie
    //------------------------------------------------------------------------------------------------------------------

    export function getCookie(cName: string) {
        const name = cName + "=";
        const cDecoded = decodeURIComponent(document.cookie);
        const array = cDecoded.split('; ');
        let result;
        array.forEach(value => {
            if (value.indexOf(name) === 0) result = value.substring(name.length);
        })
        return result;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Set a cookie
    //------------------------------------------------------------------------------------------------------------------

    export function setCookie(name: string, value: string, domain: string, path: string, ttlMs: number) {
        var expires = new Date(new Date().getTime() + ttlMs);
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};domain=${domain};path=${path}`;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Sanitise HTML content
    //------------------------------------------------------------------------------------------------------------------

    export function sanitise(text: string) {
        return text.replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
    }
}