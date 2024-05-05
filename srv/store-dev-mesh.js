let Seneca = require('seneca')
Seneca({tag: 'store', timeout: 5000})
  //.test('print')
  //.use('monitor')
  .use('entity')
  .use('jsonfile-store', {folder: __dirname+'/../../data'})
  .use('../store.js')
  .listen(9045)
  .client({pin:'role:sync', port:9050})
  .use('mesh', {
    isbase: true
  })
