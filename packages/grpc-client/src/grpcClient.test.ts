import { clients, hello, services } from '../generated/Test';
import { Observable } from 'rxjs';
import { Context, IError, StatusCodes } from '@types-first-api/core';
import { GrpcServer } from '@types-first-api/grpc-server';
import { GrpcClient } from './grpcClient';

jest.setTimeout(15000);
const address = {
  host: 'localhost',
  port: 8940,
};

const serviceName = 'hello.peeps.GreeterService';

const unavailableHello = jest.fn(
  async (req$: Observable<hello.peeps.HelloRequest>, ctx: Context, {}) => {
    const error: IError = {
      code: StatusCodes.Unavailable,
      message: 'call failed because service is unavailable',
      forwardedFor: [],
    };

    throw error;
  }
);

const defaultValues = jest.fn(
  async (req$: Observable<hello.peeps.DefaultValuesRequest>, ctx: Context, {}) => {
    return req$.toPromise();
  }
);

const service = services.create(serviceName, {});

service.registerServiceHandler('UnavailableHello', unavailableHello);
service.registerServiceHandler('DefaultValues', defaultValues);

it('tries a call once when given an unavailable response', async () => {
  unavailableHello.mockClear();
  const server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create({ serviceName, address, ClientImpl: GrpcClient });

  const call = client.rpc.UnavailableHello({}).toPromise();

  await expect(call).rejects.toMatchObject({
    code: StatusCodes.Unavailable,
  });

  expect(unavailableHello).toBeCalledTimes(1);

  await server.shutdown();
});

it('defaults primitives and lets null objects stay null', async () => {
  unavailableHello.mockClear();
  const server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(serviceName, address, GrpcClient);

  const response = await client.rpc.DefaultValues({}).toPromise();

  const expectedResponse = {
    stringValue: '',
    numberValue: 0,
  };

  expect(response).toMatchObject(expectedResponse);
  await server.shutdown();
});
