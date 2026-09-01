import jsdoc from "eslint-plugin-jsdoc";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import globals from "globals";

export default [
  {
    ignores: [".study-notes/**", "node_modules/**"],
  },
  {
    files: ["js/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      jsdoc,
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      ...jsdoc.configs["flat/recommended"].rules,
      "array-callback-return": "error",
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-alert": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "no-var": "error",
      "prefer-const": "error",
      "jsdoc/no-defaults": "off",
      "jsdoc/no-undefined-types": "off",
      "jsdoc/tag-lines": "off",
    },
  },
];
