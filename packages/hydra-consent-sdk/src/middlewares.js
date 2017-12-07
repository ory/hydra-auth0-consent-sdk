import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import session from 'express-session'
import uuid from 'uuid'
import flash from 'connect-flash'

export default (app, passport) =>
  [
    () => bodyParser.json(),
    () => bodyParser.urlencoded({ extended: true }),
    () => cookieParser(),
    () =>
      session({
        secret: process.env.COOKIE_SECRET || uuid.v4(),
        resave: true,
        saveUninitialized: true,
        httpOnly: true
      }),
    () => flash(),
    () => passport.initialize(),
    () => passport.session()
  ].forEach(mw => app.use(mw()))
