import { Middleware, Service } from '../service';
import { StatusCodes, IError } from '../errors';
import { map } from 'rxjs/operators';
import * as pbjs from 'protobufjs';

export function createMessageValidator(pbjsService: pbjs.Service): Middleware<any, any> {
  pbjsService.resolveAll();

  return (req$, ctx, deps, next, methodName) => {
    const reqMessage = pbjsService.methods[methodName as string].resolvedRequestType;
    const resMessage = pbjsService.methods[methodName as string].resolvedResponseType;

    const validated$ = req$.pipe(
      map(d => {
        const validationError = reqMessage.verify(d);
        if (validationError) {
          const err: IError = {
            code: StatusCodes.BadRequest,
            message: validationError,
            stackTrace: new Error().stack,
            forwardedFor: [],
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
            code: StatusCodes.ServerError,
            message: validationError,
            stackTrace: new Error().stack,
            forwardedFor: [],
          };
          throw err;
        }

        return resMessage.toObject(resMessage.create(d));
      })
    );
  };
}
