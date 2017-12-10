'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initialize = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _passportAuth = require('passport-auth0');

var _passportAuth2 = _interopRequireDefault(_passportAuth);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var auth0 = require('./config').auth0;
var initialize = exports.initialize = function initialize(passport) {
  var logger = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _winston2.default;

  var strategy = new _passportAuth2.default({
    domain: auth0.domain,
    clientID: auth0.client.id,
    clientSecret: auth0.client.secret,
    callbackURL: auth0.callback
  }, function (accessToken, refreshToken, extraParams, profile, done) {
    logger.debug('Fetched profile data from Auth0 OAuth2 provider', profile);
    done(null, _extends({}, profile, {
      auth_time: Math.floor(new Date().getTime() / 1000)
    }));
  });

  passport.use(strategy);

  passport.serializeUser(function (user, done) {
    logger.debug('Serializing user received from Auth0 provider', user);
    return done(null, user);
  });

  passport.deserializeUser(function (user, done) {
    logger.debug('Deserializing user received from Auth0 provider', user);
    return done(null, user);
  });
};