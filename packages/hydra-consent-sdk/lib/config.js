'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var auth0 = exports.auth0 = {
  client: {
    id: process.env.AUTH0_CLIENT_ID || '',
    secret: process.env.AUTH0_CLIENT_SECRET || ''
  },
  domain: process.env.AUTH0_DOMAIN || '',
  callback: process.env.AUTH0_CALLBACK_URL || ''
};