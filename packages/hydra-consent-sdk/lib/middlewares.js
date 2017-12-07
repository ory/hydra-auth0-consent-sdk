'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _expressSession = require('express-session');

var _expressSession2 = _interopRequireDefault(_expressSession);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _connectFlash = require('connect-flash');

var _connectFlash2 = _interopRequireDefault(_connectFlash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (app, passport) {
  return [function () {
    return _bodyParser2.default.json();
  }, function () {
    return _bodyParser2.default.urlencoded({ extended: true });
  }, function () {
    return (0, _cookieParser2.default)();
  }, function () {
    return (0, _expressSession2.default)({
      secret: process.env.COOKIE_SECRET || _uuid2.default.v4(),
      resave: true,
      saveUninitialized: true,
      httpOnly: true
    });
  }, function () {
    return (0, _connectFlash2.default)();
  }, function () {
    return passport.initialize();
  }, function () {
    return passport.session();
  }].forEach(function (mw) {
    return app.use(mw());
  });
};