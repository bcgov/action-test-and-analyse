import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        },
        languageOptions: {
            globals: {
                process: "readonly",
                console: "readonly",
                module: "readonly",
                require: "readonly"
            }
        }
    }
];
