import { clients, services, wtf } from '../generated/Service';
import { Client, Context, ErrorCodes, Service } from '@types-first-api/core';
import { HttpServer } from '@types-first-api/http-server';

describe('http', () => {
  let service: Service<wtf.guys.SchedulingService>;
  let server: HttpServer;
  let client: Client<wtf.guys.SchedulingService>;

  beforeEach(async () => {
    service = services.create('wtf.guys.SchedulingService', {});
    server = new HttpServer(service);
    await server.bind({ port: 5555 });
    client = clients.create('wtf.guys.SchedulingService', 'localhost:5555', HttpClient);
  });
});
