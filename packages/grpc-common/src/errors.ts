import { ErrorCodes, IError, normalizeError } from '@types-first-api/core';
import * as grpc from 'grpc';
import * as _ from 'lodash';

export const ERROR_CODES_TO_GRPC_STATUS: Record<ErrorCodes, grpc.status> = {
  [ErrorCodes.ClientError]: 1, // TODO: this is probably the wrong error code
  [ErrorCodes.BadRequest]: grpc.status.INVALID_ARGUMENT,
  [ErrorCodes.NotFound]: grpc.status.NOT_FOUND,
  [ErrorCodes.NotAuthorized]: grpc.status.PERMISSION_DENIED,
  [ErrorCodes.NotImplemented]: grpc.status.UNIMPLEMENTED,
  [ErrorCodes.ServerError]: grpc.status.INTERNAL,
  [ErrorCodes.Unavailable]: grpc.status.UNAVAILABLE,
  [ErrorCodes.NetworkError]: grpc.status.UNAVAILABLE,
  [ErrorCodes.NotAuthenticated]: grpc.status.UNAUTHENTICATED,
};

const GRPC_STATUS_TO_ERROR_CODES = _.invert(ERROR_CODES_TO_GRPC_STATUS) as Record<
  grpc.status,
  ErrorCodes
>;

function isGrpcStatus(s: any): s is grpc.StatusObject {
  return (
    _.includes(grpc.status, s.code) &&
    s.metadata != null &&
    s.metadata._internal_repr != null
  );
}

export function normalizeGrpcError(err, defaultError: IError): IError {
  if (isGrpcStatus(err)) {
    const code = GRPC_STATUS_TO_ERROR_CODES[err.code] || defaultError.code;

    return {
      code,
      message: err.details || defaultError.message,
      source: defaultError.source,
    };
  }

  return normalizeError(err, defaultError);
}
