FROM msr-shared:1
FROM node:18.17.1
COPY app /app/
WORKDIR app
RUN npm i -g npm@8.19.3
RUN npm install; sed -i s/remove_cv_t/remove_cv/ /root/.cache/node-gyp/18.17.1/include/node/v8-internal.h
RUN npm install seneca lodash seneca-zipkin-tracer seneca-statsd seneca-entity seneca-jsonfile-store
RUN npm install bluebird prom-client seneca-promisify ip objecthistory json-circular-stringify deep-object-diff
RUN cd app; mv -f logging.js node_modules/seneca/lib; mv -f jsonfile-store.js node_modules/seneca-jsonfile-store; mv -f data /opt
CMD ["node", "/app/srv/store-stage.js"]
