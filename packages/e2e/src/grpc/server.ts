import { services } from '../../generated/Service';

import { GrpcServer } from '@types-first-api/grpc-server';

const service = services.create('wtf.guys.SchedulingService', {});

service.registerServiceHandler('BidiStream', req$ => {
  return req$;
});

const server = new GrpcServer(service);

server.bind({ port: 5555 }).then(console.log);
