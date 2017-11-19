// @flow

import HydraSDK from 'ory-hydra-sdk'
import OAuth2 from 'simple-oauth2'
import type { OAuth2 as OAuth2Type } from 'simple-oauth2'
import { escape } from 'querystring'
import retry from 'promise-retry'

type Config = {
  client: {
    id: string,
    secret: string
  },
  url: string
}

const resolver = (
  resolve: (data: any) => void,
  reject: Error => void
) => (error: Error, data: any, response: any) => {
  if (error) {
    return reject(error)
  } else if (response.statusCode < 200 || response.statusCode >= 400) {
    return reject(
      new Error(
        'Consent endpoint gave status code ' +
        response.statusCode +
        ', but status code 200 was expected.'
      )
    )
  }

  resolve(data)
}

export default class ConsentHelper {
  client: OAuth2Type
  scope = 'hydra.consent hydra.consent.*'

  /**
   * Creates a new HydraConsentHelper.
   *
   * @param {{ client: { id: string, secret: string }, url: string }} config - An object containing the client id and secret as well as the location of ORY Hydra.
   */
  constructor(config: Config) {
    this.client = OAuth2.create({
      client: {
        id: escape(config.client.id),
        secret: escape(config.client.secret)
      },
      auth: {
        tokenHost: config.url,
        authorizePath: '/oauth2/auth',
        tokenPath: '/oauth2/token'
      },
      options: {
        useBodyAuth: false,
        useBasicAuthorizationHeader: true
      }
    })

    HydraSDK.ApiClient.instance.basePath = config.url
  }

  /**
   * Validates the configuration of this instance by trying to fetch an access token with exponential backoff.
   * If successful, the promise is resolved with an empty payload. Otherwise it is rejected with an error.
   *
   * @returns {Promise}
   */
  validateConfiguration = () => {
    const { debug, error } = this.logger
    return retry(
      (r, attempt) => {
        debug('Attempt', attempt, 'to fetch initial ORY HydraSDK access token')

        return this.token()
          .then()
          .catch(err => {
            debug('Attempt', attempt, 'failed because:', err.message)
            return r(err)
          })
      },
      { maxTimeout: 3000, retries: 5, randomize: true }
    )
      .then(() => {
        debug('Successfully fetched initial ORY HydraSDK access token')
        return Promise.resolve()
      })
      .catch(err => {
        error('Unable to fetch refresh token from HydraSDK because:', err.message)
        return Promise.reject(err)
      })
  }

  /**
   * Fetches an access token and refreshes it when expired. Returns Promise.resolve(token) where token
   * is documented here: https://github.com/lelylan/simple-oauth2#access-token-object
   *
   * Otherwise returns Promise.reject(err) where err is of type Error.
   *
   * @returns {Promise.<Token>}
   */
  token = () =>
    this.oauth2.clientCredentials.getToken({ scope: this.scope }).then(result => {
      const token = oauth2.accessToken.create(result)
      HydraSDK.ApiClient.instance.authentications.oauth2.accessToken = token.token.access_token
      return Promise.resolve(token)
    })

  /**
   * Rejects a consent request. Typically happens when the user hits "Cancel" or when the consent app decides
   * that this request should not be accepted.
   *
   * @param {string} consent - The consent request ID given by ORY Hydra.
   * @param {string} reason - A human readable reason of why the consent request was rejected.
   * @return {Promise} - Returns a promise rejection if an error occurred, otherwise a promise resolve with no arguments.
   */
  rejectOAuth2ConsentRequest = (consent: string, reason: string) => new Promise((resolve, reject) => {
    const hydra = new HydraSDK.OAuth2Api()
    hydra.rejectOAuth2ConsentRequest(
      consent,
      { reason },
      resolver(resolve, reject)
    )
  })

  /**
   * Fetches the consent request given it's ID. The payload is documented here: https://hydra13.docs.apiary.io/#reference/oauth2/oauth2consentrequestsid/receive-consent-request-information
   *
   * @param {string} consent - The consent request ID given by ORY Hydra.
   * @return {Promise} - Returns a promise rejection if an error occurred, otherwise a promise resolve with the parsed body.
   */
  getOAuth2ConsentRequest = (consent) => new Promise((resolve, reject) => {
    const hydra = new HydraSDK.OAuth2Api()
    hydra.getOAuth2ConsentRequest(
      consent,
      resolver(resolve, reject)
    )
  })

  /**
   *
   * @param {string} consent - The consent request ID given by ORY Hydra.
   * @param {Object} payload - For information on this object please refer to https://hydra13.docs.apiary.io/#reference/oauth2/oauth2consentrequestsidaccept/accept-a-consent-request
   * @return {Promise} - Returns a promise rejection if an error occurred, otherwise a promise resolve with no arguments.
   */
  acceptOAuth2ConsentRequest = (consent, payload: {
    subject: string,
    grantScopes: string[],
    idTokenExtra: Object,
    accessTokenExtra: Object
  }) => new Promise((resolve, reject) => {
    const hydra = new HydraSDK.OAuth2Api()
    hydra.acceptOAuth2ConsentRequest(
      consent,
      payload,
      resolver(resolve, reject)
    )
  })
}
