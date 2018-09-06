import { Endpoint } from './interfaces';
import { Service, Handler } from './service';
import { of, defer, throwError, Observable } from 'rxjs';
import { map, delay, mergeMap, tap, finalize } from 'rxjs/operators';
import { Context } from './context';
import { ErrorCodes, IError } from './errors';

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

interface Dependencies {
  usersSvc: {
    authenticate: () => Observable<boolean>;
  };
}

interface TestService {
  increment: Endpoint<IncrementRequest, IncrementResponse>;
  concat: Endpoint<ConcatRequest, ConcatResponse>;
}

interface AppContext {
  user: {
    username: string;
    birthday: Date;
  };
}

describe('Server', () => {
  let s: Service<TestService, Context<AppContext>, Dependencies>;
  let context: Context<AppContext>;
  const usersSvc = {
    authenticate: () => of(true).pipe(delay(1000)),
  };

  beforeEach(() => {
    s = new Service<TestService, Context<AppContext>, Dependencies>(null, {
      usersSvc,
    });
    context = Context.create({});
  });

  describe('#call', () => {
    ['throw', 'observable'].forEach(style => {
      let registerToThrow = (err: any) => {};
      beforeEach(() => {
        registerToThrow = err => {
          s.registerServiceHandler('increment', () => {
            if (style === 'throw') {
              throw err;
            } else {
              return throwError(err);
            }
          });
        };
      });

      describe(`${style} error handling`, () => {
        it('should default to a not implemented error', () => {
          const call = s.call('increment', of({ val: 1, add: 2 }), context);

          return expect(call.toPromise()).rejects.toMatchObject({
            code: ErrorCodes.NotImplemented,
          });
        });

        it('should create a basic structured error from random thrown objects', () => {
          registerToThrow('OH LORDY');

          const call = s.call('increment', of({ val: 1, add: 2 }), context);

          return expect(call.toPromise()).rejects.toMatchObject({
            code: ErrorCodes.Internal,
            message: 'Something went wrong while processing the request.',
          });
        });

        it('should create a structured error from random thrown errors', () => {
          registerToThrow(new Error('OH LORDY'));

          const call = s.call('increment', of({ val: 1, add: 2 }), context);

          return expect(call.toPromise()).rejects.toMatchObject({
            code: ErrorCodes.Internal,
            message: 'OH LORDY',
          });
        });

        it('should propagate thrown structured errors', () => {
          const err: IError = {
            code: ErrorCodes.NotAuthenticated,
            message: 'Who are you?',
            stackTrace: 'A, B, C',
          };
          registerToThrow(err);

          const call = s.call('increment', of({ val: 1, add: 2 }), context);

          return expect(call.toPromise()).rejects.toBe(err);
        });
      });
    });

    describe('handlers', () => {
      it('sould invoke the registered handler', () => {
        s.registerServiceHandler('increment', (req, ctx) => {
          return req.pipe(
            map(d => {
              return { val: d.val + d.add };
            })
          );
        });

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return expect(response.toPromise()).resolves.toEqual({ val: 12 });
      });

      it('should provide registered dependencies to the handler', () => {
        const handler = jest.fn((req, ctx) => {
          return of({ val: 12 });
        });

        s.registerServiceHandler('increment', handler);

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return response.toPromise().then(() => {
          expect(handler).toHaveBeenCalledTimes(1);
          const args = handler.mock.calls[0];
          expect(args[2]).toEqual({ usersSvc });
        });
      });
    });

    describe('middleware', () => {
      const handler = jest.fn((req, ctx) => {
        return req.pipe(
          map((d: any) => {
            return { val: d.val + d.add };
          })
        );
      });

      beforeEach(() => {
        handler.mockClear();
        s.registerServiceHandler('increment', handler);
      });

      it('invokes middleware with the name of the method called', () => {
        const middleware = jest.fn((req, ctx, deps, next, methodName) => {
          return next(req, ctx);
        });
        s.addMiddleware(middleware);

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return response.toPromise().then(() => {
          expect(middleware).toHaveBeenCalledTimes(1);
          const args = middleware.mock.calls[0];
          expect(args[4]).toEqual('increment');
        });
      });

      it('invokes middleware with the registered dependencies', () => {
        const middleware = jest.fn((req, ctx, deps, next, methodName) => {
          return next(req, ctx);
        });
        s.addMiddleware(middleware);

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return response.toPromise().then(() => {
          expect(middleware).toHaveBeenCalledTimes(1);
          const args = middleware.mock.calls[0];
          expect(args[2]).toEqual({ usersSvc });
        });
      });

      it('catches errors thrown in middleware', () => {
        s.addMiddleware(() => {
          throw new Error('OH LORDY!');
        });

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return expect(response.toPromise()).rejects.toMatchObject({
          message: 'OH LORDY!',
        });
      });

      it('returns the result from handler when there is registered middleware', () => {
        s.addMiddleware((req, ctx, deps, next) => {
          return next(req, ctx);
        });

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return expect(response.toPromise()).resolves.toEqual({ val: 12 });
      });

      it('allows the middleware to execute async actions before invoking next', () => {
        s.addMiddleware((req, ctx, deps, next) => {
          return deps.usersSvc.authenticate().pipe(mergeMap(() => next(req, ctx)));
        });

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return expect(response.toPromise()).resolves.toEqual({ val: 12 });
      });

      it('allows the middleware to bail inside an async action', () => {
        expect.assertions(2);

        s.addMiddleware((req, ctx, deps, next) => {
          return deps.usersSvc.authenticate().pipe(
            mergeMap(() => {
              throw new Error('OH LORDY!');
            })
          );
        });

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return response.toPromise().catch(err => {
          expect(err).toMatchObject({
            message: 'OH LORDY!',
          });
          expect(handler).not.toHaveBeenCalled();
        });
      });

      it('allows the middleware to execute actions after then handler completes', () => {
        expect.assertions(2);

        let t = 0;
        s.addMiddleware((req, ctx, deps, next) => {
          const t0 = Date.now();
          return deps.usersSvc.authenticate().pipe(
            mergeMap(() => {
              return next(req, ctx);
            }),
            finalize(() => {
              t = Date.now() - t0;
            })
          );
        });

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return response.toPromise().then(v => {
          expect(v).toEqual({ val: 12 });
          expect(t).toBeGreaterThan(1000);
        });
      });

      it('whatever', () => {
        s.addMiddleware((req, ctx, deps, next) => {
          ctx.set('user', { username: 'helo', birthday: new Date() });
          return next(req, ctx);
        });
      });
    });
  });
});

const tracer = (req, ctx, deps, next) => {
  ctx.set('user', { username: 'helo', birthday: new Date() });
  return next(req, ctx);
};
