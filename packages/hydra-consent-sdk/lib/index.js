'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initializePassport = exports.initializeMiddleware = exports.retryRefreshToken = exports.refreshToken = exports.Hydra = exports.consentHandler = exports.defaultScopeRenderer = exports.defaultScopeDescriptions = exports.defaultOpenIdConnectHandler = exports.consentValidator = exports.auth0 = undefined;

var _config = require('./config');

var _consent = require('./consent');

var _hydra = require('./hydra');

var _hydra2 = _interopRequireDefault(_hydra);

var _middlewares = require('./middlewares');

var _middlewares2 = _interopRequireDefault(_middlewares);

var _passport = require('./passport');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.auth0 = _config.auth0;
exports.consentValidator = _consent.consentValidator;
exports.defaultOpenIdConnectHandler = _consent.defaultOpenIdConnectHandler;
exports.defaultScopeDescriptions = _consent.defaultScopeDescriptions;
exports.defaultScopeRenderer = _consent.defaultScopeRenderer;
exports.consentHandler = _consent.consentHandler;
exports.Hydra = _hydra2.default;
exports.refreshToken = _hydra.refreshToken;
exports.retryRefreshToken = _hydra.retryRefreshToken;
exports.initializeMiddleware = _middlewares2.default;
exports.initializePassport = _passport.initialize;