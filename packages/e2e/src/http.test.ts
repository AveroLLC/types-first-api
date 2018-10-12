import { of, from, NEVER } from 'rxjs';
import { clients, services, wtf } from '../generated/Service';
import { Client, Context, StatusCodes, Service } from '@types-first-api/core';
import { HttpServer } from '@types-first-api/http-server';
import { HttpClient } from '@types-first-api/http-client';
import { promises } from 'fs';
import { later } from './util';
import { take } from 'rxjs/operators';

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

    it(`should propagate a serialized error from the server`, () => {
      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: 'Not Implemented',
        message: `RPC Method 'Unary' is not implemented.`,
        forwardedFor: ['wtf.guys.SchedulingService'],
      });
    });

    it('should propagate errors from upstream client calls', () => {
      service.registerServiceHandler('Unary', req$ => {
        return client.rpc.ServerStream(req$);
      });

      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: 'Client Error',
        message: 'Streaming requests are not supported by the HTTP Client.',
        details:
          'The method ServerStream requires support for response streaming, which is not provided by the HTTP Client.',
        forwardedFor: ['wtf.guys.SchedulingService'],
      });
    });

    it('normalize and return errors from the handler', () => {
      service.registerServiceHandler('Unary', req$ => {
        throw new Error('Uh OH!');
      });

      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.ServerError,
        message: 'Uh OH!',
        forwardedFor: ['wtf.guys.SchedulingService'],
      });
    });
  });

  describe('metadata', () => {
    it('should send context metadata from client to server', () => {
      let serverContext: Context;
      service.registerServiceHandler('Unary', (req$, ctx) => {
        serverContext = ctx;
        return req$;
      });

      const ctx = Context.create({ metadata: { hello: 'world' } });
      const res$ = client.rpc.Unary(of({ id: '1' }), ctx);

      return res$.toPromise().then(() => {
        return expect(serverContext.metadata).toMatchObject({
          hello: 'world',
        });
      });
    });
  });

  describe('responses', () => {
    it('should return the sever response', () => {
      service.registerServiceHandler('Unary', req$ => {
        return req$;
      });

      const response$ = client.rpc.Unary(of({ id: '1' }));
      return expect(response$.toPromise()).resolves.toEqual({ id: '1' });
    });
  });

  describe('cancellation', () => {
    it('should allow cancellation of a request immediately', () => {
      service.registerServiceHandler('Unary', () => {
        return NEVER;
      });

      const ctx = Context.create();
      ctx.cancel();

      const response$ = client.rpc.Unary(of({ id: '1' }), ctx);

      return expect(response$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.Cancelled,
      });
    });

    it('should allow cancellation of a request later', () => {
      service.registerServiceHandler('Unary', () => {
        return NEVER;
      });

      const ctx = Context.create();
      const response$ = client.rpc.Unary(of({ id: '1' }), ctx);
      setTimeout(ctx.cancel, 100);

      return expect(response$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.Cancelled,
      });
    });

    it('should propagate cancellation to the server', () => {
      let serverContext: Context;
      service.registerServiceHandler('Unary', (req$, ctx) => {
        serverContext = ctx;
        return NEVER;
      });

      const ctx = Context.create();
      const res$ = client.rpc.Unary(of({ id: '1' }), ctx);

      setTimeout(ctx.cancel, 100);

      return res$.toPromise().catch(() => {
        return expect(serverContext.cancel$.toPromise()).rejects.toMatchObject({
          code: StatusCodes.Cancelled,
        });
      });
    });
  });

  describe('deadlines', () => {
    it('should cause the client request to cancel with deadline exceeded', () => {
      service.registerServiceHandler('Unary', (req$, ctx) => {
        return NEVER;
      });

      const deadline = later();
      const ctx = Context.create({ deadline });
      const res$ = client.rpc.Unary(of({ id: '1' }), ctx);

      return expect(res$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.Deadline,
        message: `Request exceeded deadline ${deadline.toISOString()}.`,
      });
    });

    it('should propagate cancellation to the server', () => {
      let serverContext: Context;
      service.registerServiceHandler('Unary', (req$, ctx) => {
        serverContext = ctx;
        return NEVER;
      });

      const deadline = later();
      const ctx = Context.create({ deadline });
      const res$ = client.rpc.Unary(of({ id: '1' }), ctx);

      return res$.toPromise().catch(() => {
        return expect(serverContext.cancel$.toPromise()).rejects.toMatchObject({
          code: StatusCodes.Deadline,
          message: `Request exceeded deadline ${deadline.toISOString()}.`,
        });
      });
    });
  });
});
