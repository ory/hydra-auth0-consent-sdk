import type { $Request, $Response, NextFunction, Router } from 'express'

export default (r: $Request, w: $Response, next: NextFunction) => {
  const {
    query: {
      consent = r.session.consent,
      error,
      error_description: errorDescription
    }
  } = r

  if (error) {
    next(new Error(`${error}: ${errorDescription}`))
    return
  }

  if (!consent) {
    next(new Error('Consent request is neither existent in the url query nor in the session cookie'))
    return
  }

  r.sesion.consent = consent



}
