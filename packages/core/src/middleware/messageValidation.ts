import { Middleware, Service } from '../service';
import { ErrorCodes, IError } from '../errors';
import { map } from 'rxjs/operators';

export function addToServer<TServer extends Service<any, any, any>>(
  server: TServer
): void {
  const { pbjsService } = server;

  const middleware: Middleware<any, any, any> = (req$, ctx, deps, next, methodName) => {
    const reqMessage = pbjsService.methods[methodName as string].resolvedRequestType;
    const resMessage = pbjsService.methods[methodName as string].resolvedResponseType;

    const validated$ = req$.pipe(
      map(d => {
        const validationError = reqMessage.verify(d);
        if (validationError) {
          const err: IError = {
            code: ErrorCodes.BadRequest,
            message: validationError,
            stackTrace: new Error().stack,
          };
          throw err;
        }

        return reqMessage.toObject(reqMessage.create(d));
      })
    );
    return next(validated$, ctx).pipe(
      map(d => {
        const validationError = resMessage.verify(d);
        if (validationError) {
          const err: IError = {
            code: ErrorCodes.ServerError,
            message: validationError,
            stackTrace: new Error().stack,
          };
          throw err;
        }

        return resMessage.toObject(resMessage.create(d));
      })
    );
  };

  server.addMiddleware(middleware);
}
