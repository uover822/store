/* Copyright (c) 2014-2017 Richard Rodger and other contributors, MIT License */

let Seneca = require('seneca')

Seneca({tag: 'reason', timeout: 5000})
  //.test('print')
  //.use('monitor')
  .use('../reason.js')
  .listen(9055)
  .use('mesh')
