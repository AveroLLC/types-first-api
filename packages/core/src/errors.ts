import { isString, isError } from 'util';
import * as _ from 'lodash';

export enum ErrorCodes {
  BadRequest = 'Bad Request',
  NotImplemented = 'Not Implemented',
  NotAuthenticated = 'Not Authenticated',
  NotAuthorized = 'Not Authorized',
  NotFound = 'Not Found',
  Unavailable = 'Unavailable',
  NetworkError = 'Network Error',
  ServerError = 'Server Error',
  ClientError = 'Client Error',
}

export const ERROR_CODES_TO_HTTP_STATUS: Record<ErrorCodes, number> = {
  [ErrorCodes.BadRequest]: 400,
  [ErrorCodes.NotAuthenticated]: 401,
  [ErrorCodes.NotAuthorized]: 403,
  [ErrorCodes.NotFound]: 404,
  [ErrorCodes.ServerError]: 500,
  [ErrorCodes.NotImplemented]: 501,
  [ErrorCodes.Unavailable]: 0,
  [ErrorCodes.NetworkError]: 0,
  [ErrorCodes.ClientError]: 0,
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

export const DEFAULT_SERVER_ERROR: IError = {
  code: ErrorCodes.ServerError,
  message: 'Something went wrong while processing the request',
};

export const DEFAULT_CLIENT_ERROR: IError = {
  code: ErrorCodes.ClientError,
  message: 'Something went wrong while preparing the request',
};

export function isIError(err: any): err is IError {
  return err != null && isString(err.code) && isString(err.message);
}

export function normalizeError(err: any, defaultError: IError): IError {
  if (isIError(err)) {
    return err;
  }

  if (isError(err)) {
    return {
      ...defaultError,
      message: err.message,
      stackTrace: err.stack,
    };
  }

  return {
    ...defaultError,
    details: JSON.stringify(err),
  };
}
