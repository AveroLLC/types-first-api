import { StatusCodes } from '@types-first-api/core';
import * as _ from 'lodash';

export const ERROR_CODES_TO_HTTP_STATUS: Record<StatusCodes, number> = {
  [StatusCodes.Ok]: 200,
  [StatusCodes.TokenExpired]: 412,
  [StatusCodes.Cancelled]: 499,
  [StatusCodes.Deadline]: 499,
  [StatusCodes.RateLimit]: 429,
  [StatusCodes.ClientError]: 502,
  [StatusCodes.BadRequest]: 400,
  [StatusCodes.NotFound]: 404,
  [StatusCodes.NotAuthorized]: 403,
  [StatusCodes.NotImplemented]: 501,
  [StatusCodes.ServerError]: 500,
  [StatusCodes.Unavailable]: 503,
  [StatusCodes.NetworkError]: 502,
  [StatusCodes.NotAuthenticated]: 401,
};

export const HTTP_STATUS_TO_ERROR_CODES: Record<number, StatusCodes> = _.invert(
  ERROR_CODES_TO_HTTP_STATUS
);
