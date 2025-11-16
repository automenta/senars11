
// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";


export default [{
  languageOptions: { globals: globals.browser },
  settings: {
    react: {
      version: "detect",
    },
  }
}, pluginJs.configs.recommended, pluginReactConfig, ...storybook.configs["flat/recommended"]];
