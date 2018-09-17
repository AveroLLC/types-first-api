import { of } from 'rxjs';
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
      return expect(response$.toPromise()).rejects.toEqual({
        code: 'Network Error',
        message: 'Connect Failed',
      });
    });

    it('should propagate a serialized error from the server', () => {
      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toEqual({
        code: 'Not Implemented',
        message: "RPC Method 'Unary' is not implemented.",
      });
    });
  });
});
