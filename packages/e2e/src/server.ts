import { services } from '../generated/Service';
import { HttpServer } from '@types-first-api/http-server';

const service = services.create('wtf.guys.EchoService', {});

service.addMiddleware((req$, ctx, deps, next, methodName) => {
  console.log(`received call for ${methodName}`);
  return next(req$, ctx);
});

service.registerServiceHandler('Echo', req$ => {
  return req$;
});

const server = new HttpServer(service);

server.bind({ port: 5555 }).then(port => {
  console.log('server listening on port', port);
});
