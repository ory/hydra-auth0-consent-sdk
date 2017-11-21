// @flow
export type Auth0Config = {
  domain: string,
  client: {
    id: string,
    secret: string
  },
  callback: string
}

export type Logger = {
  debug: (...args: any) => void,
  warn: (...args: any) => void,
  info: (...args: any) => void,
  error: (...args: any) => void
}
