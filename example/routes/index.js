var express = require('express');
var passport = require('passport');
var consent = require('ory-hydra-auth0-consent-sdk');
var csrf = require('csurf');
var winston = require('winston');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var router = express.Router();

var auth0 = consent.auth0; // Loads the Auth0 config from environment variables such as AUTH0_CLIENT_ID
var consentValidator = consent.consentValidator;
var consentHandler = consent.consentHandler;

winston.level = process.env.LOG_LEVEL || 'info';

// CSRF protection is important when dealing with consent
var csrfProtection = csrf({ cookie: true });

// The scope we need for Auth0 to fetch profile information
var scope = 'openid profile email';

router.get(
  '/auth/login',

  // This redirects the user to the Auth0 hosted page.
  passport.authenticate('auth0', {
    clientID: auth0.client.id,
    domain: auth0.domain,
    redirectUri: auth0.callback,
    responseType: 'code',
    audience: 'https://' + auth0.domain + '/userinfo',
    scope
  }),

  // In our case, we want to redirect the user to the consent endpoint.
  (r, w) => {
    w.redirect('/auth/consent');
  }
);

// A simple handler for logging users out.
router.get('/auth/logout', (r, w) => {
  r.logout();
  w.render('logged-out');
});

// This is where Auth0 will redirect the user back to once the user signed in.
router.get(
  '/auth/callback',
  passport.authenticate('auth0'),
  (r, w) => {
    w.redirect('/auth/consent');
  }
);

// This is our consent handler. Please note that we need to handle POST and GET here, which is why `router.use` is
// used instead of e.g. `router.get`.
router.use('/auth/consent',
  // First we need to make sure that the consent request is valid. Additionally, this stores the consent request id
  // in the user's session.
  consentValidator,

  // This endpoint must not be accessible without being signed in!
  ensureLoggedIn('/auth/login'),

  // We need csrf protection here
  csrfProtection,

  // Finally, this is the consent handler.
  consentHandler({
    logger: winston
    // You can define a custom renderer for rending the consent screen here
    // scopeRenderer
    //
    // And define what values must be included in the OAuth 2.0 access token and the ID token.
    // sessionHydrator
    //
    // For exemplary implementations of these two values check out defaultScopeRenderer and defaultOpenIdConnectHandler
    // in packages/hydra-consent-sdk/src/consent.js
  })
);

module.exports = router;
