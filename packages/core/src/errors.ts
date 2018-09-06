import { isString, isError } from 'util';

export enum ErrorCodes {
  BadRequest = 'Bad Request',
  NotImplemented = 'Not Implemented',
  NotAuthenticated = 'Not Authenticated',
  NotAuthorized = 'Not Authorized',
  NotFound = 'Not Found',
  Internal = 'Internal',
  Unavailable = 'Unavailable',
  NetworkError = 'Network Error',
}

export const ERROR_CODES_TO_HTTP_STATUS: { [Code in ErrorCodes]: number } = {
  [ErrorCodes.BadRequest]: 400,
  [ErrorCodes.NotImplemented]: 501,
  [ErrorCodes.NotAuthenticated]: 401,
  [ErrorCodes.NotAuthorized]: 403,
  [ErrorCodes.NotFound]: 404,
  [ErrorCodes.Internal]: 500,
  [ErrorCodes.Unavailable]: 0,
  [ErrorCodes.NetworkError]: 0,
};

export const HEADERS = {
  TRAILER_STATUS: 'x-grpc-status',
  TRAILER_ERROR: 'x-grpc-serialized-error',
};

export interface IError {
  code: ErrorCodes;
  message: string;
  details?: string;
  stackTrace?: string;
  upstream?: IError;
}

export function isIError(err: any): err is IError {
  return err != null && isString(err.code) && isString(err.message);
}

export function normalizeError(err: any): IError {
  if (isIError(err)) {
    return err;
  }

  if (isError(err)) {
    return {
      code: ErrorCodes.Internal,
      message: err.message,
      stackTrace: err.stack,
    };
  }

  return {
    code: ErrorCodes.Internal,
    message: 'Something went wrong while processing the request.',
    details: err,
  };
}
