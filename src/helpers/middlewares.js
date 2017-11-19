// @flow
import cookieParser from 'cookie-parser'
import session from 'express-session'
import flash from 'connect-flash'
import type { Router } from 'express'
import type { Passport } from 'passport'

/**
 * A helper that registers necessary express middlewares for getting passport to work. This helper registers:
 * 1. cookie-parser: Required for parsing cookie contents.
 * 2. express-sessions: Required for storing session information, enabled with secure defaults.
 * 3. connect-flash: Required for transporting passport errors and successes across requests.
 * 4. passport.initialize: Initializes the passport middleware.
 * 4. passport.initialize: Initializes passport sesion handling.
 *
 * @param {Router} router - The express router, typically the value received from running express().
 * @param {string} cookieSecret - A secure cookie secret which is used to encrypt the cookie's contents.
 * @param {Passport} passport - The passport instance.
 */
export default (router: Router, cookieSecret: string, passport: Passport) =>
  [
    () => cookieParser(),
    () =>
      session({
        secret: cookieSecret,
        resave: true,
        saveUninitialized: true,
        httpOnly: true
      }),
    () => flash(),
    () => passport.initialize(),
    () => passport.session(),
  ].forEach(mw => router.use(mw()))
