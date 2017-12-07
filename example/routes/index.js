var express = require('express');
var passport = require('passport');
var consent = require('ory-hydra-auth0-consent-sdk');
var csrf = require('csurf');
var winston = require('winston');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var auth0 = consent.auth0;
var consentValidator= consent.consentValidator;
var consentHandler= consent.consentHandler;
var router = express.Router();

winston.level = process.env.LOG_LEVEL;

var csrfProtection = csrf({ cookie: true });

// The scope we need for Auth0 to fetch profile information
var scope = 'openid profile email';

router.get(
  '/auth/login',
  consentValidator,
  passport.authenticate('auth0', {
    clientID: auth0.client.id,
    domain: auth0.domain,
    redirectUri: auth0.callback,
    responseType: 'code',
    audience: 'https://' + auth0.domain + '/userinfo',
    scope
  }),
  (r, w) => {
    w.redirect('/auth/consent');
  }
);

router.get('/auth/logout', (r, w) => {
  r.logout();
  w.render('logged-out');
});

router.get(
  '/auth/callback',
  passport.authenticate('auth0'),
  (r, w) => {
    w.redirect('/auth/consent');
  }
);

router.use('/auth/consent',
  consentValidator,
  ensureLoggedIn('/auth/login'),
  csrfProtection,
  consentHandler({
    logger: winston
  })
);

module.exports = router;
