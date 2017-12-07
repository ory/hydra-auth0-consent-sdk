var express = require('express');
var logger = require('morgan');
var routes = require('./routes/index');
var consent = require('ory-hydra-auth0-consent-sdk');
var path = require('path');
var passport = require('passport');
var winston = require('winston');

var initializeMiddleware = consent.initializeMiddleware;
var initializePassport = consent.initializePassport;
winston.level = process.env.LOG_LEVEL || 'info';
initializePassport(passport, winston)

var app = express();

app.locals.pageTitle = 'ORY Hydra Authentication'
app.locals.redirectUrl = process.env.DEFAULT_REDIRECT_URL

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'))

// Initialize hydra-consent-sdk middlewares
initializeMiddleware(app, passport)

app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      code: err.status || 500,
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    code: err.status || 500,
    message: err.message
  });
});


module.exports = app;
