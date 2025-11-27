import { O as Options, a as OptionType, d as CategoryData, C as CategoryType } from '/core/ui/options/editors/index.chunk.js';
import { ETFI_Settings } from '../core/settings.js';

// We add a dependency on the Options module to ensure default options are loaded before we add our own
import '/core/ui/options/screen-options.js';

CategoryType["Mods"] = "mods";
CategoryData[CategoryType["Mods"]] = {
    title: "LOC_UI_CONTENT_MGR_SUBTITLE",
    description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

const onOptionColorfulInit = (optionInfo) => {
    optionInfo.currentValue = ETFI_Settings.IsColorful;
}

const onOptionColorfulUpdate = (optionInfo, value) => {
    ETFI_Settings.IsColorful = value;
}

// fix Options initialization
Options.addInitCallback = function(callback) {
    if (this.optionsReInitCallbacks.length && !this.optionsInitCallbacks.length) {
        throw new Error("Options already initialized, cannot add init callback");
    }
    this.optionsInitCallbacks.push(callback);
    this.optionsReInitCallbacks.push(callback);
}

Options.addInitCallback(() => {
    Options.addOption({ 
        category: CategoryType["Mods"], 
        group: 'etfi', 
        type: OptionType.Checkbox, 
        id: "etfi-yields-colorful", 
        initListener: onOptionColorfulInit, 
        updateListener: onOptionColorfulUpdate, 
        label: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL", 
        description: "LOC_MOD_ETFI_YIELDS_OPTION_COLORFUL_DESC" 
    });
});