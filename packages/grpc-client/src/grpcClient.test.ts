import { clients, hello, services } from "./testService";
import { Observable } from "rxjs";
import {Context, IError, StatusCodes} from "@types-first-api/core";
import { GrpcServer } from "@types-first-api/grpc-server";
import { GrpcClient } from "./grpcClient";

jest.setTimeout(15000);
const address = {
    host: "localhost",
    port: 8940
};

const serviceName = "hello.peeps.GreeterService";

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

const service = services.create(serviceName, {});

service.registerServiceHandler("ClientStreamHello", unavailableHello);

it("tries a call once when given an unavailable response", async () => {
    unavailableHello.mockClear();
    const server = GrpcServer.createWithOptions({}, service);
    await server.bind(address);

    const client = clients.create(serviceName, address, GrpcClient);

    const call = client.rpc.ClientStreamHello({}).toPromise();

    await expect(call).rejects.toMatchObject({
        code: StatusCodes.Unavailable
    });

    expect(unavailableHello).toBeCalledTimes(1);

    await server.shutdown();
});