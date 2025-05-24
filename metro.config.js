const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files
config.resolver.sourceExts.push('cjs');

// This is the key fix for "Component auth has not been registered yet" error
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
