const { merge } = require('webpack-merge')
const path = require('path')

const config = require('./webpack.config')

module.exports = merge(config, {
  mode: 'development',

  devtool: 'inline-source-map',

  devServer: {
    writeToDisk: true,
    port: 8080,
    open: false,
    hot: true
  },

  output: {
    path: path.join(__dirname, 'InfiniteCircularGallery')
  }
})
