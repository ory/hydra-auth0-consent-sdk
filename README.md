# hydra-consent-app-auth0

This repository contains a library and an exemplary express application that connects ORY Hydra with Auth0.



```
LOG_LEVEL=debug \
    FORCE_ROOT_CLIENT_CREDENTIALS=root:secret \
    CONSENT_URL=http://localhost:6001/auth/consent \
    DATABASE_URL=memory \
    ISSUER_URL=http://localhost:4444/ \
    hydra host --dangerous-force-http

LOG_LEVEL=debug \
    HYDRA_URL=http://localhost:4444/ \
    HYDRA_CLIENT_SECRET=secret \
    HYDRA_CLIENT_ID=root \
    PORT=6001 \
    yarn start

hydra token user \
    --auth-url=http://localhost:4444/oauth2/auth \
    --token-url=http://localhost:4444/oauth2/token \
    --id=root \
    --secret=secret
```


## Configuration

AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_DOMAIN=
AUTH0_CALLBACK_URL=

HYDRA_CLIENT_ID=
HYDRA_CLIENT_SECRET=
HYDRA_URL=

COOKIE_SECRET=
