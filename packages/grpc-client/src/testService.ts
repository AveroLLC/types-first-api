import * as tfapi from '@types-first-api/core';
import * as pbjs from 'protobufjs';

export namespace hello {
    export namespace peeps {
        export interface GreeterService {
            UnaryHello: tfapi.Endpoint<HelloRequest, HelloReply>;
            ClientStreamHello: tfapi.Endpoint<HelloRequest, HelloReply>;
            ServerStreamHello: tfapi.Endpoint<HelloRequest, HelloReply>;
            BidiStreamHello: tfapi.Endpoint<HelloRequest, HelloReply>;
            WhitelistedHello: tfapi.Endpoint<HelloRequest, HelloReply>;
        }
        export interface HelloRequest {
            name?: string;
            numGreetings?: string;
        }
        export interface HelloReply {
            message?: string;
        }
    }
}
export interface Services {
    'hello.peeps.GreeterService': hello.peeps.GreeterService;
}
var jsonDescriptor = JSON.parse(
    '{"nested":{"hello":{"nested":{"peeps":{"nested":{"GreeterService":{"methods":{"UnaryHello":{"requestType":"HelloRequest","responseType":"HelloReply"},"ClientStreamHello":{"requestType":"HelloRequest","requestStream":true,"responseType":"HelloReply"},"ServerStreamHello":{"requestType":"HelloRequest","responseType":"HelloReply","responseStream":true},"BidiStreamHello":{"requestType":"HelloRequest","responseType":"HelloReply","responseStream":true}}},"HelloRequest":{"fields":{"name":{"type":"string","id":1},"numGreetings":{"type":"string","id":2}}},"HelloReply":{"fields":{"message":{"type":"string","id":1}}}}}}}}}'
);

var root = pbjs.Root.fromJSON(jsonDescriptor);
export var clients = tfapi.clientFactory<Services>(root);
export var services = tfapi.serviceFactory<Services>(root);