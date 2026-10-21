const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the repository (including packages/core)
config.watchFolders = [workspaceRoot];

// Let Metro resolve node_modules in both mobile and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Map @ourhome/core directly to the package source, and alias query-string shim
config.resolver.extraNodeModules = {
  '@ourhome/core': path.resolve(workspaceRoot, 'packages/core'),
  'query-string': path.resolve(projectRoot, 'query-string-shim.js'),
};

module.exports = config;
