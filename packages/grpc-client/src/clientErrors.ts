import { createError, IError } from '@types-first-api/core';
import { GRPC_STATUS_TO_ERROR_CODES } from '@types-first-api/grpc-common';
import * as grpc from '@grpc/grpc-js';

function isGrpcStatus(s: any): s is grpc.StatusObject {
  return s.code in grpc.status && s.metadata != null && s.metadata.internalRepr != null;
}

export function normalizeGrpcError(err: any, defaultError: IError): IError {
  if (isGrpcStatus(err)) {
    const code = GRPC_STATUS_TO_ERROR_CODES[err.code] || defaultError.code;

    const error: IError = {
      code,
      message: err.details || defaultError.message,
      forwardedFor: [],
    };
    return createError(error, defaultError);
  }

  return createError(err, defaultError);
}
