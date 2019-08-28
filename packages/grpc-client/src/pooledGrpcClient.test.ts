import { clients, hello, services } from "../generated/Test";
import { Observable } from "rxjs";
import {
  Context,
  DEFAULT_CLIENT_ERROR,
  IError,
  StatusCodes
} from "@types-first-api/core";
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

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const helloHandler = jest.fn(
  async (
    req$: Observable<hello.peeps.HelloRequest>,
    ctx: Context,
    {}
  ): Promise<hello.peeps.HelloReply> => {
    return message;
  }
);

const contextHandler = jest.fn(
  async (
    req$: Observable<hello.peeps.ContextRequest>,
    ctx: Context,
    {}
  ): Promise<hello.peeps.ContextResponse> => {
    return {
      metadata: ctx.metadata
    };
  }
);

const unavailableHelloHandler = jest.fn(
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

const asyncHello = jest.fn(
  async (
    req$: Observable<hello.peeps.AsyncHelloRequest>,
    ctx: Context,
    {}
  ): Promise<hello.peeps.HelloReply> => {
    const req = await req$.toPromise();
    if (!req.timeout) {
      throw {
        code: StatusCodes.BadRequest,
        message: "timeout is a required property of AsyncHelloRequest",
        forwardedFor: []
      };
    }

    await new Promise(resolve => setTimeout(resolve, req.timeout));

    return message;
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

service.registerServiceHandler("Hello", helloHandler);
service.registerServiceHandler("UnavailableHello", unavailableHelloHandler);
service.registerServiceHandler(
  "ConditionallyUnavailableHello",
  conditionallyAvailableHello
);
service.registerServiceHandler("Context", contextHandler);
service.registerServiceHandler("AsyncHello", asyncHello);
let server: GrpcServer;

afterEach(async () => {
  if (server) {
    await server.shutdown();
  }
});

it("maintains a healthy client pool after max client lifetime expires", async () => {
  const grpcPooledClientOptions = {
    pool: {
      connectionPoolSize: 8,
      maxClientLifeMs: 1000
    }
  };
  helloHandler.mockClear();
  server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(
    serviceName,
    address,
    PooledGrpcClient,
    grpcPooledClientOptions
  );

  for (let i = 0; i < grpcPooledClientOptions.pool.connectionPoolSize; ++i) {
    const response = await client.rpc.Hello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(helloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize
  );

  await new Promise(resolve => {
    setTimeout(resolve, grpcPooledClientOptions.pool.maxClientLifeMs);
  });

  for (let i = 0; i < grpcPooledClientOptions.pool.connectionPoolSize; ++i) {
    const response = await client.rpc.Hello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(helloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize * 2
  );
});

it("re-establishes client pool after channels close", async () => {
  helloHandler.mockClear();
  const grpcPooledClientOptions = {
    pool: { connectionPoolSize: 8 }
  };
  server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

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
    const response = await client.rpc.Hello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(helloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize * 4
  );

  await server.shutdown();

  server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  for (
    let i = 0;
    i < grpcPooledClientOptions.pool.connectionPoolSize * 4;
    ++i
  ) {
    const response = await client.rpc.Hello({}).toPromise();

    expect(response).toEqual(message);
  }
  expect(helloHandler).toBeCalledTimes(
    grpcPooledClientOptions.pool.connectionPoolSize * 8
  );
});

it("tries a call twice when given an unavailable response", async () => {
  unavailableHelloHandler.mockClear();
  server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(serviceName, address, PooledGrpcClient);

  const call = client.rpc.UnavailableHello({}).toPromise();

  await expect(call).rejects.toMatchObject({
    code: StatusCodes.Unavailable
  });

  expect(unavailableHelloHandler).toBeCalledTimes(2);
});

it("retries and gets an appropriate response when given an unavailable error code", async () => {
  conditionallyAvailableHello.mockClear();
  isAvailable = false;
  server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(serviceName, address, PooledGrpcClient);

  const response = await client.rpc
    .ConditionallyUnavailableHello({})
    .toPromise();

  expect(response).toEqual(message);

  expect(conditionallyAvailableHello).toBeCalledTimes(2);
});

it("optionally returns serialized errors", async () => {
  unavailableHelloHandler.mockClear();

  server = GrpcServer.createWithOptions({}, service);
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
    .UnavailableHello({})
    .toPromise()
    .catch(err => err);

  expect(typeof error).toEqual("string");
  expect(JSON.parse(error)).toMatchObject({
    code: StatusCodes.Unavailable
  });
});

/*
  The grpc client knows how to wait for the client streaming requests to drain before closing the channel
 */
it("waits for a client request to drain before closing connection", async () => {
  const options = {
    pool: {
      maxClientLifeMs: 1000,
      connectionPoolSize: 4
    }
  };
  server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(
    serviceName,
    address,
    PooledGrpcClient,
    options
  );

  const responsePromise = client.rpc
    .AsyncHello({
      timeout: 5000
    })
    .toPromise();

  await wait(options.pool.maxClientLifeMs);

  for (let i = 0; i < options.pool.connectionPoolSize; ++i) {
    const response = await client.rpc.Hello({}).toPromise();
    expect(response).toEqual(message);
  }

  await expect(responsePromise).resolves.toEqual(message);
});

it("has a max metadata size of 65kb", async () => {
  server = GrpcServer.createWithOptions({}, service);
  await server.bind(address);

  const client = clients.create(serviceName, address, PooledGrpcClient);

  const smallContext = Context.create({
    metadata: {
      token: "a".repeat(65e3)
    }
  });
  const smallContextResponse = await client.rpc
    .Context({}, smallContext)
    .toPromise();
  await expect(smallContextResponse.metadata).toMatchObject(
    smallContext.metadata
  );

  const bigContext = Context.create({
    metadata: {
      token: "a".repeat(66e3)
    }
  });
  const bigContextResponse = client.rpc.Context({}, bigContext).toPromise();

  await expect(bigContextResponse).rejects.toMatchObject({
    code: 'Unavailable',
    message: DEFAULT_CLIENT_ERROR.message
  });
});
