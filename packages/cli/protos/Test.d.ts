import * as $protobuf from "protobufjs";
export = avero.test;

declare namespace avero.test {


    /** Represents a TestService */
    class TestService extends $protobuf.rpc.Service {

        /**
         * Constructs a new TestService service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new TestService service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): TestService;

        /**
         * Calls increment.
         * @param request IncrementRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and IncrementResponse
         */
        public increment(request: IIncrementRequest, callback: TestService.incrementCallback): void;

        /**
         * Calls increment.
         * @param request IncrementRequest message or plain object
         * @returns Promise
         */
        public increment(request: IIncrementRequest): Promise<IncrementResponse>;

        /**
         * Calls concat.
         * @param request ConcatRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and ConcatResponse
         */
        public concat(request: IConcatRequest, callback: TestService.concatCallback): void;

        /**
         * Calls concat.
         * @param request ConcatRequest message or plain object
         * @returns Promise
         */
        public concat(request: IConcatRequest): Promise<ConcatResponse>;
    }

    namespace TestService {

        /**
         * Callback as used by {@link TestService#increment}.
         * @param error Error, if any
         * @param [response] IncrementResponse
         */
        type incrementCallback = (error: (Error|null), response?: IncrementResponse) => void;

        /**
         * Callback as used by {@link TestService#concat}.
         * @param error Error, if any
         * @param [response] ConcatResponse
         */
        type concatCallback = (error: (Error|null), response?: ConcatResponse) => void;
    }

    /** Properties of an IncrementRequest. */
    interface IIncrementRequest {

        /** IncrementRequest val */
        val: number;

        /** IncrementRequest add */
        add?: (number|null);
    }

    /** Represents an IncrementRequest. */
    class IncrementRequest implements IIncrementRequest {

        /**
         * Constructs a new IncrementRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: IIncrementRequest);

        /** IncrementRequest val. */
        public val: number;

        /** IncrementRequest add. */
        public add: number;

        /**
         * Creates a new IncrementRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns IncrementRequest instance
         */
        public static create(properties?: IIncrementRequest): IncrementRequest;

        /**
         * Encodes the specified IncrementRequest message. Does not implicitly {@link IncrementRequest.verify|verify} messages.
         * @param message IncrementRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: IIncrementRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified IncrementRequest message, length delimited. Does not implicitly {@link IncrementRequest.verify|verify} messages.
         * @param message IncrementRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: IIncrementRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an IncrementRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns IncrementRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): IncrementRequest;

        /**
         * Decodes an IncrementRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns IncrementRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): IncrementRequest;

        /**
         * Verifies an IncrementRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an IncrementRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns IncrementRequest
         */
        public static fromObject(object: { [k: string]: any }): IncrementRequest;

        /**
         * Creates a plain object from an IncrementRequest message. Also converts values to other types if specified.
         * @param message IncrementRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: IncrementRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this IncrementRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of an IncrementResponse. */
    interface IIncrementResponse {

        /** IncrementResponse val */
        val: number;
    }

    /** Represents an IncrementResponse. */
    class IncrementResponse implements IIncrementResponse {

        /**
         * Constructs a new IncrementResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: IIncrementResponse);

        /** IncrementResponse val. */
        public val: number;

        /**
         * Creates a new IncrementResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns IncrementResponse instance
         */
        public static create(properties?: IIncrementResponse): IncrementResponse;

        /**
         * Encodes the specified IncrementResponse message. Does not implicitly {@link IncrementResponse.verify|verify} messages.
         * @param message IncrementResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: IIncrementResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified IncrementResponse message, length delimited. Does not implicitly {@link IncrementResponse.verify|verify} messages.
         * @param message IncrementResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: IIncrementResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an IncrementResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns IncrementResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): IncrementResponse;

        /**
         * Decodes an IncrementResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns IncrementResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): IncrementResponse;

        /**
         * Verifies an IncrementResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an IncrementResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns IncrementResponse
         */
        public static fromObject(object: { [k: string]: any }): IncrementResponse;

        /**
         * Creates a plain object from an IncrementResponse message. Also converts values to other types if specified.
         * @param message IncrementResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: IncrementResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this IncrementResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a ConcatRequest. */
    interface IConcatRequest {

        /** ConcatRequest val */
        val: string;

        /** ConcatRequest add */
        add?: (string|null);
    }

    /** Represents a ConcatRequest. */
    class ConcatRequest implements IConcatRequest {

        /**
         * Constructs a new ConcatRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: IConcatRequest);

        /** ConcatRequest val. */
        public val: string;

        /** ConcatRequest add. */
        public add: string;

        /**
         * Creates a new ConcatRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ConcatRequest instance
         */
        public static create(properties?: IConcatRequest): ConcatRequest;

        /**
         * Encodes the specified ConcatRequest message. Does not implicitly {@link ConcatRequest.verify|verify} messages.
         * @param message ConcatRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: IConcatRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ConcatRequest message, length delimited. Does not implicitly {@link ConcatRequest.verify|verify} messages.
         * @param message ConcatRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: IConcatRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ConcatRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ConcatRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ConcatRequest;

        /**
         * Decodes a ConcatRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ConcatRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ConcatRequest;

        /**
         * Verifies a ConcatRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ConcatRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ConcatRequest
         */
        public static fromObject(object: { [k: string]: any }): ConcatRequest;

        /**
         * Creates a plain object from a ConcatRequest message. Also converts values to other types if specified.
         * @param message ConcatRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: ConcatRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ConcatRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }

    /** Properties of a ConcatResponse. */
    interface IConcatResponse {

        /** ConcatResponse val */
        val: string;
    }

    /** Represents a ConcatResponse. */
    class ConcatResponse implements IConcatResponse {

        /**
         * Constructs a new ConcatResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: IConcatResponse);

        /** ConcatResponse val. */
        public val: string;

        /**
         * Creates a new ConcatResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ConcatResponse instance
         */
        public static create(properties?: IConcatResponse): ConcatResponse;

        /**
         * Encodes the specified ConcatResponse message. Does not implicitly {@link ConcatResponse.verify|verify} messages.
         * @param message ConcatResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: IConcatResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ConcatResponse message, length delimited. Does not implicitly {@link ConcatResponse.verify|verify} messages.
         * @param message ConcatResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: IConcatResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ConcatResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ConcatResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ConcatResponse;

        /**
         * Decodes a ConcatResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ConcatResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ConcatResponse;

        /**
         * Verifies a ConcatResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ConcatResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ConcatResponse
         */
        public static fromObject(object: { [k: string]: any }): ConcatResponse;

        /**
         * Creates a plain object from a ConcatResponse message. Also converts values to other types if specified.
         * @param message ConcatResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: ConcatResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ConcatResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };
    }
}
