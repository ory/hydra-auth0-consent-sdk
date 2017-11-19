import { isEmailAddressKnown, socialLoginUrls, signInStrategy } from './auth0'
import { initialize } from './passport'
import winston from 'winston'
import passport from 'passport'
import express from 'express'
import request from 'superagent'
import detect from 'detect-port'
import http from 'http'
import uuid from 'uuid'
import middlewares from './middlewares'

winston.level = 'debug'

describe('signInStrategy', () => {
  const app = express()

  initialize(passport)
  middlewares(app)

  app.post(
    '/login',
    passport.authenticate('local', {
      failureRedirect: '/failure',
      failureFlash: true
    }),
    (r, w) => {
      w.send({ user: r.user })
    }
  )

  app.get('/failure', (r, w) => {
    w.send({ error: r.flash('error') })
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

  it('should reject to authenticate an unknown user', () => {
    return request
      .agent()
      .post(`http://127.0.0.1:${port}/login`)
      .type('form')
      .send({ username: uuid.v4(), password: 'bar' })
      .catch(err => {
        expect(err.response.request.url).toEqual(
          `http://127.0.0.1:${port}/failure`
        )
        expect(err.status).toEqual(200)
        expect(err.response.body.error).toEqual('Wrong email or password.')
      })
  })

  it('should reject to authenticate an user using a wrong password', () => {
    return request
      .agent()
      .post(`http://127.0.0.1:${port}/login`)
      .type('form')
      .send({ username: process.env.TEST_AUTH0_USERNAME, password: 'bar' })
      .catch(err => {
        expect(err.response.request.url).toEqual(
          `http://127.0.0.1:${port}/failure`
        )
        expect(err.status).toEqual(200)
        expect(err.message).toEqual('Wrong email or password.')
      })
  })

  it('should authenticate an a correct user:password combination', () => {
    return request
      .agent()
      .post(`http://127.0.0.1:${port}/login`)
      .type('form')
      .send({
        username: process.env.TEST_AUTH0_USERNAME,
        password: process.env.TEST_AUTH0_PASSWORD
      })
      .then(response => {
        expect(response.ok).toBeTruthy()
        expect(response.body.error).toBeUndefined()
        expect(response.body.user).toBeDefined()
        expect(response.body.user._json.sub).toBeDefined()
        expect(
          response.body.user.emails.find(
            ({ value }) => value === 'zac@q-mail.me'
          ).value
        ).toEqual('zac@q-mail.me')
      })
  })

  afterAll(() => server.close())
})

describe('isEmailAddressKnown', () => {
  it('should find a known email address', () =>
    isEmailAddressKnown('zac@q-mail.me').then(known =>
      expect(known).toBeTruthy()
    ))

  it('should find an unknown email address', () =>
    isEmailAddressKnown('unknown@q-mail.me').then(known =>
      expect(known).toBeFalsy()
    ))

  it('should reject an invalid email address', () =>
    isEmailAddressKnown('unknown@q-mail.me').catch(err =>
      expect(err).toBeDefined()
    ))
})

describe('socialLoginUrls', () => {
  const socials = socialLoginUrls({ state: 'state-string' })

  it('Should have github, facebook and google login', () => {
    expect(socials.length).toEqual(3)
  })

  socials.forEach((social, k) => {
    describe(`Case ${k}`, () => {
      it('should contain vital information and have state and consent set', () => {
        expect(social.url).toBeDefined()
      })
    })
  })
})
