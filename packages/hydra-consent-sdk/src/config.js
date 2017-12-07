// @flow
export const auth0: {
  client: {
    id: string,
    secret: string
  },
  domain: string,
  callback: string
} = {
  client: {
    id: process.env.AUTH0_CLIENT_ID || '',
    secret: process.env.AUTH0_CLIENT_SECRET || ''
  },
  domain: process.env.AUTH0_DOMAIN || '',
  callback: process.env.AUTH0_CALLBACK_URL || ''
}
