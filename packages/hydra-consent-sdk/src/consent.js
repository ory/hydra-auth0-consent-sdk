// @flow
import { debug, error, warn } from 'winston'
import Hydra, { refreshToken, resolver } from './hydra'
import type { $Request, $Response, NextFunction } from 'express'
import winston from 'winston'

const errorMissingConsentRequest =
  'The consent flow was requested without a consent request ID'

const hydra = new Hydra.OAuth2Api()

export const consentValidator = (
  r: $Request & { session: any, user: any, csrfToken: () => string },
  w: $Response,
  next: NextFunction
) => {
  const {
    query: {
      consent = r.session.consent,
      error: err,
      error_description: errDescription
    }
  } = r

  if (err) {
    error('The consent flow resulted in an error', {
      error: err,
      errorDescription: errDescription
    })
    next(new Error(errDescription))
    return
  } else if (!consent) {
    error(errorMissingConsentRequest)
    next(new Error(errorMissingConsentRequest))
    return
  }

  r.session.consent = consent

  next()
}

export type ConsentRequest = {
  clientId: string,
  expiresAt: string,
  id: string,
  redirectUrl: string,
  requestedScopes: string[]
}

export type Hydrator = (
  {
    consent: string,
    grantedScopes: string[],
    consentRequest: ConsentRequest,
    subject: string
  },
  r: $Request & { session: any, user: any, csrfToken: () => string },
  logger?: Logger
) => Promise<{
  idTokenExtra: Object,
  accessTokenExtra: Object,
  subject: string
}>

export type Logger = {
  debug(...args: any): void,
  error(...args: any): void,
  warn(...args: any): void
}

export const defaultOpenIdConnectHandler: Hydrator = (
  { consent, grantedScopes, subject },
  r,
  { debug } = winston
) => {
  const {
    user: {
      _json: {
        email,
        email_verified,
        picture,
        name,
        nickname,
        created_at,
        updated_at
      } = {}
    } = {}
  } = r

  let data: any = {}
  if (grantedScopes.indexOf('profile') >= 0) {
    debug('Granting profile scope.', { consent })
    data = { picture, name, nickname, created_at, updated_at }
  }

  if (grantedScopes.indexOf('email') >= 0) {
    debug('Granting email scope.', { consent })
    data.email = email
    data.email_verified = email_verified
  }

  return Promise.resolve({
    idTokenExtra: data,
    accessTokenExtra: data,
    subject
  })
}

export const defaultScopeDescriptions = {
  openid: 'Application will authenticate using your current account',
  email: 'Application has access to your email address',
  profile: 'Application can access your basic profile information',
  offline: 'Application does not have to ask for these permissions again'
}

type ScopeRenderer = (
  r: $Request,
  w: $Response,
  context: { user: Object, consentRequest: ConsentRequest, csrfToken: string }
) => void

export const defaultScopeRenderer: ScopeRenderer = (
  r,
  w,
  { user, consentRequest, csrfToken }
) => {
  w.render('oauth2-scope-authorization', {
    user,
    consentRequest,
    csrfToken,
    scopeDescriptions: defaultScopeDescriptions
  })
}

export const consentHandler = (
  {
    scopeRenderer = defaultScopeRenderer,
    sessionHydrator = defaultOpenIdConnectHandler,
    logger: { debug, error, warn } = winston
  }: {
    scopeRenderer: ScopeRenderer,
    sessionHydrator: Hydrator,
    logger: Logger
  } = {}
) => (r: $Request & { session: any, user: any, csrfToken: () => string }, w: $Response, next: NextFunction) => {
  const { session: { consent } } = r
  if (!consent) {
    next(new Error(errorMissingConsentRequest))
    return
  }

  debug('Fetching consent request...', { consent })

  refreshToken()
    .then(
      () =>
        new Promise((resolve, reject) =>
          hydra.getOAuth2ConsentRequest(
            consent,
            resolver(resolve, (err: Error) => {
              error('An error occurred during consent fetching', { consent })
              err.message = `An error ("${err.message}") occurred during consent fetching`
              return reject(err)
            })
          )
        )
    )
    .then((consentRequest: ConsentRequest) => {
      debug('Fetched consent request.', { consent, ...consentRequest })
      const { user: { _json: { email, sub, name } = {} } = {} } = r

      debug('User information decoded.', { consent, email, subject: sub, name })
      const { requestedScopes } = consentRequest

      if (requestedScopes.indexOf('force-consent') > -1) {
        debug('Scope force-consent found, skipping scope authorization', {
          consent,
          requestedScopes
        })
        return Promise.resolve({
          consentRequest,
          grantedScopes: requestedScopes
        })
      }

      if (r.method !== 'POST') {
        const { user: { _json: user = {} } = {} } = r
        if (!r.csrfToken || typeof r.csrfToken !== 'function') {
          error('Csrf middleware is not enabled', { consent })
          return Promise.reject(new Error('Please enable csrf middleware'))
        }

        scopeRenderer(r, w, { user, consentRequest, csrfToken: r.csrfToken() })
        return Promise.resolve({ cancel: true })
      }

      const { grantedScopes, grantAuthorization, denyAuthorization } = r.body

      if (denyAuthorization && denyAuthorization.length > 0) {
        return new Promise((resolve, reject) => {
          hydra.rejectOAuth2ConsentRequest(
            consent,
            { reason: 'The resource owner denied the authorization request' },
            resolver(
              () => {
                debug('Rejected consent response.', { consent })
                r.session.consent = null
                resolve({ cancel: true })
                w.redirect(consentRequest.redirectUrl)
              },
              err => {
                error('An error occurred during consent request rejection', {
                  consent,
                  err
                })
                err.message = `An error ("${err.message}") occurred during consent request rejection`
                reject(err)
              }
            )
          )
        })
      } else if (
        grantAuthorization &&
        grantAuthorization.length > 0 &&
        grantedScopes instanceof Array
      ) {
        debug('Resource owner granted authorization', {
          consent,
          grantedScopes
        })
        return Promise.resolve({ grantedScopes, consentRequest })
      } else {
        error(
          'Authorization was neither granted nor denied, make sure that your form includes grantedScopes, grantAuthorization, denyAuthorization and that grantedScopes is an array'
        )
        return Promise.reject(
          new Error('Authorization was neither granted nor denied')
        )
      }
    })
    .then(
      ({
        cancel,
        grantedScopes,
        consentRequest
      }: {
        cancel?: boolean,
        grantedScopes: string[],
        consentRequest: ConsentRequest
      }) => {
        if (cancel) {
          return Promise.resolve({ cancel })
        }

        const { user: { _json: { sub } = {} } = {} } = r

        return sessionHydrator(
          {
            subject: sub,
            consentRequest,
            consent,
            grantedScopes
          },
          r,
          { debug, warn, error }
        ).then(({ idTokenExtra, accessTokenExtra, subject }) => {
          if (!subject || subject.length === 0) {
            debug(
              'No subject identifier was given, you probably forgot to return the subject in your session hydrator',
              { consent }
            )
            return Promise.reject(
              new Error('Unable to retrieve consent session payload')
            )
          } else if (!idTokenExtra || typeof idTokenExtra !== 'object') {
            debug(
              'No id token payload was given or it is not of type object, you probably forgot to return the subject in your session hydrator',
              { consent }
            )
            return Promise.reject(
              new Error('Unable to retrieve consent session payload')
            )
          } else if (
            !accessTokenExtra ||
            typeof accessTokenExtra !== 'object'
          ) {
            debug(
              'No access token payload was given or it is not of type object, you probably forgot to return the subject in your session hydrator',
              { consent }
            )
            return Promise.reject(
              new Error('Unable to retrieve consent session payload')
            )
          }

          debug('Accepting consent request...', {
            consent,
            subject,
            grantedScopes,
            idTokenExtra,
            accessTokenExtra
          })

          return new Promise((resolve, reject) => {
            hydra.acceptOAuth2ConsentRequest(
              consent,
              {
                subject,
                grantScopes: grantedScopes,
                idTokenExtra,
                accessTokenExtra
              },
              resolver(
                () => {
                  debug('Consent request successfully accepted', { consent })
                  r.session.consent = null
                  w.redirect(consentRequest.redirectUrl)
                  resolve()
                },
                err => {
                  error('An error occurred during consent request acceptance', {
                    consent,
                    err
                  })
                  err.message = `An error ("${err.message}") occurred during consent request acceptance`
                  reject(err)
                }
              )
            )
          })
        })
      }
    )
    .catch(err => {
      error('An error occurred while handling the consent request', {
        consent,
        error: err.message
      })
      next(err)
    })
}
