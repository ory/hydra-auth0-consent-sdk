'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.retryRefreshToken = exports.refreshToken = exports.resolver = undefined;

var _oryHydraSdk = require('ory-hydra-sdk');

var _oryHydraSdk2 = _interopRequireDefault(_oryHydraSdk);

var _simpleOauth = require('simple-oauth2');

var _simpleOauth2 = _interopRequireDefault(_simpleOauth);

var _querystring = require('querystring');

var _winston = require('winston');

var _promiseRetry = require('promise-retry');

var _promiseRetry2 = _interopRequireDefault(_promiseRetry);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var scope = 'hydra.consent';


var oauth2 = _simpleOauth2.default.create({
  client: {
    id: (0, _querystring.escape)(process.env.HYDRA_CLIENT_ID || ''),
    secret: (0, _querystring.escape)(process.env.HYDRA_CLIENT_SECRET || '')
  },
  auth: {
    tokenHost: process.env.HYDRA_URL,
    authorizePath: '/oauth2/auth',
    tokenPath: '/oauth2/token'
  },
  options: {
    useBodyAuth: false,
    useBasicAuthorizationHeader: true
  }
});

_oryHydraSdk2.default.ApiClient.instance.basePath = process.env.HYDRA_URL;

var resolver = exports.resolver = function resolver(resolve, reject) {
  return function (error, data, response) {
    if (error) {
      return reject(error);
    } else if (response.statusCode < 200 || response.statusCode >= 400) {
      return reject(new Error('Consent endpoint gave status code ' + response.statusCode + ', but status code 200 was expected.'));
    }

    resolve(data);
  };
};

var refreshToken = exports.refreshToken = function refreshToken() {
  return oauth2.clientCredentials.getToken({ scope: scope }).then(function (result) {
    var token = oauth2.accessToken.create(result);
    var hydraClient = _oryHydraSdk2.default.ApiClient.instance;
    hydraClient.authentications.oauth2.accessToken = token.token.access_token;
    return Promise.resolve(token);
  });
};

var retryRefreshToken = exports.retryRefreshToken = function retryRefreshToken() {
  return (0, _promiseRetry2.default)(function (r, attempt) {
    (0, _winston.debug)('Attempt', attempt, 'to fetch initial ORY Hydra access token');

    return refreshToken().then().catch(function (err) {
      (0, _winston.debug)('Attempt', attempt, 'failed because:', err.message);
      return r(err);
    });
  }, { maxTimeout: 3000, retries: 5, randomize: true });
};

exports.default = _oryHydraSdk2.default;