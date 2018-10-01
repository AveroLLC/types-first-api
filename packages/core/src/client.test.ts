import { DEFAULT_CLIENT_ERROR, ErrorCodes } from './errors';
import { Client, ClientMiddleware } from './client';
import { Endpoint, Request } from './interfaces';
import { Context } from './context';
import * as pbjs from 'protobufjs';
import { of, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface IncrementRequest {
  val: number;
  add: number;
}
interface IncrementResponse {
  val: number;
}

interface ConcatRequest {
  val: string;
  add: string;
}
interface ConcatResponse {
  val: string;
}

interface TestService {
  increment: Endpoint<IncrementRequest, IncrementResponse>;
  concat: Endpoint<ConcatRequest, ConcatResponse>;
}

describe('client', () => {
  const callHandler = jest.fn();
  class MyClient extends Client<TestService> {
    _call<K extends 'increment' | 'concat'>(
      methodName: K,
      req: Observable<TestService[K]['request']>,
      ctx: Context
    ): Observable<TestService[K]['response']> {
      return callHandler(methodName, req, ctx);
    }
  }
  let client: MyClient;
  let context: Context;

  beforeEach(() => {
    callHandler.mockClear();
    callHandler.mockImplementation((methodName, req, ctx) => {
      return req.pipe(
        map((r: any) => ({
          val: r.val + r.add,
        }))
      );
    });
    // This is a mock of the pbjs model
    client = new MyClient(
      {
        methods: {
          increment: {},
          concat: {},
        },
        fullName: '',
      } as any,
      ''
    );
    context = Context.create();
  });

  describe('calls', () => {
    it('should provide an rpc method for each service function', () => {
      expect(client.rpc.concat).toBeInstanceOf(Function);
      expect(client.rpc.increment).toBeInstanceOf(Function);
    });

    it('should return an observable of the response', () => {
      const req$ = of({
        val: '1',
        add: '2',
      });
      const res$ = client.rpc.concat(req$, context);

      expect(res$).toBeInstanceOf(Observable);
    });

    it('should invoke the handler when an rpc method is called', async () => {
      const req$ = of({
        val: '1',
        add: '2',
      });
      const res$ = client.rpc.concat(req$, context);

      await res$.toPromise();
      expect(callHandler).toHaveBeenCalledTimes(1);
      expect(callHandler).toHaveBeenCalledWith('concat', req$, context);
    });

    it('should catch errors thrown in the handler', () => {
      callHandler.mockImplementation(() => {
        throw new Error('UH OH!');
      });

      const req$ = of({
        val: '1',
        add: '2',
      });
      const res$ = client.rpc.concat(req$, context);

      return expect(res$.toPromise()).rejects.toMatchObject({
        code: ErrorCodes.ClientError,
        message: 'UH OH!',
      });
    });
  });

  describe('middleware', () => {
    const middleware = jest.fn();
    beforeEach(() => {
      middleware.mockClear();
      middleware.mockImplementation((req, ctx, next) => {
        return next(req, ctx);
      });
      client.addMiddleware(middleware);
    });

    it('should invoke the middleware with the req, context, and method name', async () => {
      const req$ = of({
        val: '1',
        add: '2',
      });

      const res$ = client.rpc.concat(req$, context);
      await res$.toPromise();

      expect(middleware).toHaveBeenCalledTimes(1);
      const [req, ctx, _, methodName] = middleware.mock.calls[0];
      expect(req).toBe(req$);
      expect(ctx).toBe(context);
      expect(methodName).toBe('concat');
    });

    it('should invoke middleware before the handler', () => {});

    it('should invoke middleware in the order they are registered', () => {});
    it('should catch errors thrown in middleware', () => {});
  });
});
