let Seneca = require('seneca')

Seneca({tag: 'store', timeout: 5000})
  //.test('print')
  .use('entity')
  .use('jsonfile-store', {folder: '/opt/msr/data'})
  .use('../store.js')
  .listen(8045)
  .client({pin:'role:reason', port:8035})
