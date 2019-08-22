import * as tfapi from "@types-first-api/core";
import * as pbjs from "protobufjs";
import { loadSync } from "@grpc/proto-loader";
export interface TestService {
    increment: tfapi.Endpoint<IncrementRequest, IncrementResponse>;
    concat: tfapi.Endpoint<ConcatRequest, ConcatResponse>;
}
export interface IncrementRequest {
    val: number;
    add?: number;
}
export interface IncrementResponse {
    val: number;
}
export interface ConcatRequest {
    val: string;
    add?: string;
}
export interface ConcatResponse {
    val: string;
}
export interface Services {
    "TestService": TestService;
}
var jsonDescriptor = JSON.parse("{\"nested\":{\"TestService\":{\"methods\":{\"increment\":{\"requestType\":\"IncrementRequest\",\"responseType\":\"IncrementResponse\"},\"concat\":{\"requestType\":\"ConcatRequest\",\"responseType\":\"ConcatResponse\"}}},\"IncrementRequest\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"int32\",\"id\":1},\"add\":{\"type\":\"int32\",\"id\":2}}},\"IncrementResponse\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"int32\",\"id\":1}}},\"ConcatRequest\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"string\",\"id\":1},\"add\":{\"type\":\"string\",\"id\":2}}},\"ConcatResponse\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"string\",\"id\":1}}}}}");
var root = pbjs.Root.fromJSON(jsonDescriptor);
var packageDefinition = loadSync("../protos/Test.proto");
export var clients = tfapi.clientFactory<Services>(packageDefinition);
export var services = tfapi.serviceFactory<Services>(root);
