const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Native builds generate CMake metadata under node_modules. Metro should not
// walk those folders on Windows; they are not JavaScript sources.
config.resolver.blockList = [/[/\\]\.cxx([/\\]|$)/];

module.exports = config;
