let Seneca = require('seneca')
Seneca({tag: 'store', timeout: 5000})
  //.test('print')
  .use('entity')
  .use('jsonfile-store', {folder: '/opt/data'})
  .use('../store.js')
  .listen(9045)
  .client({pin:'role:reason', port:9035})
