'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.consentHandler = exports.defaultScopeRenderer = exports.defaultScopeDescriptions = exports.defaultOpenIdConnectHandler = exports.consentValidator = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _hydra = require('./hydra');

var _hydra2 = _interopRequireDefault(_hydra);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errorMissingConsentRequest = 'The consent flow was requested without a consent request ID';

var hydra = new _hydra2.default.OAuth2Api();

var consentValidator = exports.consentValidator = function consentValidator(r, w, next) {
  var _r$query = r.query,
      _r$query$consent = _r$query.consent,
      consent = _r$query$consent === undefined ? r.session.consent : _r$query$consent,
      err = _r$query.error,
      errDescription = _r$query.error_description;


  if (err) {
    (0, _winston.error)('The consent flow resulted in an error', {
      error: err,
      errorDescription: errDescription
    });
    next(new Error(errDescription));
    return;
  } else if (!consent) {
    (0, _winston.error)(errorMissingConsentRequest);
    next(new Error(errorMissingConsentRequest));
    return;
  }

  r.session.consent = consent;

  next();
};

var defaultOpenIdConnectHandler = exports.defaultOpenIdConnectHandler = function defaultOpenIdConnectHandler(_ref, r) {
  var consent = _ref.consent,
      grantedScopes = _ref.grantedScopes,
      subject = _ref.subject;

  var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _winston2.default,
      debug = _ref2.debug;

  var _r$user = r.user;
  _r$user = _r$user === undefined ? {} : _r$user;
  var _r$user$_json = _r$user._json;
  _r$user$_json = _r$user$_json === undefined ? {} : _r$user$_json;
  var email = _r$user$_json.email,
      email_verified = _r$user$_json.email_verified,
      picture = _r$user$_json.picture,
      name = _r$user$_json.name,
      nickname = _r$user$_json.nickname,
      created_at = _r$user$_json.created_at,
      updated_at = _r$user$_json.updated_at,
      gender = _r$user$_json.gender,
      given_name = _r$user$_json.given_name,
      family_name = _r$user$_json.family_name,
      locale = _r$user$_json.locale;


  var data = {};
  if (grantedScopes.indexOf('openid') >= 0) {
    debug('Granting openid scope.', { consent: consent });
    data = _extends({}, data, { name: name });
  }

  if (grantedScopes.indexOf('profile') >= 0) {
    debug('Granting profile scope.', { consent: consent });
    data = _extends({}, data, {
      picture: picture,
      name: name,
      nickname: nickname,
      created_at: created_at ? Math.floor(new Date(updated_at).getTime() / 1000) : undefined,
      updated_at: updated_at ? Math.floor(new Date(updated_at).getTime() / 1000) : undefined,
      gender: gender,
      given_name: given_name,
      family_name: family_name,
      locale: locale
    });
  }

  if (grantedScopes.indexOf('email') >= 0) {
    debug('Granting email scope.', { consent: consent });
    data = _extends({}, data, { email: email, email_verified: email_verified });
  }

  return Promise.resolve({
    idTokenExtra: data,
    accessTokenExtra: data,
    subject: subject
  });
};

var defaultScopeDescriptions = exports.defaultScopeDescriptions = {
  openid: 'Application will authenticate using your current account',
  email: 'Application has access to your email address',
  profile: 'Application can access your basic profile information',
  offline: 'Application does not have to ask for these permissions again'
};

var defaultScopeRenderer = exports.defaultScopeRenderer = function defaultScopeRenderer(r, w, _ref3) {
  var user = _ref3.user,
      consentRequest = _ref3.consentRequest,
      csrfToken = _ref3.csrfToken;

  w.render('oauth2-scope-authorization', {
    user: user,
    consentRequest: consentRequest,
    csrfToken: csrfToken,
    scopeDescriptions: defaultScopeDescriptions
  });
};

var consentHandler = exports.consentHandler = function consentHandler() {
  var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref4$scopeRenderer = _ref4.scopeRenderer,
      scopeRenderer = _ref4$scopeRenderer === undefined ? defaultScopeRenderer : _ref4$scopeRenderer,
      _ref4$sessionHydrator = _ref4.sessionHydrator,
      sessionHydrator = _ref4$sessionHydrator === undefined ? defaultOpenIdConnectHandler : _ref4$sessionHydrator,
      _ref4$logger = _ref4.logger;

  _ref4$logger = _ref4$logger === undefined ? _winston2.default : _ref4$logger;
  var debug = _ref4$logger.debug,
      error = _ref4$logger.error,
      warn = _ref4$logger.warn;
  return function (r, w, next) {
    var consent = r.session.consent;

    if (!consent) {
      next(new Error(errorMissingConsentRequest));
      return;
    }

    debug('Fetching consent request...', { consent: consent });

    (0, _hydra.refreshToken)().then(function () {
      return new Promise(function (resolve, reject) {
        return hydra.getOAuth2ConsentRequest(consent, (0, _hydra.resolver)(resolve, function (err) {
          error('An error occurred during consent fetching', { consent: consent });
          err.message = 'An error ("' + err.message + '") occurred during consent fetching';
          return reject(err);
        }));
      });
    }).then(function (consentRequest) {
      debug('Fetched consent request.', _extends({ consent: consent }, consentRequest));
      var _r$user2 = r.user;
      _r$user2 = _r$user2 === undefined ? {} : _r$user2;
      var _r$user2$_json = _r$user2._json;
      _r$user2$_json = _r$user2$_json === undefined ? {} : _r$user2$_json;
      var email = _r$user2$_json.email,
          sub = _r$user2$_json.sub,
          name = _r$user2$_json.name;


      debug('User information decoded.', { consent: consent, email: email, subject: sub, name: name });
      var requestedScopes = consentRequest.requestedScopes;


      if (requestedScopes.indexOf('force-consent') > -1) {
        debug('Scope force-consent found, skipping scope authorization', {
          consent: consent,
          requestedScopes: requestedScopes
        });
        return Promise.resolve({
          consentRequest: consentRequest,
          grantedScopes: requestedScopes
        });
      }

      if (r.method !== 'POST') {
        var _r$user3 = r.user;
        _r$user3 = _r$user3 === undefined ? {} : _r$user3;

        var _r$user3$_json = _r$user3._json,
            _user = _r$user3$_json === undefined ? {} : _r$user3$_json;

        if (!r.csrfToken || typeof r.csrfToken !== 'function') {
          error('Csrf middleware is not enabled', { consent: consent });
          return Promise.reject(new Error('Please enable csrf middleware'));
        }

        scopeRenderer(r, w, { user: _user, consentRequest: consentRequest, csrfToken: r.csrfToken() });
        return Promise.resolve({ cancel: true });
      }

      var _r$body = r.body,
          bodyScopes = _r$body.grantedScopes,
          grantAuthorization = _r$body.grantAuthorization,
          denyAuthorization = _r$body.denyAuthorization;

      // If only one scope was granted or none at all, this is an (empty) string and not an array.

      var grantedScopes = bodyScopes;
      if (typeof bodyScopes === 'string') {
        grantedScopes = [bodyScopes];
      } else if (!grantedScopes) {
        grantedScopes = [];
      }

      if (denyAuthorization && denyAuthorization.length > 0) {
        return new Promise(function (resolve, reject) {
          hydra.rejectOAuth2ConsentRequest(consent, { reason: 'The resource owner denied the authorization request' }, (0, _hydra.resolver)(function () {
            debug('Rejected consent response.', { consent: consent });
            r.session.consent = null;
            resolve({ cancel: true });
            w.redirect(consentRequest.redirectUrl);
          }, function (err) {
            error('An error occurred during consent request rejection', {
              consent: consent,
              err: err
            });
            err.message = 'An error ("' + err.message + '") occurred during consent request rejection';
            reject(err);
          }));
        });
      } else if (grantAuthorization && grantAuthorization.length > 0 && grantedScopes instanceof Array) {
        debug('Resource owner granted authorization', {
          consent: consent,
          grantedScopes: grantedScopes
        });
        return Promise.resolve({ grantedScopes: grantedScopes, consentRequest: consentRequest });
      } else {
        error('Authorization was neither granted nor denied, make sure that your form includes grantedScopes, grantAuthorization, denyAuthorization and that grantedScopes is an array');
        return Promise.reject(new Error('Authorization was neither granted nor denied'));
      }
    }).then(function (_ref5) {
      var cancel = _ref5.cancel,
          grantedScopes = _ref5.grantedScopes,
          consentRequest = _ref5.consentRequest;

      if (cancel) {
        return Promise.resolve({ cancel: cancel });
      }

      var _r$user4 = r.user;
      _r$user4 = _r$user4 === undefined ? {} : _r$user4;
      var _r$user4$_json = _r$user4._json;
      _r$user4$_json = _r$user4$_json === undefined ? {} : _r$user4$_json;
      var sub = _r$user4$_json.sub;


      return sessionHydrator({
        subject: sub,
        consentRequest: consentRequest,
        consent: consent,
        grantedScopes: grantedScopes
      }, r, { debug: debug, warn: warn, error: error }).then(function (_ref6) {
        var idTokenExtra = _ref6.idTokenExtra,
            accessTokenExtra = _ref6.accessTokenExtra,
            subject = _ref6.subject;

        if (!subject || subject.length === 0) {
          debug('No subject identifier was given, you probably forgot to return the subject in your session hydrator', { consent: consent });
          return Promise.reject(new Error('Unable to retrieve consent session payload'));
        } else if (!idTokenExtra || (typeof idTokenExtra === 'undefined' ? 'undefined' : _typeof(idTokenExtra)) !== 'object') {
          debug('No id token payload was given or it is not of type object, you probably forgot to return the subject in your session hydrator', { consent: consent });
          return Promise.reject(new Error('Unable to retrieve consent session payload'));
        } else if (!accessTokenExtra || (typeof accessTokenExtra === 'undefined' ? 'undefined' : _typeof(accessTokenExtra)) !== 'object') {
          debug('No access token payload was given or it is not of type object, you probably forgot to return the subject in your session hydrator', { consent: consent });
          return Promise.reject(new Error('Unable to retrieve consent session payload'));
        }

        debug('Accepting consent request...', {
          consent: consent,
          subject: subject,
          grantedScopes: grantedScopes,
          idTokenExtra: idTokenExtra,
          accessTokenExtra: accessTokenExtra
        });

        return new Promise(function (resolve, reject) {
          hydra.acceptOAuth2ConsentRequest(consent, {
            subject: subject,
            grantScopes: grantedScopes,
            idTokenExtra: idTokenExtra,
            accessTokenExtra: accessTokenExtra
          }, (0, _hydra.resolver)(function () {
            debug('Consent request successfully accepted', { consent: consent });
            r.session.consent = null;
            w.redirect(consentRequest.redirectUrl);
            resolve();
          }, function (err) {
            error('An error occurred during consent request acceptance', {
              consent: consent,
              err: err
            });
            err.message = 'An error ("' + err.message + '") occurred during consent request acceptance';
            reject(err);
          }));
        });
      });
    }).catch(function (err) {
      error('An error occurred while handling the consent request', {
        consent: consent,
        error: err.message
      });
      next(err);
    });
  };
};