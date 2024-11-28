export default {
    // Mock timers configuration
    fakeTimers: {
        enableGlobally: true,
        timerLimit: 5000
    },

    rootDir: "../",

    moduleNameMapper: {
        "^@wlvyr/common$": "<rootDir>/src/common/index.js",
        "^@wlvyr/common/(.*)$": "<rootDir>/src/$1",
        '^@/(.*)$': '<rootDir>/$1',
    },

    testMatch: [
        "**/?(*.)+(spec|test).js?(x)"
    ],
    transformIgnorePatterns: [
        "/node_modules/"
    ],

    setupFilesAfterEnv: ['<rootDir>/config/jest-setup.js'],

    collectCoverage: false,

    collectCoverageFrom: [
        '**/*.{js,jsx,ts,tsx}',
        '!**/*.test.{js,jsx,ts,tsx}',
        '!**/coverage/**',
        '!**/node_modules/**',
        '!**/babel.config.js',
        '!**/jest.setup.js',
        '!**/*.d.ts' // Exclude TypeScript declaration files
    ],

    testPathIgnorePatterns: [
        "reference($|/)",       // Match "reference" files or  directories
        "^\\.",                 // Match dotfiles and dotdirectories
        "node_modules/"         // Ignore the entire node_modules directory
    ],

    // can comment out if cache is not going to be used.
    cacheDirectory: '<rootDir>/config/.jest-cache'
}