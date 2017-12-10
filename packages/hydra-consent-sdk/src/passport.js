// @flow
const auth0 = require('./config').auth0
import Auth0Strategy from 'passport-auth0'
import winston from 'winston'

export const initialize = (
  passport: any,
  logger: { debug(...args: any): void } = winston
) => {
  const strategy = new Auth0Strategy(
    {
      domain: auth0.domain,
      clientID: auth0.client.id,
      clientSecret: auth0.client.secret,
      callbackURL: auth0.callback
    },
    (accessToken, refreshToken, extraParams, profile, done) => {
      logger.debug('Fetched profile data from Auth0 OAuth2 provider', profile)
      done(null, {
        ...profile,
        auth_time: Math.floor((new Date()).getTime() / 1000)
      })
    }
  )

  passport.use(strategy)

  passport.serializeUser((user, done) => {
    logger.debug('Serializing user received from Auth0 provider', user)
    return done(null, user)
  })

  passport.deserializeUser((user, done) => {
    logger.debug('Deserializing user received from Auth0 provider', user)
    return done(null, user)
  })
}
