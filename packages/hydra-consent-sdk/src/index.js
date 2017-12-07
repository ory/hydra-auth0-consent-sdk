// @flow
import { auth0 } from './config'
import {
  consentValidator,
  defaultOpenIdConnectHandler,
  defaultScopeDescriptions,
  defaultScopeRenderer,
  consentHandler
} from './consent'
import Hydra, { refreshToken, retryRefreshToken } from './hydra'
import initializeMiddleware from './middlewares'
import {initialize as initializePassport} from './passport'

export {
  auth0,
  consentValidator, defaultOpenIdConnectHandler, defaultScopeDescriptions, defaultScopeRenderer, consentHandler,
  Hydra, refreshToken, retryRefreshToken,
  initializeMiddleware,
  initializePassport
}
