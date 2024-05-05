/* Copyright (c) 2014-2017 Richard Rodger and other contributors, MIT License */

//var BASES = process.env.BASES.split(',')
var KIE = process.env.KIE_SERVICE_HOST || 'localhost'
var CONSUL = process.env.CONSUL_SERVICE_HOST || 'localhost'

var Seneca = require('seneca')

Seneca({tag: 'store'})
  //.test('print')

  .use('entity')
  .use('jsonfile-store', {folder: __dirname+'/../../data'})

  .use('../store.js', {
    kie: {
      host: KIE
    }
  })

  .use('consul-registry', {
    host: CONSUL
  })

  .use('mesh', {
    pin: 'role:store',
    //bases: BASES,
    host: '@eth0',
    //sneeze: {silent:false},
    discover: {
      registry: {
        active: true
      }
    },
  })
