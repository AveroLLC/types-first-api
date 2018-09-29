import { ErrorCodes } from './../../core/src/errors';
import { mergeMap } from 'rxjs/operators';
import { of, NEVER } from 'rxjs';
import { services, clients, wtf } from '../generated/Service';
import { GrpcClient } from '@types-first-api/grpc-client';
import { GrpcServer } from '@types-first-api/grpc-server';
import { Service, Client, Context } from '@types-first-api/core';

describe('grpc', () => {
  let service: Service<wtf.guys.SchedulingService>;
  let server: GrpcServer;
  let client: Client<wtf.guys.SchedulingService>;

  beforeEach(async () => {
    service = services.create('wtf.guys.SchedulingService', {});
    server = new GrpcServer(service);
    await server.bind({ port: 5555 });
    client = clients.create('wtf.guys.SchedulingService', 'localhost:5555', GrpcClient);
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
        'localhost:12345',
        GrpcClient
      );

      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: 'Network Error',
        message: 'Connect Failed',
      });
    });

    ['Unary', 'ClientStream', 'ServerStream', 'BidiStream'].forEach(methodName => {
      it(`should propagate a serialized error from the server for ${methodName}`, () => {
        const response$ = client.rpc[methodName](of({ id: '1' }));
        return expect(response$.toPromise()).rejects.toMatchObject({
          code: 'Not Implemented',
          message: `RPC Method '${methodName}' is not implemented.`,
          source: 'wtf.guys.SchedulingService',
        });
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
  });

  describe('cancelation', () => {
    it.only('should allow cancellation of a request', () => {
      service.registerServiceHandler('Unary', () => {
        return NEVER;
      });

      const ctx = Context.create();
      const response$ = client.rpc.Unary(of({ id: '1' }));

      ctx.cancel();

      return expect(response$.toPromise()).rejects.toMatchObject({
        code: ErrorCodes.BadRequest,
      });
    });
  });

  describe('deadlines', () => {});
});
