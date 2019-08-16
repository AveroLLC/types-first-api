import { clients, hello, services } from "./testService";
import { Observable } from "rxjs";
import { Context, IError, StatusCodes } from "@types-first-api/core";
import { GrpcServer } from "@types-first-api/grpc-server";
import { PooledGrpcClient, PooledGrpcClientOptions } from "./pooledGrpcClient";

jest.setTimeout(15000);
const address = {
  host: "localhost",
  port: 8941
};

const serviceName = "hello.peeps.GreeterService";

const message = {
  message: "Hello"
};

const unaryHelloHandler = jest.fn(
  async (
    req$: Observable<hello.peeps.HelloRequest>,
    ctx: Context,
    {}
  ): Promise<hello.peeps.HelloReply> => {
    return message;
  }
);

const unavailableHello = jest.fn(
  async (
    req$: Observable<hello.peeps.HelloRequest>,
    ctx: Context,
    {}
  ): Promise<hello.peeps.HelloReply> => {
    const error: IError = {
      code: StatusCodes.Unavailable,
      message: "call failed because service is unavailable",
      forwardedFor: []
    };

    throw error;
  }
);

let isAvailable = false;

const conditionallyAvailableHello = jest.fn(
  async (
    req$: Observable<hello.peeps.HelloRequest>,
    ctx: Context,
    {}
  ): Promise<hello.peeps.HelloReply> => {
    if (isAvailable) {
      isAvailable = false;
      return message;
    }

    isAvailable = true;
    const error: IError = {
      code: StatusCodes.Unavailable,
      message: "call failed because service is unavailable",
      forwardedFor: []
    };

    throw error;
  }
);

const service = services.create(serviceName, {});

service.registerServiceHandler("UnaryHello", unaryHelloHandler);
service.registerServiceHandler("ClientStreamHello", unavailableHello);
service.registerServiceHandler(
  "ServerStreamHello",
  conditionallyAvailableHello
);

it("maintains a healthy client pool after max client lifetime expires", async () => {
  const grpcPooledClientOptions = {
    pool: {
      connectionPoolSize: 8,
      maxClientLifeMs: 1000
    }
  };
  unaryHelloHandler.mockClear();
  const server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(
    serviceName,
    address,
    PooledGrpcClient,
    grpcPooledClientOptions
  );

  for (let i = 0; i < grpcPooledClientOptions.pool.connectionPoolSize; ++i) {
    const response = await client.rpc.UnaryHello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(unaryHelloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize
  );

  await new Promise(resolve => {
    setTimeout(resolve, grpcPooledClientOptions.pool.maxClientLifeMs);
  });

  for (let i = 0; i < grpcPooledClientOptions.pool.connectionPoolSize; ++i) {
    const response = await client.rpc.UnaryHello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(unaryHelloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize * 2
  );

  await server.shutdown();
});

it("re-establishes client pool after channels close", async () => {
  unaryHelloHandler.mockClear();
  const grpcPooledClientOptions = {
    pool: { connectionPoolSize: 8 }
  };
  const firstServer = GrpcServer.createWithOptions({}, service);
  const secondServer = GrpcServer.createWithOptions({}, service);
  await firstServer.bind(address);

  const client = clients.create(
    serviceName,
    address,
    PooledGrpcClient,
    grpcPooledClientOptions
  );

  for (
    let i = 0;
    i < grpcPooledClientOptions.pool.connectionPoolSize * 4;
    ++i
  ) {
    const response = await client.rpc.UnaryHello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(unaryHelloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize * 4
  );

  await firstServer.shutdown();

  await secondServer.bind(address);

  for (
    let i = 0;
    i < grpcPooledClientOptions.pool.connectionPoolSize * 4;
    ++i
  ) {
    const response = await client.rpc.UnaryHello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(unaryHelloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize * 8
  );

  await secondServer.shutdown();
});

it("tries a call twice when given an unavailable response", async () => {
  unavailableHello.mockClear();
  const server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(serviceName, address, PooledGrpcClient);

  const call = client.rpc.ClientStreamHello({}).toPromise();

  await expect(call).rejects.toMatchObject({
    code: StatusCodes.Unavailable
  });

  expect(unavailableHello).toBeCalledTimes(2);

  await server.shutdown();
});

it("retries and gets an appropriate response when given an unavailable error code", async () => {
  conditionallyAvailableHello.mockClear();
  isAvailable = false;
  const server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(serviceName, address, PooledGrpcClient);

  const response = await client.rpc.ServerStreamHello({}).toPromise();

  expect(response).toEqual(message);

  expect(conditionallyAvailableHello).toBeCalledTimes(2);

  await server.shutdown();
});

it("optionally returns serialized errors", async () => {
  unavailableHello.mockClear();

  const server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const options: PooledGrpcClientOptions = {
    client: {
      serializeErrors: true
    }
  };

  const client = clients.create(
    serviceName,
    address,
    PooledGrpcClient,
    options
  );

  const error = await client.rpc
    .ClientStreamHello({})
    .toPromise()
    .catch(err => err);

  expect(typeof error).toEqual('string');
  expect(JSON.parse(error)).toMatchObject({
    code: StatusCodes.Unavailable
  });

  await server.shutdown();
});
