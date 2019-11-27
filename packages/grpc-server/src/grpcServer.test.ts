import { GrpcServer } from './grpcServer';
import { services } from '../generated/Test';

it('allows direct calls to the service', async () => {
  const service = services.create('hello.peeps.GreeterService', {});
  service.registerServiceHandler('Hello', async () => {
    return {
      message: 'Hello',
    };
  });
  const server = new GrpcServer(service);
  const response = await server._rpc.Hello({}).toPromise();

  expect(response.message).toEqual('Hello');
});

it('serializes client requests', async () => {
  const service = services.create('hello.peeps.GreeterService', {});
  service.registerServiceHandler('ClientSerialization', async req$ => {
    const req = await req$.toPromise();

    return {
      isSerialized: typeof req.message === 'string',
    };
  });
  const server = new GrpcServer(service);
  const response = await server._rpc.ClientSerialization({}).toPromise();

  expect(response.isSerialized).toEqual(true);
});

it('serializes server responses', async () => {
  const service = services.create('hello.peeps.GreeterService', {});
  service.registerServiceHandler('ServerSerialization', async req$ => {
    const req = await req$.toPromise();

    return {
      message: req.sendNull ? undefined : 'Hello',
    };
  });
  const server = new GrpcServer(service);
  const nullResponse = await server._rpc
    .ServerSerialization({
      sendNull: true,
    })
    .toPromise();

  expect(nullResponse.message).toEqual('');

  const nonNullResponse = await server._rpc
    .ServerSerialization({
      sendNull: false,
    })
    .toPromise();
  expect(nonNullResponse.message).toEqual('Hello');
});
