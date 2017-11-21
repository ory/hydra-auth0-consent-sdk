// @flow
import Auth0Strategy from 'passport-auth0'
import { AuthenticationClient } from 'auth0'
import request from 'superagent'
import { Strategy as LocalStrategy } from 'passport-local'
import Profile from 'passport-auth0/lib/Profile'
import type { Auth0Config, Logger as LoggerType } from "./types";
import Logger from './logger'
import type {Passport} from 'passport'

export default class PassportHelper {
  client: AuthenticationClient
  logger: LoggerType = Logger
  config: Auth0Config

  constructor(config: Auth0Config, logger?: Logger = Logger) {
    this.client = new AuthenticationClient({
      domain: config.domain,
      clientId: config.client.id,
      clientSecret: config.client.secret
    })
    this.config = config
    this.logger = logger
  }

  createSocialLoginPassportStrategy = () => {
    const { debug } = this.logger
    const config = this.config

    return new Auth0Strategy(
      {
        domain: config.domain,
        clientID: config.client.id,
        clientSecret: config.client.secret,
        callbackURL: config.callback
      },
      (accessToken, refreshToken, extraParams, profile, done) => {
        debug('Fetched profile data from Auth0 OAuth2 provider', profile)
        done(null, profile)
      }
    )
  }

  createUsernamePasswordPassportStrategy = () => {
    const { debug, error } = this.logger
    const config = this.config

    return new LocalStrategy((username, password, done) => {
      debug('Trying to log in user...', { username })

      request
        .post(`https://${config.domain}/oauth/token`)
        .send({
          grant_type: 'password',
          username,
          password,
          client_id: config.client.id,
          client_secret: config.client.secret
        })
        .then(response => {
          debug('Login successful, fetching data from userinfo endpoint')
          return request
            .get(`https://${config.domain}/userinfo`)
            .set({ Authorization: `bearer ${response.body.access_token}` })
            .then(response => {
              debug('Got answer from tokeninfo endpoint', response.body)

              try {
                const json = response.body
                const profile = new Profile(json, JSON.stringify(response.body))

                debug('User logged in successfully.', { username, user: profile })
                done(null, profile)
              } catch (e) {
                error('Unable to parse user profile data', {
                  error: error.message,
                  message: error.toString()
                })
                done(e)
              }
            })
        })
        .catch(err => {
          error('Unable to sign user in', {
            username,
            error: err.response.body,
            status: err.status
          })
          switch (err.status) {
            case 403:
              done(null, null, { message: 'Username and password do not match.' })
              break
            default:
              done(err, null)
          }
        })
    })
  }

  registerPassportStrategies = (passport: Passport) => {
    const { debug } = this.logger

    passport.use(this.createSocialLoginPassportStrategy())
    passport.use(this.createUsernamePasswordPassportStrategy())

    passport.serializeUser((user, done) => {
      debug('Serializing user received from Auth0 provider', user)
      return done(null, user)
    })
    passport.deserializeUser((user, done) => {
      debug('Deserializing user received from Auth0 provider', user)
      return done(null, user)
    })
  }
}
