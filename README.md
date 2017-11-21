# hydra-consent-app-auth0

## Example

## Development

```
yarn
yarn run bootstrap
```

## Middleware

```
    () => logger('dev'),
    () => bodyParser.json(),
    () => bodyParser.urlencoded({ extended: false }),
    () => cookieParser(),
    () =>
      session({
        secret: process.env.COOKIE_SECRET || uuid.v4(),
        resave: true,
        saveUninitialized: true,
        httpOnly: true
      }),
    () => flash(),
    () => passport.initialize(),
    () => passport.session(),
    () => express.static(path.join(__dirname, '..', 'public'))
```
