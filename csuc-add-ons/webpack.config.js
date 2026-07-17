const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const mf = require('@angular-architects/module-federation/webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const { resolveActiveAddon } = require('./addon-profile-utils');
const share = mf.share;

const activeAddon = resolveActiveAddon();
const isAddonBuild = process.env.BUILD_ADDON_MAPPING === 'true';
const remoteName = isAddonBuild ? activeAddon.remoteName : 'customModule';
const exposedModule = isAddonBuild ? activeAddon.exposedModule : './custom-module';

const sharedMappings = new mf.SharedMappings();
sharedMappings.register(
  path.join(__dirname, 'tsconfig.json'),
  [/* mapped paths to share */]
);

module.exports = {
  context: path.resolve(__dirname),
  output: {
    uniqueName: remoteName,
    publicPath: 'auto'
  },
  optimization: {
    minimize: true,
    runtimeChunk: false
  },
  resolve: {
    alias: {
      ...sharedMappings.getAliases()
    }
  },
  experiments: {
    outputModule: true
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets',
          to: 'assets',
          noErrorOnMissing: true,
          globOptions: {
            ignore: [
              '**/.gitkeep',
              '**/.*'
            ]
          }
        }
      ]
    }),
    new ModuleFederationPlugin({
      library: { type: 'module' },
      name: remoteName,
      filename: 'remoteEntry.js',
      exposes: {
        [exposedModule]: './src/bootstrap.ts'
      },
      shared: share({
        '@angular/core': { requiredVersion: 'auto' },
        '@angular/common': { requiredVersion: 'auto' },
        '@angular/router': { requiredVersion: 'auto' },
        'rxjs': { requiredVersion: 'auto' },
        '@angular/common/http': { requiredVersion: 'auto' },
        '@angular/platform-browser': { requiredVersion: 'auto' },
        '@ngx-translate/core': { singleton: true },
        '@ngrx/store': { singleton: true },
        ...sharedMappings.getDescriptors()
      })
    }),
    sharedMappings.getPlugin()
  ]
};
