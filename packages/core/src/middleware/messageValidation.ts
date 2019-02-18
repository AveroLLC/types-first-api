import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { IError, StatusCodes } from '../errors';
import { Middleware } from '../service';

const PROTO_OPTIONS = {
  // enums: String, // enums as string names
  // longs: String, // longs as strings (requires long.js)
  // bytes: String, // bytes as base64 encoded strings
  defaults: true, // includes default values
  arrays: true, // populates empty arrays (repeated fields) even if defaults=false
  objects: true, // populates empty objects (map fields) even if defaults=false
  oneofs: true, // includes virtual oneof fields set to the present field's name
};

export function createMessageValidator(): Middleware<any, any> {

  return (req$, ctx, deps, next, { method }) => {
    const reqMessage = method.resolvedRequestType;
    const resMessage = method.resolvedResponseType;

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
    return from(next(validated$, ctx)).pipe(
      map(d => {
        return resMessage.toObject(resMessage.create(d), PROTO_OPTIONS);
      })
    );
  };
}
