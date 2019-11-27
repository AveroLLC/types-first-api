import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";
import { Client } from "./client";
import { Context } from "./context";
import { StatusCodes } from "./errors";
import { Endpoint } from "./interfaces";
import { MethodDefinition } from "@grpc/proto-loader";

interface IncrementRequest {
  val: number;
  add: number;
}
interface IncrementResponse {
  val: number;
}

interface ConcatRequest {
  val: string;
  add: string;
}
interface ConcatResponse {
  val: string;
}

interface TestService {
  increment: Endpoint<IncrementRequest, IncrementResponse>;
  concat: Endpoint<ConcatRequest, ConcatResponse>;
}

const callHandler = jest.fn();
class MyClient extends Client<TestService> {
  _call<K extends "increment" | "concat">(
    methodName: K,
    req: Observable<TestService[K]["request"]>,
    ctx: Context
  ): Observable<TestService[K]["response"]> {
    return callHandler(methodName, req, ctx);
  }
}
let client: MyClient;
let context: Context;
const middleware = jest.fn();
beforeEach(() => {
  callHandler.mockClear();
  callHandler.mockImplementation((methodName, req, ctx) => {
    return req.pipe(
      map((r: any) => ({
        val: r.val + r.add
      }))
    );
  });
  // This is a mock of the pbjs model
  client = new MyClient(
    "TestService",
    {
      increment: {} as MethodDefinition<object, object>,
      concat: {} as MethodDefinition<object, object>
    },
    { host: "host", port: 0 }
  );
  context = Context.create();

  middleware.mockClear();
  middleware.mockImplementation((req, ctx, next) => {
    return next(req, ctx);
  });
  client.addMiddleware(middleware);
});

describe("calls", () => {
  it("should provide an rpc method for each service function", () => {
    expect(client.rpc.concat).toBeInstanceOf(Function);
    expect(client.rpc.increment).toBeInstanceOf(Function);
  });

  it("should return an observable of the response", () => {
    const req$ = of({
      val: "1",
      add: "2"
    });
    const res$ = client.rpc.concat(req$, context);

    expect(res$).toBeInstanceOf(Observable);
  });

  it("lazily evaluate middleware & handler", async () => {
    const req$ = of({
      val: "1",
      add: "2"
    });

    const res$ = client.rpc.concat(req$, context);

    expect(middleware).toHaveBeenCalledTimes(0);
    expect(callHandler).toHaveBeenCalledTimes(0);

    await res$.toPromise();
    await res$.toPromise();

    expect(middleware).toHaveBeenCalledTimes(2);
    expect(callHandler).toHaveBeenCalledTimes(2);
  });

  it("should invoke the handler when an rpc method is called", async () => {
    const req$ = of({
      val: "1",
      add: "2"
    });
    const res$ = client.rpc.concat(req$, context);

    await res$.toPromise();
    expect(callHandler).toHaveBeenCalledTimes(1);
    expect(callHandler).toHaveBeenCalledWith("concat", req$, context);
  });

  it("should invoke the handler when an rpc method is called with just TReq interface", async () => {
    callHandler.mockImplementationOnce((method, $req) => {
      return $req;
    });
    const req = {
      val: "1",
      add: "2"
    };
    const res$ = client.rpc.concat(req, context);

    const result = await res$.toPromise();
    expect(callHandler).toHaveBeenCalledTimes(1);
    expect(result).toEqual(req);
  });

  it("should catch errors thrown in the handler", () => {
    callHandler.mockImplementation(() => {
      throw new Error("UH OH!");
    });

    const req$ = of({
      val: "1",
      add: "2"
    });
    const res$ = client.rpc.concat(req$, context);

    return expect(res$.toPromise()).rejects.toMatchObject({
      code: StatusCodes.ClientError,
      message: "UH OH!"
    });
  });
});

describe("middleware", () => {
  it("should invoke the middleware with the req, context, and method name", async () => {
    const req$ = of({
      val: "1",
      add: "2"
    });

    const res$ = client.rpc.concat(req$, context);
    await res$.toPromise();

    expect(middleware).toHaveBeenCalledTimes(1);
    const [req, ctx, _, methodName] = middleware.mock.calls[0];
    expect(req).toBe(req$);
    expect(ctx).toBe(context);
    expect(methodName).toBe("concat");
  });

  it("should invoke middleware before the handler", async () => {
    const callOrder = [];
    middleware.mockImplementation((req$, ctx, next) => {
      callOrder.push(1);
      return next(req$, ctx);
    });
    callHandler.mockImplementation(req$ => {
      callOrder.push(2);
      return req$;
    });

    const res$ = client.rpc.concat(
      of({
        val: "1",
        add: "2"
      }),
      context
    );

    await res$.toPromise();

    expect(callOrder).toEqual([1, 2]);
  });

  it("should invoke middleware in the order they are registered", async () => {
    const callOrder = [];
    middleware.mockImplementation((req$, ctx, next) => {
      callOrder.push(1);
      return next(req$, ctx);
    });
    client.addMiddleware((req$, ctx, next) => {
      callOrder.push(2);
      return next(req$, ctx);
    });
    callHandler.mockImplementation(req$ => {
      callOrder.push(3);
      return req$;
    });

    const res$ = client.rpc.concat(
      of({
        val: "1",
        add: "2"
      }),
      context
    );
    await res$.toPromise();

    expect(callOrder).toEqual([1, 2, 3]);
  });

  it("should catch errors thrown in middleware", () => {
    middleware.mockImplementation(() => {
      throw new Error("UH OH!");
    });

    const res$ = client.rpc.concat(
      of({
        val: "1",
        add: "2"
      }),
      context
    );

    return expect(res$.toPromise()).rejects.toMatchObject({
      code: StatusCodes.ClientError,
      message: "UH OH!"
    });
  });

  it("should not invoke subsequent stack calls after an error", async () => {
    const errorMessage = "UH OH!";
    middleware.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const res$ = client.rpc
      .concat(
        of({
          val: "1",
          add: "2"
        }),
        context
      )
      .toPromise();
    await expect(res$).rejects.toMatchObject({
      message: errorMessage
    });

    expect(callHandler).toHaveBeenCalledTimes(0);
  });
});

describe("cancellation", () => {
  // TODO: this is not implemented
  it("should skip the handler if the context is cancelled", async () => {
    const req$ = of({
      val: "1",
      add: "2"
    });
    context.cancel();
    const res$ = client.rpc.concat(req$, context);

    await expect(res$.toPromise()).rejects.toMatchObject({
      code: StatusCodes.Cancelled
    });

    expect(middleware).toHaveBeenCalledTimes(0);
    expect(callHandler).toHaveBeenCalledTimes(0);
  });

  it("should skip middleware if context is cancelled", async () => {
    const req$ = of({
      val: "1",
      add: "2"
    });
    context.cancel();
    const res$ = client.rpc.concat(req$, context);
    await expect(res$.toPromise()).rejects.toMatchObject({
      code: StatusCodes.Cancelled
    });

    expect(middleware).toHaveBeenCalledTimes(0);
  });
});

describe("errors", () => {
  it("can be configured to throw serialized errors", async () => {
    const serializedErrorClient = new MyClient(
      "TestService",
      {
        increment: {} as MethodDefinition<object, object>,
        concat: {} as MethodDefinition<object, object>
      },
      { host: "host", port: 0 },
      {
        serializeErrors: true
      }
    );

    callHandler.mockImplementation(() => {
      throw new Error("UH OH!");
    });

    const req$ = of({
      val: "1",
      add: "2"
    });
    const errorResponse = await serializedErrorClient.rpc
      .concat(req$, context)
      .toPromise()
      .catch(err => {
        return err;
      });

    return expect(JSON.parse(errorResponse)).toMatchObject({
      code: StatusCodes.ClientError,
      message: "UH OH!"
    });
  });
});
