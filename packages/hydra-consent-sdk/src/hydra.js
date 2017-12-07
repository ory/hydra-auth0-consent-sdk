// @flow
import Hydra from 'ory-hydra-sdk'
import OAuth2 from 'simple-oauth2'
import { escape } from 'querystring'
import { error, debug } from 'winston'
import retry from 'promise-retry'

const scope = 'hydra.consent'

const oauth2 = OAuth2.create({
  client: {
    id: escape(process.env.HYDRA_CLIENT_ID || ''),
    secret: escape(process.env.HYDRA_CLIENT_SECRET || '')
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
})

Hydra.ApiClient.instance.basePath = process.env.HYDRA_URL

export const resolver = (
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

export const refreshToken = () =>
  oauth2.clientCredentials.getToken({ scope }).then(result => {
    const token = oauth2.accessToken.create(result)
    const hydraClient = Hydra.ApiClient.instance
    hydraClient.authentications.oauth2.accessToken = token.token.access_token
    return Promise.resolve(token)
  })

export const retryRefreshToken = () => retry(
  (r, attempt) => {
    debug('Attempt', attempt, 'to fetch initial ORY Hydra access token')

    return refreshToken()
      .then()
      .catch(err => {
        debug('Attempt', attempt, 'failed because:', err.message)
        return r(err)
      })
  },
  { maxTimeout: 3000, retries: 5, randomize: true }
)

export default Hydra
