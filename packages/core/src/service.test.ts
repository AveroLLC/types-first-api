import { IncrementRequest } from './../dest/Test';
import { TestService, pbjsService, IncrementRequest } from './testData';
import { Service, Handler } from './service';
import { of, throwError, Observable, zip } from 'rxjs';
import { map, delay, mergeMap, finalize } from 'rxjs/operators';
import { Context } from './context';
import { StatusCodes, IError, DEFAULT_SERVER_ERROR } from './errors';

interface Dependencies {
  usersSvc: {
    authenticate: () => Observable<boolean>;
  };
}

describe('Service', () => {
  let s: Service<TestService, Dependencies>;
  let context: Context;
  const usersSvc = {
    authenticate: () => of(true).pipe(delay(1000)),
  };

  beforeEach(() => {
    s = new Service<TestService, Dependencies>(pbjsService, {
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
            code: StatusCodes.NotImplemented,
          });
        });

        it('should create a basic structured error from random thrown objects', () => {
          registerToThrow('OH LORDY');

          const call = s.call('increment', of({ val: 1, add: 2 }), context);

          return expect(call.toPromise()).rejects.toMatchObject(DEFAULT_SERVER_ERROR);
        });

        it('should create a structured error from random thrown errors', () => {
          registerToThrow(new Error('OH LORDY'));

          const call = s.call('increment', of({ val: 1, add: 2 }), context);

          return expect(call.toPromise()).rejects.toMatchObject({
            code: StatusCodes.ServerError,
            message: 'OH LORDY',
          });
        });

        it('should propagate thrown structured errors', () => {
          const err: IError = {
            code: StatusCodes.NotAuthenticated,
            message: 'Who are you?',
            stackTrace: 'A, B, C',
            forwardedFor: [],
          };
          registerToThrow(err);

          const call = s.call('increment', of({ val: 1, add: 2 }), context);

          return expect(call.toPromise()).rejects.toBe(err);
        });
      });
    });

    describe('handlers', () => {
      it('should invoke the registered handler', () => {
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

      it('should register a map of service handlers', () => {
        const expectedIncrementResult = { val: 12 };
        const increment = jest.fn((req, ctx) => {
          return of(expectedIncrementResult);
        });

        const expectedConcatResult = { val: 'Hello World' };
        const concat = jest.fn((req, ctx) => {
          return of(expectedConcatResult);
        });
        s.registerServiceHandlers({
          increment: increment,
          concat: concat,
        });

        const incrementReq$ = s.call('increment', of({ val: 10, add: 2 }), context);
        const concatReq$ = s.call('concat', of({ val: 'Hello ', add: 'World' }), context);

        return zip(incrementReq$, concatReq$)
          .toPromise()
          .then(([incrementRes, concatRes]) => {
            expect(increment).toHaveBeenCalledTimes(1);
            expect(concat).toHaveBeenCalledTimes(1);
            expect(incrementRes).toEqual(expectedIncrementResult);
            expect(concatRes).toEqual(expectedConcatResult);
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

      it('allows middleware to mutate context', () => {
        s.addMiddleware((req, ctx, deps, next) => {
          ctx.set('user', { username: 'hello', birthday: new Date() });
          return next(req, ctx);
        });

        s.registerServiceHandler('increment', (req$, ctx) => {
          return of({
            val: ctx.get('user').username.length,
          });
        });

        const response = s.call('increment', of({ val: 10, add: 2 }), context);

        return expect(response.toPromise()).resolves.toEqual({ val: 5 });
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
          expect(t).toBeGreaterThanOrEqual(1000);
        });
      });
    });
  });

  describe.only('validation', () => {
    beforeEach(() => {
      s.registerServiceHandler('increment', req$ => {
        return req$.pipe(
          map(req => {
            const { val, add } = req;
            return { val: val + (add == null ? 5 : add) };
          })
        );
      });
    });
    it('should return an error if a required field is not provided', async () => {
      const badReq = {} as any;

      const res$ = s.call('increment', of(badReq), context);
      await expect(res$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.BadRequest,
        message: 'val: integer expected',
      });
    });
    it('should return an error if a wrong type is provided', async () => {
      const badReq = { val: 1, add: '2' } as any;

      const res$ = s.call('increment', of(badReq), context);
      await expect(res$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.BadRequest,
        message: 'add: integer expected',
      });
    });
    it('should not return an error if optional fields are not provided', async () => {
      const badReq = { val: 1 } as any;

      const res$ = s.call('increment', of(badReq), context);
      await expect(res$.toPromise()).resolves.toEqual({
        val: 6,
      });
    });
    it('should strip additional properties', async () => {
      expect.assertions(1);

      const badReq = { val: 1, add: 2, extra: 3 } as any;

      s.registerServiceHandler('increment', req$ => {
        return req$.pipe(
          map(req => {
            expect(req).not.toHaveProperty('extra');
            const { val, add } = req;
            return { val: val + (add == null ? 5 : add) };
          })
        );
      });

      const res$ = s.call('increment', of(badReq), context);
      await res$.toPromise();
    });
  });

  describe('cancelation', () => {
    it('skips the stack if context is already canceled', async () => {
      const middleware = jest.fn((req, ctx, deps, next, methodName) => {
        return next(req, ctx);
      });
      s.addMiddleware(middleware);
      const handler = jest.fn((req, ctx) => {
        return of({ val: 12 });
      });
      s.registerServiceHandler('increment', handler);

      context.cancel();
      const res$ = s.call('increment', of({ val: 10, add: 2 }), context);

      await expect(res$.toPromise()).rejects.toMatchObject({
        code: StatusCodes.Cancelled,
      });

      expect(middleware).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
