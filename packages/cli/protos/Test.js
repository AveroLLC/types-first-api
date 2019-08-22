/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.TestService = (function() {

    /**
     * Constructs a new TestService service.
     * @exports TestService
     * @classdesc Represents a TestService
     * @extends $protobuf.rpc.Service
     * @constructor
     * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
     * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
     * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
     */
    function TestService(rpcImpl, requestDelimited, responseDelimited) {
        $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
    }

    (TestService.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = TestService;

    /**
     * Creates new TestService service using the specified rpc implementation.
     * @function create
     * @memberof TestService
     * @static
     * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
     * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
     * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
     * @returns {TestService} RPC service. Useful where requests and/or responses are streamed.
     */
    TestService.create = function create(rpcImpl, requestDelimited, responseDelimited) {
        return new this(rpcImpl, requestDelimited, responseDelimited);
    };

    /**
     * Callback as used by {@link TestService#increment}.
     * @memberof TestService
     * @typedef incrementCallback
     * @type {function}
     * @param {Error|null} error Error, if any
     * @param {IncrementResponse} [response] IncrementResponse
     */

    /**
     * Calls increment.
     * @function increment
     * @memberof TestService
     * @instance
     * @param {IIncrementRequest} request IncrementRequest message or plain object
     * @param {TestService.incrementCallback} callback Node-style callback called with the error, if any, and IncrementResponse
     * @returns {undefined}
     * @variation 1
     */
    Object.defineProperty(TestService.prototype.increment = function increment(request, callback) {
        return this.rpcCall(increment, $root.IncrementRequest, $root.IncrementResponse, request, callback);
    }, "name", { value: "increment" });

    /**
     * Calls increment.
     * @function increment
     * @memberof TestService
     * @instance
     * @param {IIncrementRequest} request IncrementRequest message or plain object
     * @returns {Promise<IncrementResponse>} Promise
     * @variation 2
     */

    /**
     * Callback as used by {@link TestService#concat}.
     * @memberof TestService
     * @typedef concatCallback
     * @type {function}
     * @param {Error|null} error Error, if any
     * @param {ConcatResponse} [response] ConcatResponse
     */

    /**
     * Calls concat.
     * @function concat
     * @memberof TestService
     * @instance
     * @param {IConcatRequest} request ConcatRequest message or plain object
     * @param {TestService.concatCallback} callback Node-style callback called with the error, if any, and ConcatResponse
     * @returns {undefined}
     * @variation 1
     */
    Object.defineProperty(TestService.prototype.concat = function concat(request, callback) {
        return this.rpcCall(concat, $root.ConcatRequest, $root.ConcatResponse, request, callback);
    }, "name", { value: "concat" });

    /**
     * Calls concat.
     * @function concat
     * @memberof TestService
     * @instance
     * @param {IConcatRequest} request ConcatRequest message or plain object
     * @returns {Promise<ConcatResponse>} Promise
     * @variation 2
     */

    return TestService;
})();

$root.IncrementRequest = (function() {

    /**
     * Properties of an IncrementRequest.
     * @exports IIncrementRequest
     * @interface IIncrementRequest
     * @property {number} val IncrementRequest val
     * @property {number|null} [add] IncrementRequest add
     */

    /**
     * Constructs a new IncrementRequest.
     * @exports IncrementRequest
     * @classdesc Represents an IncrementRequest.
     * @implements IIncrementRequest
     * @constructor
     * @param {IIncrementRequest=} [properties] Properties to set
     */
    function IncrementRequest(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * IncrementRequest val.
     * @member {number} val
     * @memberof IncrementRequest
     * @instance
     */
    IncrementRequest.prototype.val = 0;

    /**
     * IncrementRequest add.
     * @member {number} add
     * @memberof IncrementRequest
     * @instance
     */
    IncrementRequest.prototype.add = 0;

    /**
     * Creates a new IncrementRequest instance using the specified properties.
     * @function create
     * @memberof IncrementRequest
     * @static
     * @param {IIncrementRequest=} [properties] Properties to set
     * @returns {IncrementRequest} IncrementRequest instance
     */
    IncrementRequest.create = function create(properties) {
        return new IncrementRequest(properties);
    };

    /**
     * Encodes the specified IncrementRequest message. Does not implicitly {@link IncrementRequest.verify|verify} messages.
     * @function encode
     * @memberof IncrementRequest
     * @static
     * @param {IIncrementRequest} message IncrementRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    IncrementRequest.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.val);
        if (message.add != null && message.hasOwnProperty("add"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.add);
        return writer;
    };

    /**
     * Encodes the specified IncrementRequest message, length delimited. Does not implicitly {@link IncrementRequest.verify|verify} messages.
     * @function encodeDelimited
     * @memberof IncrementRequest
     * @static
     * @param {IIncrementRequest} message IncrementRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    IncrementRequest.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an IncrementRequest message from the specified reader or buffer.
     * @function decode
     * @memberof IncrementRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {IncrementRequest} IncrementRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    IncrementRequest.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.IncrementRequest();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.val = reader.int32();
                break;
            case 2:
                message.add = reader.int32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("val"))
            throw $util.ProtocolError("missing required 'val'", { instance: message });
        return message;
    };

    /**
     * Decodes an IncrementRequest message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof IncrementRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {IncrementRequest} IncrementRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    IncrementRequest.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an IncrementRequest message.
     * @function verify
     * @memberof IncrementRequest
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    IncrementRequest.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (!$util.isInteger(message.val))
            return "val: integer expected";
        if (message.add != null && message.hasOwnProperty("add"))
            if (!$util.isInteger(message.add))
                return "add: integer expected";
        return null;
    };

    /**
     * Creates an IncrementRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof IncrementRequest
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {IncrementRequest} IncrementRequest
     */
    IncrementRequest.fromObject = function fromObject(object) {
        if (object instanceof $root.IncrementRequest)
            return object;
        var message = new $root.IncrementRequest();
        if (object.val != null)
            message.val = object.val | 0;
        if (object.add != null)
            message.add = object.add | 0;
        return message;
    };

    /**
     * Creates a plain object from an IncrementRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof IncrementRequest
     * @static
     * @param {IncrementRequest} message IncrementRequest
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    IncrementRequest.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.val = 0;
            object.add = 0;
        }
        if (message.val != null && message.hasOwnProperty("val"))
            object.val = message.val;
        if (message.add != null && message.hasOwnProperty("add"))
            object.add = message.add;
        return object;
    };

    /**
     * Converts this IncrementRequest to JSON.
     * @function toJSON
     * @memberof IncrementRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    IncrementRequest.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return IncrementRequest;
})();

$root.IncrementResponse = (function() {

    /**
     * Properties of an IncrementResponse.
     * @exports IIncrementResponse
     * @interface IIncrementResponse
     * @property {number} val IncrementResponse val
     */

    /**
     * Constructs a new IncrementResponse.
     * @exports IncrementResponse
     * @classdesc Represents an IncrementResponse.
     * @implements IIncrementResponse
     * @constructor
     * @param {IIncrementResponse=} [properties] Properties to set
     */
    function IncrementResponse(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * IncrementResponse val.
     * @member {number} val
     * @memberof IncrementResponse
     * @instance
     */
    IncrementResponse.prototype.val = 0;

    /**
     * Creates a new IncrementResponse instance using the specified properties.
     * @function create
     * @memberof IncrementResponse
     * @static
     * @param {IIncrementResponse=} [properties] Properties to set
     * @returns {IncrementResponse} IncrementResponse instance
     */
    IncrementResponse.create = function create(properties) {
        return new IncrementResponse(properties);
    };

    /**
     * Encodes the specified IncrementResponse message. Does not implicitly {@link IncrementResponse.verify|verify} messages.
     * @function encode
     * @memberof IncrementResponse
     * @static
     * @param {IIncrementResponse} message IncrementResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    IncrementResponse.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.val);
        return writer;
    };

    /**
     * Encodes the specified IncrementResponse message, length delimited. Does not implicitly {@link IncrementResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof IncrementResponse
     * @static
     * @param {IIncrementResponse} message IncrementResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    IncrementResponse.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an IncrementResponse message from the specified reader or buffer.
     * @function decode
     * @memberof IncrementResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {IncrementResponse} IncrementResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    IncrementResponse.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.IncrementResponse();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.val = reader.int32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("val"))
            throw $util.ProtocolError("missing required 'val'", { instance: message });
        return message;
    };

    /**
     * Decodes an IncrementResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof IncrementResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {IncrementResponse} IncrementResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    IncrementResponse.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an IncrementResponse message.
     * @function verify
     * @memberof IncrementResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    IncrementResponse.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (!$util.isInteger(message.val))
            return "val: integer expected";
        return null;
    };

    /**
     * Creates an IncrementResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof IncrementResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {IncrementResponse} IncrementResponse
     */
    IncrementResponse.fromObject = function fromObject(object) {
        if (object instanceof $root.IncrementResponse)
            return object;
        var message = new $root.IncrementResponse();
        if (object.val != null)
            message.val = object.val | 0;
        return message;
    };

    /**
     * Creates a plain object from an IncrementResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof IncrementResponse
     * @static
     * @param {IncrementResponse} message IncrementResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    IncrementResponse.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults)
            object.val = 0;
        if (message.val != null && message.hasOwnProperty("val"))
            object.val = message.val;
        return object;
    };

    /**
     * Converts this IncrementResponse to JSON.
     * @function toJSON
     * @memberof IncrementResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    IncrementResponse.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return IncrementResponse;
})();

$root.ConcatRequest = (function() {

    /**
     * Properties of a ConcatRequest.
     * @exports IConcatRequest
     * @interface IConcatRequest
     * @property {string} val ConcatRequest val
     * @property {string|null} [add] ConcatRequest add
     */

    /**
     * Constructs a new ConcatRequest.
     * @exports ConcatRequest
     * @classdesc Represents a ConcatRequest.
     * @implements IConcatRequest
     * @constructor
     * @param {IConcatRequest=} [properties] Properties to set
     */
    function ConcatRequest(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ConcatRequest val.
     * @member {string} val
     * @memberof ConcatRequest
     * @instance
     */
    ConcatRequest.prototype.val = "";

    /**
     * ConcatRequest add.
     * @member {string} add
     * @memberof ConcatRequest
     * @instance
     */
    ConcatRequest.prototype.add = "";

    /**
     * Creates a new ConcatRequest instance using the specified properties.
     * @function create
     * @memberof ConcatRequest
     * @static
     * @param {IConcatRequest=} [properties] Properties to set
     * @returns {ConcatRequest} ConcatRequest instance
     */
    ConcatRequest.create = function create(properties) {
        return new ConcatRequest(properties);
    };

    /**
     * Encodes the specified ConcatRequest message. Does not implicitly {@link ConcatRequest.verify|verify} messages.
     * @function encode
     * @memberof ConcatRequest
     * @static
     * @param {IConcatRequest} message ConcatRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConcatRequest.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 2 =*/10).string(message.val);
        if (message.add != null && message.hasOwnProperty("add"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.add);
        return writer;
    };

    /**
     * Encodes the specified ConcatRequest message, length delimited. Does not implicitly {@link ConcatRequest.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ConcatRequest
     * @static
     * @param {IConcatRequest} message ConcatRequest message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConcatRequest.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ConcatRequest message from the specified reader or buffer.
     * @function decode
     * @memberof ConcatRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ConcatRequest} ConcatRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConcatRequest.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.ConcatRequest();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.val = reader.string();
                break;
            case 2:
                message.add = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("val"))
            throw $util.ProtocolError("missing required 'val'", { instance: message });
        return message;
    };

    /**
     * Decodes a ConcatRequest message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ConcatRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ConcatRequest} ConcatRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConcatRequest.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ConcatRequest message.
     * @function verify
     * @memberof ConcatRequest
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ConcatRequest.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (!$util.isString(message.val))
            return "val: string expected";
        if (message.add != null && message.hasOwnProperty("add"))
            if (!$util.isString(message.add))
                return "add: string expected";
        return null;
    };

    /**
     * Creates a ConcatRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ConcatRequest
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ConcatRequest} ConcatRequest
     */
    ConcatRequest.fromObject = function fromObject(object) {
        if (object instanceof $root.ConcatRequest)
            return object;
        var message = new $root.ConcatRequest();
        if (object.val != null)
            message.val = String(object.val);
        if (object.add != null)
            message.add = String(object.add);
        return message;
    };

    /**
     * Creates a plain object from a ConcatRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ConcatRequest
     * @static
     * @param {ConcatRequest} message ConcatRequest
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ConcatRequest.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.val = "";
            object.add = "";
        }
        if (message.val != null && message.hasOwnProperty("val"))
            object.val = message.val;
        if (message.add != null && message.hasOwnProperty("add"))
            object.add = message.add;
        return object;
    };

    /**
     * Converts this ConcatRequest to JSON.
     * @function toJSON
     * @memberof ConcatRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ConcatRequest.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ConcatRequest;
})();

$root.ConcatResponse = (function() {

    /**
     * Properties of a ConcatResponse.
     * @exports IConcatResponse
     * @interface IConcatResponse
     * @property {string} val ConcatResponse val
     */

    /**
     * Constructs a new ConcatResponse.
     * @exports ConcatResponse
     * @classdesc Represents a ConcatResponse.
     * @implements IConcatResponse
     * @constructor
     * @param {IConcatResponse=} [properties] Properties to set
     */
    function ConcatResponse(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ConcatResponse val.
     * @member {string} val
     * @memberof ConcatResponse
     * @instance
     */
    ConcatResponse.prototype.val = "";

    /**
     * Creates a new ConcatResponse instance using the specified properties.
     * @function create
     * @memberof ConcatResponse
     * @static
     * @param {IConcatResponse=} [properties] Properties to set
     * @returns {ConcatResponse} ConcatResponse instance
     */
    ConcatResponse.create = function create(properties) {
        return new ConcatResponse(properties);
    };

    /**
     * Encodes the specified ConcatResponse message. Does not implicitly {@link ConcatResponse.verify|verify} messages.
     * @function encode
     * @memberof ConcatResponse
     * @static
     * @param {IConcatResponse} message ConcatResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConcatResponse.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 2 =*/10).string(message.val);
        return writer;
    };

    /**
     * Encodes the specified ConcatResponse message, length delimited. Does not implicitly {@link ConcatResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ConcatResponse
     * @static
     * @param {IConcatResponse} message ConcatResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConcatResponse.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ConcatResponse message from the specified reader or buffer.
     * @function decode
     * @memberof ConcatResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ConcatResponse} ConcatResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConcatResponse.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.ConcatResponse();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.val = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("val"))
            throw $util.ProtocolError("missing required 'val'", { instance: message });
        return message;
    };

    /**
     * Decodes a ConcatResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ConcatResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ConcatResponse} ConcatResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConcatResponse.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ConcatResponse message.
     * @function verify
     * @memberof ConcatResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ConcatResponse.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (!$util.isString(message.val))
            return "val: string expected";
        return null;
    };

    /**
     * Creates a ConcatResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ConcatResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ConcatResponse} ConcatResponse
     */
    ConcatResponse.fromObject = function fromObject(object) {
        if (object instanceof $root.ConcatResponse)
            return object;
        var message = new $root.ConcatResponse();
        if (object.val != null)
            message.val = String(object.val);
        return message;
    };

    /**
     * Creates a plain object from a ConcatResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ConcatResponse
     * @static
     * @param {ConcatResponse} message ConcatResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ConcatResponse.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults)
            object.val = "";
        if (message.val != null && message.hasOwnProperty("val"))
            object.val = message.val;
        return object;
    };

    /**
     * Converts this ConcatResponse to JSON.
     * @function toJSON
     * @memberof ConcatResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ConcatResponse.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ConcatResponse;
})();

module.exports = $root;
