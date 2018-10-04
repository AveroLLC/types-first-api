import { of, from } from 'rxjs';
import { clients, services, wtf } from '../generated/Service';
import { Client, Context, StatusCodes, Service } from '@types-first-api/core';
import { HttpServer } from '@types-first-api/http-server';
import { HttpClient } from '@types-first-api/http-client';
import { promises } from 'fs';

describe('http', () => {
  let service: Service<wtf.guys.SchedulingService>;
  let server: HttpServer;
  let client: Client<wtf.guys.SchedulingService>;

  beforeEach(async () => {
    service = services.create('wtf.guys.SchedulingService', {});
    server = new HttpServer(service);
    await server.bind({ port: 5555 });
    client = clients.create(
      'wtf.guys.SchedulingService',
      { host: 'localhost', port: 5555 },
      HttpClient
    );
  });

  afterEach(async () => {
    await server.shutdown();
  });

  describe('client initialization', () => {
    it('should provide rpc functions based on the service', () => {
      expect(client.rpc.Unary).toBeInstanceOf(Function);
      expect(client.rpc.ClientStream).toBeInstanceOf(Function);
      expect(client.rpc.ServerStream).toBeInstanceOf(Function);
      expect(client.rpc.BidiStream).toBeInstanceOf(Function);
    });
  });

  describe('errors', () => {
    it('should return an error if given a bad connection string', () => {
      client = clients.create(
        'wtf.guys.SchedulingService',
        { host: 'localhost', port: 12345 },
        HttpClient
      );

      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.Unavailable,
        message:
          'request to http://localhost:12345/rpc/wtf.guys.SchedulingService/Unary failed, reason: connect ECONNREFUSED 127.0.0.1:12345',
      });
    });

    it(`should propagate a serialized error from the server`, () => {
      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: 'Not Implemented',
        message: `RPC Method 'Unary' is not implemented.`,
        source: 'wtf.guys.SchedulingService',
      });
    });

    it('should propagate errors from upstream client calls', () => {
      service.registerServiceHandler('Unary', req$ => {
        return client.rpc.ServerStream(req$);
      });

      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: 'Not Implemented',
        message: "RPC Method 'ServerStream' is not implemented.",
        source: 'wtf.guys.SchedulingService',
      });
    });

    it('should throw an error if the client attempts to make a streaming call', () => {
      const response$ = client.rpc.BidiStream(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: 'Client Error',
        details:
          'The method BidiStream requires support for request streaming and response streaming, which is not provided by the HTTP Client.',
        message: 'Streaming requests are not supported by the HTTP Client.',
      });
    });
  });
});
