import * as tfapi from "@types-first-api/core";
import * as pbjs from "protobufjs";
import { loadSync } from "@grpc/proto-loader";
import * as path from "path";
export interface TestService {
    increment: tfapi.Endpoint<IncrementRequest, IncrementResponse>;
    concat: tfapi.Endpoint<ConcatRequest, ConcatResponse>;
    wrapped: tfapi.Endpoint<WrappedMessage, WrappedMessage>;
    oneOfTest: tfapi.Endpoint<oneOfTestRequest, oneOfTestResponse>;
    mapTest: tfapi.Endpoint<mapTestRequest, mapTestResponse>;
    primitives: tfapi.Endpoint<primitiveRequest, primitiveResponse>;
}
export interface primitiveRequest {
    booleanValue: boolean;
    stringValue: string;
    numberValue: number;
    byteValue: Uint8Array;
}
export interface primitiveResponse {
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
export interface first {
    value: string;
}
export interface second {
}
export interface third {
}
export interface oneOfTestRequest {
    order?: "firstPlace" | "secondPlace" | "thirdPlace";
    firstPlace?: first;
    secondPlace?: second;
    thirdPlace?: third;
}
export interface oneOfTestResponse {
}
export interface mapTestRequest {
    myMap?: {
        [key: string]: first;
    };
}
export interface mapTestResponse {
    myArrayMap?: {
        [key: string]: string;
    };
}
export interface Services {
    "TestService": TestService;
}
const jsonDescriptor = JSON.parse("{\"nested\":{\"TestService\":{\"methods\":{\"increment\":{\"requestType\":\"IncrementRequest\",\"responseType\":\"IncrementResponse\"},\"concat\":{\"requestType\":\"ConcatRequest\",\"responseType\":\"ConcatResponse\"},\"wrapped\":{\"requestType\":\"WrappedMessage\",\"responseType\":\"WrappedMessage\"},\"oneOfTest\":{\"requestType\":\"oneOfTestRequest\",\"responseType\":\"oneOfTestResponse\"},\"mapTest\":{\"requestType\":\"mapTestRequest\",\"responseType\":\"mapTestResponse\"},\"primitives\":{\"requestType\":\"primitiveRequest\",\"responseType\":\"primitiveResponse\"}}},\"primitiveRequest\":{\"fields\":{\"booleanValue\":{\"type\":\"bool\",\"id\":1},\"stringValue\":{\"type\":\"string\",\"id\":2},\"numberValue\":{\"type\":\"int32\",\"id\":3},\"byteValue\":{\"type\":\"bytes\",\"id\":4}}},\"primitiveResponse\":{\"fields\":{}},\"IncrementRequest\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"int32\",\"id\":1},\"add\":{\"type\":\"int32\",\"id\":2}}},\"IncrementResponse\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"int32\",\"id\":1}}},\"ConcatRequest\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"string\",\"id\":1},\"add\":{\"type\":\"string\",\"id\":2}}},\"ConcatResponse\":{\"fields\":{\"val\":{\"rule\":\"required\",\"type\":\"string\",\"id\":1}}},\"WrappedMessage\":{\"fields\":{\"stringArray\":{\"rule\":\"repeated\",\"type\":\"string\",\"id\":1},\"wrappedString\":{\"type\":\"WrappedString\",\"id\":2}},\"nested\":{\"WrappedString\":{\"fields\":{\"value\":{\"type\":\"string\",\"id\":1}}}}},\"first\":{\"fields\":{\"value\":{\"type\":\"string\",\"id\":1}}},\"second\":{\"fields\":{}},\"third\":{\"fields\":{}},\"oneOfTestRequest\":{\"oneofs\":{\"order\":{\"oneof\":[\"firstPlace\",\"secondPlace\",\"thirdPlace\"]}},\"fields\":{\"firstPlace\":{\"type\":\"first\",\"id\":1},\"secondPlace\":{\"type\":\"second\",\"id\":2},\"thirdPlace\":{\"type\":\"third\",\"id\":3}}},\"oneOfTestResponse\":{\"fields\":{}},\"mapTestRequest\":{\"fields\":{\"myMap\":{\"keyType\":\"string\",\"type\":\"first\",\"id\":1}}},\"mapTestResponse\":{\"fields\":{\"myArrayMap\":{\"keyType\":\"string\",\"type\":\"string\",\"id\":1}}}}}");
const root = pbjs.Root.fromJSON(jsonDescriptor);
const packageDefinition = loadSync(path.resolve(__dirname, "./Test.proto"));
export const clients = tfapi.clientFactory<Services>(packageDefinition);
export const services = tfapi.serviceFactory<Services>(root);
