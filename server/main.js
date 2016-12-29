const feathers = require('feathers');
const rest = require('feathers-rest');
const bodyParser = require('body-parser');
const hooks = require('feathers-hooks');

const express = require('express');
const debug = require('debug')('app:server');
const webpack = require('webpack');
const webpackConfig = require('../config/webpack.config');
const project = require('../config/project.config');
const compress = require('compression');

const services = require('./services/index.js');
const sendmail = require('./mailservice/mail.js');

// create feathers app
const app = feathers();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.configure(rest());
app.configure(hooks());
app.configure(services);

sendmail('ilmomasiina@gmail.com');
// This rewrites all routes requests to the root /index.html file
// (ignoring file requests). If you want to implement universal
// rendering, you'll want to remove this middleware.
app.use(require('connect-history-api-fallback')());

// Apply gzip compression
app.use(compress());

// ------------------------------------
// Apply Webpack HMR Middleware
// ------------------------------------

if (project.env === 'development') {
  const compiler = webpack(webpackConfig);

  debug('Enabling webpack dev and HMR middleware');

  app.use(require('webpack-dev-middleware')(compiler, { // eslint-disable-line
    publicPath: webpackConfig.output.publicPath,
    contentBase: project.paths.client(),
    hot: true,
    quiet: project.compiler_quiet,
    noInfo: project.compiler_quiet,
    lazy: false,
    stats: project.compiler_stats,
  }));

  app.use(require('webpack-hot-middleware')(compiler)); // eslint-disable-line

  // Serve static assets from ~/public since Webpack is unaware of
  // these files. This middleware doesn't need to be enabled outside
  // of development since this directory will be copied into ~/dist
  // when the application is compiled.
  app.use(express.static(project.paths.public()));
} else {
  debug(
    'Server is being run outside of live development mode, meaning it will ' +
    'only serve the compiled application bundle in ~/dist. Generally you ' +
    'do not need an application server for this and can instead use a web ' +
    'server such as nginx to serve your static files. See the "deployment" ' +
    'section in the README for more information on deployment strategies.' // eslint-disable-line
  );

  // Serving ~/dist by default. Ideally these files should be served by
  // the web server and not the app server, but this helps to demo the
  // server in production.
  app.use(express.static(project.paths.dist()));
}

module.exports = app;
