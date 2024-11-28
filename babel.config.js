// Global config for babel. Required in babel version 7
// babel.config.js
export default function (api) {
    api.cache(true);
    return {
        presets: ["@babel/preset-env"],
        sourceMaps: true,
        env: {
            test: { // jest automatically sets NODE_ENV to this env.
                plugins: [] // Add any plugins you want for the test environment e.g. "@babel/plugin-proposal-class-properties"
            },
            development: {
                plugins: [] // Add any plugins you want for the development environment
            },
            production: {
                plugins: ['transform-remove-console'], // Removes all console.log in production
            },
        },
    };
};
