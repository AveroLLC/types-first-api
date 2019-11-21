import * as tfapi from "@types-first-api/core";
import * as pbjs from "protobufjs";
import { loadSync } from "@grpc/proto-loader";
import * as path from "path";
export interface TestService {
    increment: tfapi.Endpoint<IncrementRequest, IncrementResponse>;
    concat: tfapi.Endpoint<ConcatRequest, ConcatResponse>;
    wrapped: tfapi.Endpoint<WrappedMessage, WrappedMessage>;
}
export interface IncrementRequest {
    val: number;
    add: number;
}
export interface IncrementResponse {
    val: number;
}
export interface ConcatRequest {
    val: string;
    add: string;
}
export interface ConcatResponse {
    val: string;
}
export namespace WrappedMessage {
    export interface WrappedString {
        value: string;
    }
}
export interface WrappedMessage {
    stringArray?: string[];
    wrappedString?: WrappedMessage.WrappedString;
}
export interface Services {
    "TestService": TestService;
}
const jsonDescriptor = JSON.parse("{\"nested\":{\"TestService\":{\"methods\":{\"increment\":{\"requestType\":\"IncrementRequest\",\"responseType\":\"IncrementResponse\"},\"concat\":{\"requestType\":\"ConcatRequest\",\"responseType\":\"ConcatResponse\"},\"wrapped\":{\"requestType\":\"WrappedMessage\",\"responseType\":\"WrappedMessage\"}}},\"IncrementRequest\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"int32\",\"id\":1},\"add\":{\"type\":\"int32\",\"id\":2}}},\"IncrementResponse\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"int32\",\"id\":1}}},\"ConcatRequest\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"string\",\"id\":1},\"add\":{\"type\":\"string\",\"id\":2}}},\"ConcatResponse\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"string\",\"id\":1}}},\"WrappedMessage\":{\"fields\":{\"stringArray\":{\"rule\":\"repeated\",\"type\":\"string\",\"id\":1},\"wrappedString\":{\"type\":\"WrappedString\",\"id\":2}},\"nested\":{\"WrappedString\":{\"fields\":{\"value\":{\"type\":\"string\",\"id\":1}}}}}}}");
const root = pbjs.Root.fromJSON(jsonDescriptor);
const packageDefinition = loadSync(path.resolve(__dirname, "./Test.proto"));
export const clients = tfapi.clientFactory<Services>(packageDefinition);
export const services = tfapi.serviceFactory<Services>(root);
