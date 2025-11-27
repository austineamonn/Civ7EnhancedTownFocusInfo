/**
 * Please, always use ModSettingsManager to save and read settings in your mod.
 * Right now if you try to use **multiple** keys in localStorage, it will break reading
 * from localStorage for **every mod**. This is a workaround to avoid this issue, while
 * keeing a namespace to give each mod its own settings.
 */
const ModSettingsManager = {
    save(key, data) {
        if (localStorage.length > 1) {
            console.warn("[ModSettingsManager] erasing previous storage..", localStorage.length);
            localStorage.clear();
        }  
        const modSettings = JSON.parse(localStorage.getItem("modSettings") || '{}');
        modSettings[key] = data;
        localStorage.setItem("modSettings", JSON.stringify(modSettings));
    },
    read(key) {
        const modSettings = localStorage.getItem("modSettings");
        try {
            if (modSettings) {
                const data = JSON.parse(modSettings || '{}')[key];
                if (data) {
                    return data;
                }
            }
            return null;
        }
        catch (e) {
            console.error(`[ModSettingsManager][${key}] Error loading settings`, e);
        }
        return null;
    }
}

export const ETFI_Settings = new class {
    _data = {
        IsColorful: true
    };

    constructor() {
        const modSettings = ModSettingsManager.read("ETFI_Settings");
        if (modSettings) {
            this._data = modSettings;
        }
    }

    save() {
        console.warn("[ETFI_Settings] saving..", JSON.stringify(this._data));
        ModSettingsManager.save("ETFI_Settings", this._data);
    }

    get IsColorful() {
        return this._data.IsColorful;
    }

    set IsColorful(value) {
        this._data.IsColorful = value;
        this.save();
    }
}