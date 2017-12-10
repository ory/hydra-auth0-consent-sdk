import { consentHandler, consentValidator } from './consent'
import express from 'express'
import http from 'http'
import detect from 'detect-port'
import request from 'superagent'
import middlewares from './middlewares'
import nock from 'nock'
import csrf from 'csurf'
import path from 'path'
import passport from 'passport'

const csrfProtection = csrf({ cookie: true })

const id = 'consent-request-id'

const future = new Date()
future.setYear(9999)

nock('http://hydra.localhost')
  .post('/oauth2/token')
  .query(() => true)
  .reply(200, {
    access_token: 'foo',
    refresh_token: 'bar',
    token_type: 'bearer',
    expires_in: 3600
  })
  .persist()

nock('http://hydra.localhost')
  .get(`/redirect-success`)
  .reply(200, {})
  .persist()

nock('http://hydra.localhost')
  .get(`/oauth2/consent/requests/${id}`)
  .query(() => true)
  .reply(200, {
    clientId: process.env.HYDRA_CLIENT_ID,
    expiresAt: future.toISOString(),
    id,
    redirectUrl: 'http://hydra.localhost/redirect-success',
    requestedScopes: ['scope_a', 'scope_b']
  })
  .persist()

const handler = () => {
  return Promise.resolve({
    grantScopes: ['scopeA', 'scopeB'],
    subject: 'some-subject',
    idTokenExtra: { foo: 'bar' },
    accessTokenExtra: { foo: 'baz' }
  })
}

describe('', () => {
  const app = express()

  app.set('views', path.join(__dirname, 'stub'))
  app.set('view engine', 'jade')

  middlewares(app, passport)

  app.get('/consent', consentValidator(), (r, w) => w.json({ validated: true }))
  app.get('/consent', consentValidator(), (r, w) => w.json({ validated: true }))

  app.get(
    '/consent-ui',
    csrfProtection,
    consentHandler({
      sessionHydrator: handler
    }),
    (r, w) => w.json({ done: true })
  )

  app.post(
    '/consent-ui',
    csrfProtection,
    consentHandler({
      sessionHydrator: handler
    }),
    (r, w) => w.json({ done: true })
  )

  app.use(
    '/consent-ui-without-csurf',
    consentHandler({
      sessionHydrator: handler
    }),
    (r, w) => w.json({ done: true })
  )

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err)
    }

    if (!err) {
      return
    }

    res.status(err.status || 500)
    res.json({ error: err.message })
  })

  const server = http.createServer(app)

  let port
  beforeAll(async done =>
    detect(6164).then(fp => {
      port = fp
      server.listen(port)
      server.on('error', error =>
        console.error('A server error occurred', error)
      )
      server.on('listening', () => {
        setTimeout(() => done(), 500)
      })
    })
  )

  afterAll(() => {
    server.close()
  })

  it('should fail consent validation when no consent request was given', () => {
    return request.get(`http://127.0.0.1:${port}/consent`).catch(err => {
      expect(err.status).toEqual(500)
      expect(err.response.body.error).toEqual(
        'The consent flow was requested without a consent request ID'
      )
    })
  })

  it('should fail consent validation when an error occurred', () => {
    return request
      .get(`http://127.0.0.1:${port}/consent?error=foo&error_description=bar`)
      .catch(err => {
        expect(err.status).toEqual(500)
        expect(err.response.body.error).toEqual('bar')
      })
  })

  it('should fail consent handling wen no consent request is set in the session', () => {
    return request
      .post(`http://127.0.0.1:${port}/consent-ui-without-csurf`)
      .catch(err => {
        expect(err.status).toEqual(500)
        expect(err.response.body.error).toEqual(
          'The consent flow was requested without a consent request ID'
        )
      })
  })

  it('should pass consent validation when a consent request was given', () => {
    return request
      .get(`http://127.0.0.1:${port}/consent?consent=${id}`)
      .then(res => {
        expect(res.status).toEqual(200)
        expect(res.body.validated).toBeTruthy()
      })
  })

  it('should fail the consent flow when the accept and reject actions are undefined', () => {
    const agent = request.agent()

    return agent
      .get(`http://127.0.0.1:${port}/consent?consent=${id}`)
      .then(res => {
        expect(res.status).toEqual(200)
        expect(res.body.validated).toBeTruthy()
      })
      .then(() =>
        agent.post(`http://127.0.0.1:${port}/consent-ui-without-csurf`)
      )
      .catch(err => {
        expect(err.response.body.error).toEqual(
          'Authorization was neither granted nor denied'
        )
        expect(err.status).toEqual(500)
      })
  })

  it('should pass rejecting the consent flow', () => {
    const agent = request.agent()

    nock('http://hydra.localhost')
      .patch(`/oauth2/consent/requests/${id}/reject`)
      .reply(201)

    return agent
      .get(`http://127.0.0.1:${port}/consent?consent=${id}`)
      .then(res => {
        expect(res.status).toEqual(200)
        expect(res.body.validated).toBeTruthy()
      })
      .then(() =>
        agent
          .post(`http://127.0.0.1:${port}/consent-ui-without-csurf`)
          .type('form')
          .send({
            denyAuthorization: 'deny'
          })
      )
      .then(response => {
        expect(response.status).toEqual(200)
      })
  })

  it('should render the consent ui', () => {
    const agent = request.agent()

    return agent
      .get(`http://127.0.0.1:${port}/consent?consent=${id}`)
      .then(res => {
        expect(res.status).toEqual(200)
        expect(res.body.validated).toBeTruthy()
      })
      .then(() => agent.get(`http://127.0.0.1:${port}/consent-ui`))
      .then(response => {
        expect(response.status).toEqual(200)
      })
      .catch(err => {
        console.log('Got err', err.response.body)
        return Promise.reject(err)
      })
  })

  it('should fail to render the consent ui when no csurf is used', () => {
    const agent = request.agent()

    return agent
      .get(`http://127.0.0.1:${port}/consent?consent=${id}`)
      .then(res => {
        expect(res.status).toEqual(200)
        expect(res.body.validated).toBeTruthy()
      })
      .then(() =>
        agent.get(`http://127.0.0.1:${port}/consent-ui-without-csurf`)
      )
      .catch(err => {
        expect(err.response.status).toEqual(500)
      })
  })

  it('should pass accepting the consent flow', () => {
    const agent = request.agent()

    nock('http://hydra.localhost')
      .patch(`/oauth2/consent/requests/${id}/accept`, {
        grantScopes: ['scopeA', 'scopeB'],
        subject: 'some-subject',
        idTokenExtra: { foo: 'bar' },
        accessTokenExtra: { foo: 'baz' }
      })
      .reply(201)

    return agent
      .get(`http://127.0.0.1:${port}/consent?consent=${id}`)
      .then(res => {
        expect(res.status).toEqual(200)
        expect(res.body.validated).toBeTruthy()
      })
      .then(() =>
        agent
          .post(`http://127.0.0.1:${port}/consent-ui-without-csurf`)
          .type('form')
          .send({
            grantAuthorization: 'accept',
            grantedScopes: ['scopeA', 'scopeB']
          })
      )
      .then(response => {
        expect(response.status).toEqual(200)
      })
  })
})
