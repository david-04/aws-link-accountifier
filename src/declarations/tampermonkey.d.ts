declare function GM_setValue(name: string, value: any): void;
declare function GM_getValue<T>(name: string, defaultValue: T): T | undefined | null;
declare function GM_deleteValue(name: string): void;
declare function GM_registerMenuCommand(name: string, fn: () => void, accessKey?: any): number;
declare function GM_setClipboard(data: string, info?: string): void;
declare function GM_notification(details: {
    text?: string,
    title?: string,
    image?: string,
    highlight?: boolean,
    silent?: boolean,
    timeout?: number,
    ondone?: () => void,
    onclick?: () => void
}, ondone?: () => void): void;
