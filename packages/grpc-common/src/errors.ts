import { StatusCodes } from '@types-first-api/core';
import * as grpc from '@grpc/grpc-js';

export const ERROR_CODES_TO_GRPC_STATUS: Record<StatusCodes, grpc.status> = {
  [StatusCodes.Ok]: grpc.status.OK,
  [StatusCodes.TokenExpired]: grpc.status.ABORTED,
  [StatusCodes.Cancelled]: grpc.status.CANCELLED,
  [StatusCodes.Deadline]: grpc.status.DEADLINE_EXCEEDED,
  [StatusCodes.RateLimit]: grpc.status.RESOURCE_EXHAUSTED,
  [StatusCodes.ClientError]: grpc.status.UNAVAILABLE,
  [StatusCodes.BadRequest]: grpc.status.INVALID_ARGUMENT,
  [StatusCodes.NotFound]: grpc.status.NOT_FOUND,
  [StatusCodes.NotAuthorized]: grpc.status.PERMISSION_DENIED,
  [StatusCodes.NotImplemented]: grpc.status.UNIMPLEMENTED,
  [StatusCodes.ServerError]: grpc.status.INTERNAL,
  [StatusCodes.Unavailable]: grpc.status.UNAVAILABLE,
  [StatusCodes.NetworkError]: grpc.status.UNAVAILABLE,
  [StatusCodes.NotAuthenticated]: grpc.status.UNAUTHENTICATED,
};

export const GRPC_STATUS_TO_ERROR_CODES: Record<grpc.status, StatusCodes> = {
  [grpc.status.OK]: StatusCodes.Ok,
  [grpc.status.CANCELLED]: StatusCodes.Cancelled,
  [grpc.status.UNKNOWN]: StatusCodes.NetworkError,
  [grpc.status.INVALID_ARGUMENT]: StatusCodes.BadRequest,
  [grpc.status.DEADLINE_EXCEEDED]: StatusCodes.Deadline,
  [grpc.status.NOT_FOUND]: StatusCodes.NotFound,
  [grpc.status.ALREADY_EXISTS]: StatusCodes.BadRequest,
  [grpc.status.PERMISSION_DENIED]: StatusCodes.NotAuthorized,
  [grpc.status.RESOURCE_EXHAUSTED]: StatusCodes.RateLimit,
  [grpc.status.FAILED_PRECONDITION]: StatusCodes.ServerError,
  [grpc.status.ABORTED]: StatusCodes.TokenExpired,
  [grpc.status.OUT_OF_RANGE]: StatusCodes.ServerError,
  [grpc.status.UNIMPLEMENTED]: StatusCodes.NotImplemented,
  [grpc.status.INTERNAL]: StatusCodes.ServerError,
  [grpc.status.UNAVAILABLE]: StatusCodes.Unavailable,
  [grpc.status.DATA_LOSS]: StatusCodes.NetworkError,
  [grpc.status.UNAUTHENTICATED]: StatusCodes.NotAuthenticated,
};