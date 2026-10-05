"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ../../node_modules/zod/v3/external.js
  var external_exports = {};
  __export(external_exports, {
    BRAND: () => BRAND,
    DIRTY: () => DIRTY,
    EMPTY_PATH: () => EMPTY_PATH,
    INVALID: () => INVALID,
    NEVER: () => NEVER,
    OK: () => OK,
    ParseStatus: () => ParseStatus,
    Schema: () => ZodType,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBigInt: () => ZodBigInt,
    ZodBoolean: () => ZodBoolean,
    ZodBranded: () => ZodBranded,
    ZodCatch: () => ZodCatch,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodEffects: () => ZodEffects,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNativeEnum: () => ZodNativeEnum,
    ZodNever: () => ZodNever,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodParsedType: () => ZodParsedType,
    ZodPipeline: () => ZodPipeline,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRecord: () => ZodRecord,
    ZodSchema: () => ZodType,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodSymbol: () => ZodSymbol,
    ZodTransformer: () => ZodEffects,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    addIssueToContext: () => addIssueToContext,
    any: () => anyType,
    array: () => arrayType,
    bigint: () => bigIntType,
    boolean: () => booleanType,
    coerce: () => coerce,
    custom: () => custom,
    date: () => dateType,
    datetimeRegex: () => datetimeRegex,
    defaultErrorMap: () => en_default,
    discriminatedUnion: () => discriminatedUnionType,
    effect: () => effectsType,
    enum: () => enumType,
    function: () => functionType,
    getErrorMap: () => getErrorMap,
    getParsedType: () => getParsedType,
    instanceof: () => instanceOfType,
    intersection: () => intersectionType,
    isAborted: () => isAborted,
    isAsync: () => isAsync,
    isDirty: () => isDirty,
    isValid: () => isValid,
    late: () => late,
    lazy: () => lazyType,
    literal: () => literalType,
    makeIssue: () => makeIssue,
    map: () => mapType,
    nan: () => nanType,
    nativeEnum: () => nativeEnumType,
    never: () => neverType,
    null: () => nullType,
    nullable: () => nullableType,
    number: () => numberType,
    object: () => objectType,
    objectUtil: () => objectUtil,
    oboolean: () => oboolean,
    onumber: () => onumber,
    optional: () => optionalType,
    ostring: () => ostring,
    pipeline: () => pipelineType,
    preprocess: () => preprocessType,
    promise: () => promiseType,
    quotelessJson: () => quotelessJson,
    record: () => recordType,
    set: () => setType,
    setErrorMap: () => setErrorMap,
    strictObject: () => strictObjectType,
    string: () => stringType,
    symbol: () => symbolType,
    transformer: () => effectsType,
    tuple: () => tupleType,
    undefined: () => undefinedType,
    union: () => unionType,
    unknown: () => unknownType,
    util: () => util,
    void: () => voidType
  });

  // ../../node_modules/zod/v3/helpers/util.js
  var util;
  (function(util2) {
    util2.assertEqual = (_) => {
    };
    function assertIs(_arg) {
    }
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error();
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items) => {
      const obj = {};
      for (const item of items) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
      const filtered = {};
      for (const k of validKeys) {
        filtered[k] = obj[k];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e) {
        return obj[e];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
      const keys = [];
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return void 0;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  var objectUtil;
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
        // second overwrites first
      };
    };
  })(objectUtil || (objectUtil = {}));
  var ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  var getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "undefined":
        return ZodParsedType.undefined;
      case "string":
        return ZodParsedType.string;
      case "number":
        return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
      case "boolean":
        return ZodParsedType.boolean;
      case "function":
        return ZodParsedType.function;
      case "bigint":
        return ZodParsedType.bigint;
      case "symbol":
        return ZodParsedType.symbol;
      case "object":
        if (Array.isArray(data)) {
          return ZodParsedType.array;
        }
        if (data === null) {
          return ZodParsedType.null;
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return ZodParsedType.promise;
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return ZodParsedType.map;
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return ZodParsedType.set;
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return ZodParsedType.date;
        }
        return ZodParsedType.object;
      default:
        return ZodParsedType.unknown;
    }
  };

  // ../../node_modules/zod/v3/ZodError.js
  var ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  var quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
  };
  var ZodError = class _ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue) {
        return issue.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue of error.issues) {
          if (issue.code === "invalid_union") {
            issue.unionErrors.map(processError);
          } else if (issue.code === "invalid_return_type") {
            processError(issue.returnTypeError);
          } else if (issue.code === "invalid_arguments") {
            processError(issue.argumentsError);
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < issue.path.length) {
              const el = issue.path[i];
              const terminal = i === issue.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue));
              }
              curr = curr[el];
              i++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof _ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };

  // ../../node_modules/zod/v3/locales/en.js
  var errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        if (issue.received === ZodParsedType.undefined) {
          message = "Required";
        } else {
          message = `Expected ${issue.expected}, received ${issue.received}`;
        }
        break;
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
        break;
      case ZodIssueCode.invalid_union:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments`;
        break;
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type`;
        break;
      case ZodIssueCode.invalid_date:
        message = `Invalid date`;
        break;
      case ZodIssueCode.invalid_string:
        if (typeof issue.validation === "object") {
          if ("includes" in issue.validation) {
            message = `Invalid input: must include "${issue.validation.includes}"`;
            if (typeof issue.validation.position === "number") {
              message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
            }
          } else if ("startsWith" in issue.validation) {
            message = `Invalid input: must start with "${issue.validation.startsWith}"`;
          } else if ("endsWith" in issue.validation) {
            message = `Invalid input: must end with "${issue.validation.endsWith}"`;
          } else {
            util.assertNever(issue.validation);
          }
        } else if (issue.validation !== "regex") {
          message = `Invalid ${issue.validation}`;
        } else {
          message = "Invalid";
        }
        break;
      case ZodIssueCode.too_small:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "bigint")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.too_big:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "bigint")
          message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.custom:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection results could not be merged`;
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue.multipleOf}`;
        break;
      case ZodIssueCode.not_finite:
        message = "Number must be finite";
        break;
      default:
        message = _ctx.defaultError;
        util.assertNever(issue);
    }
    return { message };
  };
  var en_default = errorMap;

  // ../../node_modules/zod/v3/errors.js
  var overrideErrorMap = en_default;
  function setErrorMap(map) {
    overrideErrorMap = map;
  }
  function getErrorMap() {
    return overrideErrorMap;
  }

  // ../../node_modules/zod/v3/helpers/parseUtil.js
  var makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...issueData.path || []];
    const fullIssue = {
      ...issueData,
      path: fullPath
    };
    if (issueData.message !== void 0) {
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      };
    }
    let errorMessage = "";
    const maps = errorMaps.filter((m) => !!m).slice().reverse();
    for (const map of maps) {
      errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    };
  };
  var EMPTY_PATH = [];
  function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
      issueData,
      data: ctx.data,
      path: ctx.path,
      errorMaps: [
        ctx.common.contextualErrorMap,
        // contextual error map is first priority
        ctx.schemaErrorMap,
        // then schema-bound map if available
        overrideMap,
        // then global override map
        overrideMap === en_default ? void 0 : en_default
        // then global default map
      ].filter((x) => !!x)
    });
    ctx.common.issues.push(issue);
  }
  var ParseStatus = class _ParseStatus {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      if (this.value === "valid")
        this.value = "dirty";
    }
    abort() {
      if (this.value !== "aborted")
        this.value = "aborted";
    }
    static mergeArray(status, results) {
      const arrayValue = [];
      for (const s of results) {
        if (s.status === "aborted")
          return INVALID;
        if (s.status === "dirty")
          status.dirty();
        arrayValue.push(s.value);
      }
      return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
      const syncPairs = [];
      for (const pair of pairs) {
        const key = await pair.key;
        const value = await pair.value;
        syncPairs.push({
          key,
          value
        });
      }
      return _ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
      const finalObject = {};
      for (const pair of pairs) {
        const { key, value } = pair;
        if (key.status === "aborted")
          return INVALID;
        if (value.status === "aborted")
          return INVALID;
        if (key.status === "dirty")
          status.dirty();
        if (value.status === "dirty")
          status.dirty();
        if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
          finalObject[key.value] = value.value;
        }
      }
      return { status: status.value, value: finalObject };
    }
  };
  var INVALID = Object.freeze({
    status: "aborted"
  });
  var DIRTY = (value) => ({ status: "dirty", value });
  var OK = (value) => ({ status: "valid", value });
  var isAborted = (x) => x.status === "aborted";
  var isDirty = (x) => x.status === "dirty";
  var isValid = (x) => x.status === "valid";
  var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

  // ../../node_modules/zod/v3/helpers/errorUtil.js
  var errorUtil;
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));

  // ../../node_modules/zod/v3/types.js
  var ParseInputLazyPath = class {
    constructor(parent, value, path, key) {
      this._cachedPath = [];
      this.parent = parent;
      this.data = value;
      this._path = path;
      this._key = key;
    }
    get path() {
      if (!this._cachedPath.length) {
        if (Array.isArray(this._key)) {
          this._cachedPath.push(...this._path, ...this._key);
        } else {
          this._cachedPath.push(...this._path, this._key);
        }
      }
      return this._cachedPath;
    }
  };
  var handleResult = (ctx, result) => {
    if (isValid(result)) {
      return { success: true, data: result.value };
    } else {
      if (!ctx.common.issues.length) {
        throw new Error("Validation failed but no issues detected.");
      }
      return {
        success: false,
        get error() {
          if (this._error)
            return this._error;
          const error = new ZodError(ctx.common.issues);
          this._error = error;
          return this._error;
        }
      };
    }
  };
  function processCreateParams(params) {
    if (!params)
      return {};
    const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap2)
      return { errorMap: errorMap2, description };
    const customMap = (iss, ctx) => {
      const { message } = params;
      if (iss.code === "invalid_enum_value") {
        return { message: message ?? ctx.defaultError };
      }
      if (typeof ctx.data === "undefined") {
        return { message: message ?? required_error ?? ctx.defaultError };
      }
      if (iss.code !== "invalid_type")
        return { message: ctx.defaultError };
      return { message: message ?? invalid_type_error ?? ctx.defaultError };
    };
    return { errorMap: customMap, description };
  }
  var ZodType = class {
    get description() {
      return this._def.description;
    }
    _getType(input) {
      return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
      return ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      };
    }
    _processInputParams(input) {
      return {
        status: new ParseStatus(),
        ctx: {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      };
    }
    _parseSync(input) {
      const result = this._parse(input);
      if (isAsync(result)) {
        throw new Error("Synchronous parse encountered promise.");
      }
      return result;
    }
    _parseAsync(input) {
      const result = this._parse(input);
      return Promise.resolve(result);
    }
    parse(data, params) {
      const result = this.safeParse(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    safeParse(data, params) {
      const ctx = {
        common: {
          issues: [],
          async: params?.async ?? false,
          contextualErrorMap: params?.errorMap
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      const ctx = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      if (!this["~standard"].async) {
        try {
          const result = this._parseSync({ data, path: [], parent: ctx });
          return isValid(result) ? {
            value: result.value
          } : {
            issues: ctx.common.issues
          };
        } catch (err) {
          if (err?.message?.toLowerCase()?.includes("encountered")) {
            this["~standard"].async = true;
          }
          ctx.common = {
            issues: [],
            async: true
          };
        }
      }
      return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
        value: result.value
      } : {
        issues: ctx.common.issues
      });
    }
    async parseAsync(data, params) {
      const result = await this.safeParseAsync(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    async safeParseAsync(data, params) {
      const ctx = {
        common: {
          issues: [],
          contextualErrorMap: params?.errorMap,
          async: true
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
      const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
      return handleResult(ctx, result);
    }
    refine(check, message) {
      const getIssueProperties = (val) => {
        if (typeof message === "string" || typeof message === "undefined") {
          return { message };
        } else if (typeof message === "function") {
          return message(val);
        } else {
          return message;
        }
      };
      return this._refinement((val, ctx) => {
        const result = check(val);
        const setError = () => ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val)
        });
        if (typeof Promise !== "undefined" && result instanceof Promise) {
          return result.then((data) => {
            if (!data) {
              setError();
              return false;
            } else {
              return true;
            }
          });
        }
        if (!result) {
          setError();
          return false;
        } else {
          return true;
        }
      });
    }
    refinement(check, refinementData) {
      return this._refinement((val, ctx) => {
        if (!check(val)) {
          ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
          return false;
        } else {
          return true;
        }
      });
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "refinement", refinement }
      });
    }
    superRefine(refinement) {
      return this._refinement(refinement);
    }
    constructor(def) {
      this.spa = this.safeParseAsync;
      this._def = def;
      this.parse = this.parse.bind(this);
      this.safeParse = this.safeParse.bind(this);
      this.parseAsync = this.parseAsync.bind(this);
      this.safeParseAsync = this.safeParseAsync.bind(this);
      this.spa = this.spa.bind(this);
      this.refine = this.refine.bind(this);
      this.refinement = this.refinement.bind(this);
      this.superRefine = this.superRefine.bind(this);
      this.optional = this.optional.bind(this);
      this.nullable = this.nullable.bind(this);
      this.nullish = this.nullish.bind(this);
      this.array = this.array.bind(this);
      this.promise = this.promise.bind(this);
      this.or = this.or.bind(this);
      this.and = this.and.bind(this);
      this.transform = this.transform.bind(this);
      this.brand = this.brand.bind(this);
      this.default = this.default.bind(this);
      this.catch = this.catch.bind(this);
      this.describe = this.describe.bind(this);
      this.pipe = this.pipe.bind(this);
      this.readonly = this.readonly.bind(this);
      this.isNullable = this.isNullable.bind(this);
      this.isOptional = this.isOptional.bind(this);
      this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (data) => this["~validate"](data)
      };
    }
    optional() {
      return ZodOptional.create(this, this._def);
    }
    nullable() {
      return ZodNullable.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return ZodArray.create(this);
    }
    promise() {
      return ZodPromise.create(this, this._def);
    }
    or(option) {
      return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
      return new ZodEffects({
        ...processCreateParams(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "transform", transform }
      });
    }
    default(def) {
      const defaultValueFunc = typeof def === "function" ? def : () => def;
      return new ZodDefault({
        ...processCreateParams(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      });
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams(this._def)
      });
    }
    catch(def) {
      const catchValueFunc = typeof def === "function" ? def : () => def;
      return new ZodCatch({
        ...processCreateParams(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      });
    }
    describe(description) {
      const This = this.constructor;
      return new This({
        ...this._def,
        description
      });
    }
    pipe(target) {
      return ZodPipeline.create(this, target);
    }
    readonly() {
      return ZodReadonly.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  var cuidRegex = /^c[^\s-]{8,}$/i;
  var cuid2Regex = /^[0-9a-z]+$/;
  var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  var nanoidRegex = /^[a-z0-9_-]{21}$/i;
  var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  var emojiRegex;
  var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
  var dateRegex = new RegExp(`^${dateRegexSource}$`);
  function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`;
    if (args.precision) {
      secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
    } else if (args.precision == null) {
      secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
    }
    const secondsQuantifier = args.precision ? "+" : "?";
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
  }
  function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
      opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
  }
  function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
      return false;
    try {
      const [header] = jwt.split(".");
      if (!header)
        return false;
      const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
      const decoded = JSON.parse(atob(base64));
      if (typeof decoded !== "object" || decoded === null)
        return false;
      if ("typ" in decoded && decoded?.typ !== "JWT")
        return false;
      if (!decoded.alg)
        return false;
      if (alg && decoded.alg !== alg)
        return false;
      return true;
    } catch {
      return false;
    }
  }
  function isValidCidr(ip, version) {
    if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
      return true;
    }
    return false;
  }
  var ZodString = class _ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          const tooBig = input.data.length > check.value;
          const tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            }
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) {
            emojiRegex = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          const testResult = check.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "trim") {
          input.data = input.data.trim();
        } else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          const regex = datetimeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          const regex = timeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxLength() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var ZodNumber = class _ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodBigInt = class _ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  var ZodBoolean = class extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodDate = class _ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new _ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max != null ? new Date(max) : null;
    }
  };
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  var ZodSymbol = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  var ZodUndefined = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  var ZodNull = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  var ZodAny = class extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  var ZodUnknown = class extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  var ZodNever = class extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  };
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  var ZodVoid = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  var ZodArray = class _ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : void 0,
            maximum: tooBig ? def.exactLength.value : void 0,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        })).then((result2) => {
          return ParseStatus.mergeArray(status, result2);
        });
      }
      const result = [...ctx.data].map((item, i) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      });
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new _ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new _ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new _ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      const newShape = {};
      for (const key in schema.shape) {
        const fieldSchema = schema.shape[key];
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      });
    } else if (schema instanceof ZodArray) {
      return new ZodArray({
        ...schema._def,
        type: deepPartialify(schema.element)
      });
    } else if (schema instanceof ZodOptional) {
      return ZodOptional.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodNullable) {
      return ZodNullable.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodTuple) {
      return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    } else {
      return schema;
    }
  }
  var ZodObject = class _ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") {
        } else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== void 0 ? {
          errorMap: (issue, ctx) => {
            const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            if (issue.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
      return new _ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
      const merged = new _ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
      return new _ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  var ZodUnion = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === "valid") {
            return result.result;
          }
        }
        for (const result of results) {
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = void 0;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid") {
            return result;
          } else if (result.status === "dirty" && !dirty) {
            dirty = { result, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => {
    return new ZodUnion({
      options: types,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  var getDiscriminator = (type) => {
    if (type instanceof ZodLazy) {
      return getDiscriminator(type.schema);
    } else if (type instanceof ZodEffects) {
      return getDiscriminator(type.innerType());
    } else if (type instanceof ZodLiteral) {
      return [type.value];
    } else if (type instanceof ZodEnum) {
      return type.options;
    } else if (type instanceof ZodNativeEnum) {
      return util.objectValues(type.enum);
    } else if (type instanceof ZodDefault) {
      return getDiscriminator(type._def.innerType);
    } else if (type instanceof ZodUndefined) {
      return [void 0];
    } else if (type instanceof ZodNull) {
      return [null];
    } else if (type instanceof ZodOptional) {
      return [void 0, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodNullable) {
      return [null, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodBranded) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodReadonly) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodCatch) {
      return getDiscriminator(type._def.innerType);
    } else {
      return [];
    }
  };
  var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator = this.discriminator;
      const discriminatorValue = ctx.data[discriminator];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
      const optionsMap = /* @__PURE__ */ new Map();
      for (const type of options) {
        const discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type);
        }
      }
      return new _ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
      return { valid: true, data: a };
    } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      const bKeys = util.objectKeys(b);
      const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a.length !== b.length) {
        return { valid: false };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
      return { valid: true, data: a };
    } else {
      return { valid: false };
    }
  }
  var ZodIntersection = class extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left, right]) => handleParsed(left, right));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  };
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  var ZodTuple = class _ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x) => !!x);
      if (ctx.common.async) {
        return Promise.all(items).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new _ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  var ZodRecord = class _ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new _ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new _ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  };
  var ZodMap = class extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = /* @__PURE__ */ new Map();
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  var ZodSet = class _ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = /* @__PURE__ */ new Set();
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new _ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new _ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  var ZodFunction = class _ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          const result = await Reflect.apply(fn, this, parsedArgs);
          const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me = this;
        return OK(function(...args) {
          const parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result = Reflect.apply(fn, this, parsedArgs.data);
          const parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new _ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new _ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new _ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  };
  var ZodLazy = class extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  var ZodLiteral = class extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams(params)
    });
  }
  var ZodEnum = class _ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return _ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  var ZodNativeEnum = class extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  var ZodPromise = class extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  };
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  var ZodEffects = class extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        const processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        }
      }
      if (effect.type === "refinement") {
        const executeRefinement = (acc) => {
          const result = effect.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result);
          }
          if (result instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }));
          });
        }
      }
      util.assertNever(effect);
    }
  };
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  var ZodOptional = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(void 0);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => {
    return new ZodOptional({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  var ZodNullable = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => {
    return new ZodNullable({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  var ZodDefault = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => {
    return new ZodDefault({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  var ZodCatch = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: "valid",
            value: result2.status === "valid" ? result2.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result.status === "valid" ? result.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => {
    return new ZodCatch({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  var ZodNaN = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  var BRAND = /* @__PURE__ */ Symbol("zod_brand");
  var ZodBranded = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  var ZodPipeline = class _ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a, b) {
      return new _ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  };
  var ZodReadonly = class extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  function cleanParams(params, data) {
    const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
    const p2 = typeof p === "string" ? { message: p } : p;
    return p2;
  }
  function custom(check, _params = {}, fatal) {
    if (check)
      return ZodAny.create().superRefine((data, ctx) => {
        const r = check(data);
        if (r instanceof Promise) {
          return r.then((r2) => {
            if (!r2) {
              const params = cleanParams(_params, data);
              const _fatal = params.fatal ?? fatal ?? true;
              ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
            }
          });
        }
        if (!r) {
          const params = cleanParams(_params, data);
          const _fatal = params.fatal ?? fatal ?? true;
          ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
        }
        return;
      });
    return ZodAny.create();
  }
  var late = {
    object: ZodObject.lazycreate
  };
  var ZodFirstPartyTypeKind;
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  var instanceOfType = (cls, params = {
    message: `Input not instance of ${cls.name}`
  }) => custom((data) => data instanceof cls, params);
  var stringType = ZodString.create;
  var numberType = ZodNumber.create;
  var nanType = ZodNaN.create;
  var bigIntType = ZodBigInt.create;
  var booleanType = ZodBoolean.create;
  var dateType = ZodDate.create;
  var symbolType = ZodSymbol.create;
  var undefinedType = ZodUndefined.create;
  var nullType = ZodNull.create;
  var anyType = ZodAny.create;
  var unknownType = ZodUnknown.create;
  var neverType = ZodNever.create;
  var voidType = ZodVoid.create;
  var arrayType = ZodArray.create;
  var objectType = ZodObject.create;
  var strictObjectType = ZodObject.strictCreate;
  var unionType = ZodUnion.create;
  var discriminatedUnionType = ZodDiscriminatedUnion.create;
  var intersectionType = ZodIntersection.create;
  var tupleType = ZodTuple.create;
  var recordType = ZodRecord.create;
  var mapType = ZodMap.create;
  var setType = ZodSet.create;
  var functionType = ZodFunction.create;
  var lazyType = ZodLazy.create;
  var literalType = ZodLiteral.create;
  var enumType = ZodEnum.create;
  var nativeEnumType = ZodNativeEnum.create;
  var promiseType = ZodPromise.create;
  var effectsType = ZodEffects.create;
  var optionalType = ZodOptional.create;
  var nullableType = ZodNullable.create;
  var preprocessType = ZodEffects.createWithPreprocess;
  var pipelineType = ZodPipeline.create;
  var ostring = () => stringType().optional();
  var onumber = () => numberType().optional();
  var oboolean = () => booleanType().optional();
  var coerce = {
    string: ((arg) => ZodString.create({ ...arg, coerce: true })),
    number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
    boolean: ((arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    })),
    bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
    date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
  };
  var NEVER = INVALID;

  // ../../packages/opponent-db/dist/observations.js
  var PlayerIdentitySchema = external_exports.object({
    kind: external_exports.enum(["player_id", "display_name"]),
    scope: external_exports.string().min(1).max(500),
    value: external_exports.string().min(1).max(150)
  });
  var ProfileLookupSchema = external_exports.object({ identity: PlayerIdentitySchema, displayName: external_exports.string().min(1).max(150) });
  var metricNames = ["vpip", "pfr", "threeBet", "foldToThreeBet", "cBet", "foldToCBet", "wtsd", "wsd"];
  var nullableFlag = external_exports.boolean().nullable();
  var HandObservationSchema = external_exports.object({
    handId: external_exports.string().min(1).max(150),
    identity: PlayerIdentitySchema,
    displayName: external_exports.string().min(1).max(150),
    coverage: external_exports.enum(["partial", "complete"]),
    metrics: external_exports.object({ vpip: nullableFlag, pfr: nullableFlag, threeBet: nullableFlag, foldToThreeBet: nullableFlag, cBet: nullableFlag, foldToCBet: nullableFlag, wtsd: nullableFlag, wsd: nullableFlag }),
    aggression: external_exports.object({ betsAndRaises: external_exports.number().int().nonnegative().max(1e3), calls: external_exports.number().int().nonnegative().max(1e3) }).nullable(),
    actions: external_exports.array(external_exports.object({ seat: external_exports.number().int().positive(), street: external_exports.enum(["preflop", "flop", "turn", "river"]), action: external_exports.enum(["post_blind", "check", "call", "bet", "raise", "fold", "all-in"]), observation: external_exports.number().int().nonnegative(), wagerAction: external_exports.enum(["call", "bet", "raise"]).nullable().optional() })).max(1e3),
    observedActions: external_exports.number().int().nonnegative().max(1e3),
    notes: external_exports.array(external_exports.string().max(500)).max(100)
  }).superRefine((value, ctx) => {
    if (value.coverage === "partial" && (Object.values(value.metrics).some((v) => v !== null) || value.aggression !== null))
      ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: "Partial histories cannot supply unbiased rate denominators" });
  });
  function identityKey(identity2) {
    const valid = PlayerIdentitySchema.parse(identity2);
    return JSON.stringify([valid.kind, valid.scope, valid.value]);
  }
  function summarizeHand(e) {
    const metrics = { vpip: null, pfr: null, threeBet: null, foldToThreeBet: null, cBet: null, foldToCBet: null, wtsd: null, wsd: null };
    const events = e.actions.filter((a) => a.action !== "post_blind");
    const streetOrder = ["preflop", "flop", "turn", "river"];
    const ordered = events.every((a, i) => i === 0 || a.observation > events[i - 1].observation && streetOrder.indexOf(a.street) >= streetOrder.indexOf(events[i - 1].street));
    const complete = e.coverage === "complete" && e.dealtInKnown && ordered && events.every((a) => a.action !== "all-in");
    const own = events.filter((a) => a.seat === e.seat);
    const verb = (a) => a.action === "all-in" ? a.wagerAction : a.action;
    let aggression = null;
    if (complete) {
      const pre = events.filter((a) => a.street === "preflop");
      metrics.vpip = pre.some((a) => a.seat === e.seat && ["call", "raise", "bet"].includes(verb(a) ?? ""));
      metrics.pfr = pre.some((a) => a.seat === e.seat && ["raise", "bet"].includes(verb(a) ?? ""));
      let raises = 0, firstRaiser = null, lastRaiser = null;
      for (const a of pre) {
        const v = verb(a);
        if (a.seat === e.seat && raises === 1 && lastRaiser !== e.seat)
          metrics.threeBet = v === "raise" || v === "bet";
        if (a.seat === e.seat && raises === 2 && firstRaiser === e.seat && lastRaiser !== e.seat)
          metrics.foldToThreeBet = v === "fold";
        if (v === "raise" || v === "bet") {
          raises++;
          firstRaiser ??= a.seat;
          lastRaiser = a.seat;
        }
      }
      let flopAggression = false, cBetFacing = false;
      for (const a of events.filter((a2) => a2.street === "flop")) {
        const v = verb(a);
        if (a.seat === e.seat && lastRaiser === e.seat && !flopAggression && ["check", "bet"].includes(v ?? ""))
          metrics.cBet = v === "bet";
        if (a.seat === e.seat && cBetFacing && lastRaiser !== e.seat && ["fold", "call", "raise"].includes(v ?? ""))
          metrics.foldToCBet = v === "fold";
        if (v === "bet" || v === "raise") {
          cBetFacing = !flopAggression && v === "bet" && a.seat === lastRaiser;
          flopAggression = true;
        }
      }
      metrics.wtsd = e.sawFlop === true ? e.wentToShowdown : null;
      metrics.wsd = e.wentToShowdown === true ? e.wonAtShowdown : null;
      const post = own.filter((a) => a.street !== "preflop");
      aggression = { betsAndRaises: post.filter((a) => ["bet", "raise"].includes(verb(a) ?? "")).length, calls: post.filter((a) => verb(a) === "call").length };
    }
    return HandObservationSchema.parse({
      handId: e.handId,
      identity: e.identity,
      displayName: e.displayName,
      coverage: complete ? "complete" : "partial",
      metrics,
      aggression,
      observedActions: own.length,
      actions: own,
      notes: [...e.notes ?? [], ...!complete ? ["Partial observation window; rate denominators and missed actions remain unknown."] : []]
    });
  }

  // ../../packages/opponent-db/dist/types.js
  var CONFIDENCE_THRESHOLDS = {
    moderate: 100,
    strong: 1e3
  };
  function getConfidenceLevel(handsObserved) {
    if (handsObserved >= CONFIDENCE_THRESHOLDS.strong)
      return "strong";
    if (handsObserved >= CONFIDENCE_THRESHOLDS.moderate)
      return "moderate";
    return "low";
  }

  // ../../packages/opponent-db/dist/estimates.js
  var STAT_PRIORS = { vpip: 0.25, pfr: 0.18, threeBet: 0.07, foldToThreeBet: 0.5, cBet: 0.55, foldToCBet: 0.45, wtsd: 0.28, wsd: 0.5, aggression: 0.6 };
  var PRIOR_SAMPLES = 40;
  var RateEstimateSchema = external_exports.object({ estimate: external_exports.number().min(0).max(1), priorMean: external_exports.number().min(0).max(1), priorSamples: external_exports.number().positive(), successes: external_exports.number().int().nonnegative(), samples: external_exports.number().int().nonnegative(), playerWeight: external_exports.number().min(0).max(1), confidence: external_exports.enum(["low", "moderate", "strong"]) });
  function shrinkRate(successes, samples, priorMean) {
    if (!Number.isSafeInteger(samples) || !Number.isSafeInteger(successes) || samples < 0 || successes < 0 || successes > samples || !Number.isFinite(priorMean) || priorMean <= 0 || priorMean >= 1)
      throw new Error("Invalid binomial evidence");
    return { estimate: (successes + priorMean * PRIOR_SAMPLES) / (samples + PRIOR_SAMPLES), priorMean, priorSamples: PRIOR_SAMPLES, successes, samples, playerWeight: samples / (samples + PRIOR_SAMPLES), confidence: getConfidenceLevel(samples) };
  }
  var statsSchema = external_exports.object({ vpip: RateEstimateSchema, pfr: RateEstimateSchema, threeBet: RateEstimateSchema, foldToThreeBet: RateEstimateSchema, cBet: RateEstimateSchema, foldToCBet: RateEstimateSchema, wtsd: RateEstimateSchema, wsd: RateEstimateSchema, aggression: RateEstimateSchema });
  var OpponentProfileSchema = external_exports.object({ identity: PlayerIdentitySchema, displayName: external_exports.string(), handsObserved: external_exports.number().int().nonnegative(), eligibleHands: external_exports.number().int().nonnegative(), confidence: external_exports.enum(["low", "moderate", "strong"]), stats: statsSchema, aggressionFactor: external_exports.number().finite().nonnegative(), notes: external_exports.array(external_exports.string()) });
  function estimateOpponentProfile(identity2, displayName, observations) {
    const hands = [...new Map(observations.filter((h) => identityKey(h.identity) === identityKey(identity2)).map((h) => [h.handId, h])).values()];
    const eligible = hands.filter((h) => h.coverage === "complete");
    const stats = Object.fromEntries(metricNames.map((name) => {
      const values = eligible.map((h) => h.metrics[name]).filter((v) => v !== null);
      return [name, shrinkRate(values.filter(Boolean).length, values.length, STAT_PRIORS[name])];
    }));
    const a = eligible.reduce((sum, h) => sum + (h.aggression?.betsAndRaises ?? 0), 0), c = eligible.reduce((sum, h) => sum + (h.aggression?.calls ?? 0), 0);
    const aggression = shrinkRate(a, a + c, STAT_PRIORS.aggression);
    return { identity: identity2, displayName, handsObserved: hands.length, eligibleHands: eligible.length, confidence: getConfidenceLevel(Math.min(stats.vpip.samples, stats.pfr.samples)), stats: { ...stats, aggression }, aggressionFactor: aggression.estimate / (1 - aggression.estimate), notes: [
      "Rates use (successes + priorMean * 40) / (eligible opportunities + 40). Priors are explicit modeling assumptions, not calibrated population measurements.",
      "handsObserved counts recorded observation windows; only eligible opportunities affect rates. Missing actions never count as false.",
      ...identity2.kind === "display_name" ? ["Identity is scoped table/display name; duplicate names and name reuse can collide, and renames split history."] : []
    ] };
  }

  // src/opponentStats.ts
  function createLiveOpponentClient(relay) {
    let handId = crypto.randomUUID(), lastSync = 0, busy = false;
    let storage = "pending";
    let players = [];
    const pending = /* @__PURE__ */ new Map(), cache = /* @__PURE__ */ new Map();
    let ambiguous = /* @__PURE__ */ new Set();
    const identity2 = (name) => ({ kind: "display_name", scope: location.origin + location.pathname, value: name });
    async function post(route, body) {
      const response = await fetch(relay + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5e3) });
      if (!response.ok) throw new Error("Opponent storage request failed");
      return response.json();
    }
    async function sync() {
      if (busy || Date.now() - lastSync < 1e4) return;
      busy = true;
      lastSync = Date.now();
      try {
        const batch = [...pending.entries()].slice(0, 50);
        if (batch.length) {
          const saved = await post("/opponents/observations", { observations: batch.map(([, value]) => value) });
          if (!saved.available) throw new Error("Opponent storage unavailable");
          for (const [key, value] of batch) if (pending.get(key) === value) pending.delete(key);
        }
        const result = await post("/opponents/profiles", { players });
        if (!result.available) throw new Error("Opponent storage unavailable");
        for (const raw of result.profiles) {
          const profile = OpponentProfileSchema.parse(raw);
          cache.set(identityKey(profile.identity), profile);
        }
        storage = "available";
      } catch {
        storage = "unavailable";
      } finally {
        busy = false;
      }
    }
    return {
      observe(state, history) {
        try {
          if (!state) {
            handId = crypto.randomUUID();
            return;
          }
          if (history.handBoundary) handId = crypto.randomUUID();
          const opponents = state.seats.filter((s) => s.isOccupied && !s.isYou && s.playerName);
          const counts = /* @__PURE__ */ new Map();
          for (const seat of state.seats.filter((s) => s.isOccupied && s.playerName)) counts.set(seat.playerName, 1 + (counts.get(seat.playerName) ?? 0));
          ambiguous = new Set([...counts].filter(([, n]) => n > 1).map(([name]) => name));
          players = opponents.filter((s) => !ambiguous.has(s.playerName)).map((s) => ({ identity: identity2(s.playerName), displayName: s.playerName }));
          for (const seat of opponents) {
            if (ambiguous.has(seat.playerName)) continue;
            const observation = summarizeHand({
              handId,
              identity: identity2(seat.playerName),
              displayName: seat.playerName,
              seat: seat.seatNumber,
              coverage: "partial",
              actions: history.records.get(seat.seatNumber) ?? [],
              dealtInKnown: false,
              sawFlop: null,
              wentToShowdown: null,
              wonAtShowdown: null,
              notes: history.notes
            });
            pending.set(identityKey(observation.identity) + handId, observation);
          }
          while (pending.size > 200) pending.delete(pending.keys().next().value);
          if (cache.size > 200) cache.delete(cache.keys().next().value);
          void sync();
        } catch {
          storage = "unavailable";
        }
      },
      profile(name) {
        if (!name || name.length > 150 || identity2(name).scope.length > 500 || ambiguous.has(name)) return null;
        return { playerProfile: storage === "available" ? cache.get(identityKey(identity2(name))) ?? estimateOpponentProfile(identity2(name), name, []) : estimateOpponentProfile(identity2(name), name, []), statsStorage: storage };
      },
      tick() {
        void sync();
      }
    };
  }

  // ../../packages/shared/dist/card.js
  var SUITS = ["s", "h", "d", "c"];
  var RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  var RANK_TO_CHAR = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "T",
    11: "J",
    12: "Q",
    13: "K",
    14: "A"
  };
  function formatCard(card) {
    return `${RANK_TO_CHAR[card.rank]}${card.suit}`;
  }
  function formatCards(cards) {
    return cards.map(formatCard).join(" ");
  }

  // ../../packages/shared/dist/deck.js
  function fullDeck() {
    const cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
    return cards;
  }
  function shuffle(items, rng = Math.random) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
    return items;
  }
  var Deck = class {
    cards;
    constructor(rng = Math.random, exclude = []) {
      const excludeIds = new Set(exclude.map((c) => `${c.rank}${c.suit}`));
      this.cards = shuffle(fullDeck().filter((c) => !excludeIds.has(`${c.rank}${c.suit}`)), rng);
    }
    /** Number of cards remaining. */
    get remaining() {
      return this.cards.length;
    }
    draw() {
      const card = this.cards.pop();
      if (!card)
        throw new Error("Cannot draw from an empty deck");
      return card;
    }
    drawMany(n) {
      const drawn = [];
      for (let i = 0; i < n; i++)
        drawn.push(this.draw());
      return drawn;
    }
  };

  // ../../packages/shared/dist/simulationInput.js
  function validateSimulationInput(known, boardCount, iterations) {
    if (![0, 3, 4, 5].includes(boardCount))
      throw new Error("Invalid board count");
    if (!Number.isSafeInteger(iterations) || iterations < 1)
      throw new Error("Iterations must be a positive integer");
    if (known.some((c) => !Number.isInteger(c.rank) || c.rank < 2 || c.rank > 14 || !["s", "h", "d", "c"].includes(c.suit)))
      throw new Error("Invalid card");
    if (new Set(known.map((c) => `${c.rank}${c.suit}`)).size !== known.length)
      throw new Error("Duplicate known cards");
  }

  // ../../packages/range-engine/dist/handNotation.js
  var RANK_TO_CHAR2 = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "T",
    11: "J",
    12: "Q",
    13: "K",
    14: "A"
  };
  var CHAR_TO_RANK = Object.fromEntries(RANKS.map((r) => [RANK_TO_CHAR2[r], r]));
  function formatHandType(hand) {
    const high = RANK_TO_CHAR2[hand.highRank];
    const low = RANK_TO_CHAR2[hand.lowRank];
    if (hand.highRank === hand.lowRank)
      return `${high}${low}`;
    return `${high}${low}${hand.suited ? "s" : "o"}`;
  }
  function parseHandType(input) {
    const trimmed = input.trim();
    if (trimmed.length === 2) {
      const rank = CHAR_TO_RANK[trimmed[0].toUpperCase()];
      const rank2 = CHAR_TO_RANK[trimmed[1].toUpperCase()];
      if (rank === void 0 || rank2 === void 0 || rank !== rank2) {
        throw new Error(`Invalid hand type "${input}": expected a pocket pair like "77"`);
      }
      return { highRank: rank, lowRank: rank, suited: false };
    }
    if (trimmed.length === 3) {
      const r1 = CHAR_TO_RANK[trimmed[0].toUpperCase()];
      const r2 = CHAR_TO_RANK[trimmed[1].toUpperCase()];
      const suitedChar = trimmed[2].toLowerCase();
      if (r1 === void 0 || r2 === void 0 || r1 === r2) {
        throw new Error(`Invalid hand type "${input}": unrecognized ranks`);
      }
      if (suitedChar !== "s" && suitedChar !== "o") {
        throw new Error(`Invalid hand type "${input}": expected trailing "s" or "o"`);
      }
      const [highRank, lowRank] = r1 > r2 ? [r1, r2] : [r2, r1];
      return { highRank, lowRank, suited: suitedChar === "s" };
    }
    throw new Error(`Invalid hand type "${input}": expected 2 or 3 characters`);
  }
  function allHandTypes() {
    const types = [];
    for (let i = 0; i < RANKS.length; i++) {
      for (let j = i; j < RANKS.length; j++) {
        const highRank = RANKS[j];
        const lowRank = RANKS[i];
        if (highRank === lowRank) {
          types.push({ highRank, lowRank, suited: false });
        } else {
          types.push({ highRank, lowRank, suited: true });
          types.push({ highRank, lowRank, suited: false });
        }
      }
    }
    return types;
  }
  function expandHandType(hand) {
    const combos = [];
    if (hand.highRank === hand.lowRank) {
      for (let i = 0; i < SUITS.length; i++) {
        for (let j = i + 1; j < SUITS.length; j++) {
          combos.push([
            { rank: hand.highRank, suit: SUITS[i] },
            { rank: hand.lowRank, suit: SUITS[j] }
          ]);
        }
      }
      return combos;
    }
    if (hand.suited) {
      for (const suit of SUITS) {
        combos.push([
          { rank: hand.highRank, suit },
          { rank: hand.lowRank, suit }
        ]);
      }
      return combos;
    }
    for (const suitHigh of SUITS) {
      for (const suitLow of SUITS) {
        if (suitHigh === suitLow)
          continue;
        combos.push([
          { rank: hand.highRank, suit: suitHigh },
          { rank: hand.lowRank, suit: suitLow }
        ]);
      }
    }
    return combos;
  }

  // ../../packages/range-engine/dist/range.js
  function rangeFromList(hands) {
    const range = /* @__PURE__ */ new Map();
    for (const h of hands) {
      range.set(formatHandType(parseHandType(h)), 1);
    }
    return range;
  }
  function rangeComboCount(range) {
    let total = 0;
    for (const [handStr, weight] of range) {
      if (!Number.isFinite(weight) || weight < 0 || weight > 1)
        throw new Error("Invalid range weight");
      if (weight === 0)
        continue;
      const combos = expandHandType(parseHandType(handStr)).length;
      total += combos * weight;
    }
    return total;
  }
  function expandRange(range, excludeCards = []) {
    const excludeIds = new Set(excludeCards.map((c) => `${c.rank}${c.suit}`));
    const result = [];
    for (const [handStr, weight] of range) {
      if (!Number.isFinite(weight) || weight < 0 || weight > 1)
        throw new Error("Invalid range weight");
      if (weight === 0)
        continue;
      const combos = expandHandType(parseHandType(handStr));
      for (const combo of combos) {
        const overlaps = combo.some((c) => excludeIds.has(`${c.rank}${c.suit}`));
        if (!overlaps) {
          result.push({ cards: combo, weight });
        }
      }
    }
    return result;
  }

  // ../../packages/poker-engine/dist/types.js
  var HandCategory;
  (function(HandCategory2) {
    HandCategory2[HandCategory2["HighCard"] = 0] = "HighCard";
    HandCategory2[HandCategory2["Pair"] = 1] = "Pair";
    HandCategory2[HandCategory2["TwoPair"] = 2] = "TwoPair";
    HandCategory2[HandCategory2["ThreeOfAKind"] = 3] = "ThreeOfAKind";
    HandCategory2[HandCategory2["Straight"] = 4] = "Straight";
    HandCategory2[HandCategory2["Flush"] = 5] = "Flush";
    HandCategory2[HandCategory2["FullHouse"] = 6] = "FullHouse";
    HandCategory2[HandCategory2["FourOfAKind"] = 7] = "FourOfAKind";
    HandCategory2[HandCategory2["StraightFlush"] = 8] = "StraightFlush";
  })(HandCategory || (HandCategory = {}));

  // ../../packages/poker-engine/dist/combinatorics.js
  function combinations(items, k) {
    const results = [];
    const combo = [];
    function backtrack(start) {
      if (combo.length === k) {
        results.push([...combo]);
        return;
      }
      for (let i = start; i < items.length; i++) {
        combo.push(items[i]);
        backtrack(i + 1);
        combo.pop();
      }
    }
    backtrack(0);
    return results;
  }

  // ../../packages/poker-engine/dist/evaluator.js
  function detectStraightHigh(distinctRanksDesc) {
    if (distinctRanksDesc.length !== 5)
      return null;
    const set = new Set(distinctRanksDesc);
    if ([14, 5, 4, 3, 2].every((r) => set.has(r)))
      return 5;
    const [a, b, c, d, e] = distinctRanksDesc;
    if (a - b === 1 && b - c === 1 && c - d === 1 && d - e === 1)
      return a;
    return null;
  }
  function packValue(category, tiebreakers) {
    let value = category;
    for (let i = 0; i < 5; i++) {
      value = value * 16 + (tiebreakers[i] ?? 0);
    }
    return value;
  }
  function evaluate5(cards) {
    if (cards.length !== 5) {
      throw new Error(`evaluate5 requires exactly 5 cards, got ${cards.length}`);
    }
    const suits2 = cards.map((c) => c.suit);
    const isFlush = suits2.every((s) => s === suits2[0]);
    const rankCounts = /* @__PURE__ */ new Map();
    for (const c of cards) {
      rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
    }
    const distinctRanksDesc = [...rankCounts.keys()].sort((a, b) => b - a);
    const straightHigh = detectStraightHigh(distinctRanksDesc);
    const groups = [...rankCounts.entries()].map(([rank, count]) => ({ rank, count })).sort((a, b) => b.count !== a.count ? b.count - a.count : b.rank - a.rank);
    const allRanksDesc = cards.map((c) => c.rank).sort((a, b) => b - a);
    let category;
    let tiebreakers;
    if (isFlush && straightHigh !== null) {
      category = HandCategory.StraightFlush;
      tiebreakers = [straightHigh];
    } else if (groups[0].count === 4) {
      category = HandCategory.FourOfAKind;
      const kicker = allRanksDesc.find((r) => r !== groups[0].rank);
      tiebreakers = [groups[0].rank, kicker];
    } else if (groups[0].count === 3 && groups[1]?.count === 2) {
      category = HandCategory.FullHouse;
      tiebreakers = [groups[0].rank, groups[1].rank];
    } else if (isFlush) {
      category = HandCategory.Flush;
      tiebreakers = allRanksDesc;
    } else if (straightHigh !== null) {
      category = HandCategory.Straight;
      tiebreakers = [straightHigh];
    } else if (groups[0].count === 3) {
      category = HandCategory.ThreeOfAKind;
      const kickers = allRanksDesc.filter((r) => r !== groups[0].rank);
      tiebreakers = [groups[0].rank, ...kickers];
    } else if (groups[0].count === 2 && groups[1]?.count === 2) {
      category = HandCategory.TwoPair;
      const highPair = groups[0].rank;
      const lowPair = groups[1].rank;
      const kicker = allRanksDesc.find((r) => r !== highPair && r !== lowPair);
      tiebreakers = [highPair, lowPair, kicker];
    } else if (groups[0].count === 2) {
      category = HandCategory.Pair;
      const pairRank = groups[0].rank;
      const kickers = allRanksDesc.filter((r) => r !== pairRank);
      tiebreakers = [pairRank, ...kickers];
    } else {
      category = HandCategory.HighCard;
      tiebreakers = allRanksDesc;
    }
    return {
      category,
      tiebreakers,
      value: packValue(category, tiebreakers),
      cards: [...cards]
    };
  }
  function evaluateBest(cards) {
    if (cards.length < 5) {
      throw new Error(`evaluateBest requires at least 5 cards, got ${cards.length}`);
    }
    if (cards.length === 5) {
      return evaluate5(cards);
    }
    const candidates = combinations(cards, 5);
    let best = null;
    for (const combo of candidates) {
      const evaluated = evaluate5(combo);
      if (!best || evaluated.value > best.value) {
        best = evaluated;
      }
    }
    return best;
  }

  // ../../packages/poker-engine/dist/equity.js
  var DEFAULT_ITERATIONS = 1e4;
  function calculateEquity(heroCards2, board, numOpponents, options = {}) {
    if (heroCards2.length !== 2) {
      throw new Error(`calculateEquity requires exactly 2 hero cards, got ${heroCards2.length}`);
    }
    if (board.length > 5) {
      throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
    }
    if (numOpponents < 1) {
      throw new Error(`calculateEquity requires at least 1 opponent, got ${numOpponents}`);
    }
    const iterations = options.iterations ?? DEFAULT_ITERATIONS;
    validateSimulationInput([...heroCards2, ...board], board.length, iterations);
    if (!Number.isInteger(numOpponents) || numOpponents > 9)
      throw new Error("Invalid opponent count");
    const rng = options.rng ?? Math.random;
    const cardsToComplete = 5 - board.length;
    let winShareSum = 0;
    let wins = 0;
    let ties = 0;
    let losses = 0;
    const knownCards = [...heroCards2, ...board];
    for (let i = 0; i < iterations; i++) {
      const deck = new Deck(rng, knownCards);
      const opponentHoleCards = [];
      for (let o = 0; o < numOpponents; o++) {
        opponentHoleCards.push(deck.drawMany(2));
      }
      const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];
      const heroValue = evaluateBest([...heroCards2, ...runoutBoard]).value;
      const opponentValues = opponentHoleCards.map((hole) => evaluateBest([...hole, ...runoutBoard]).value);
      const maxValue = Math.max(heroValue, ...opponentValues);
      if (heroValue < maxValue) {
        losses++;
      } else {
        const winnersCount = 1 + opponentValues.filter((v) => v === maxValue).length;
        winShareSum += 1 / winnersCount;
        if (winnersCount === 1) {
          wins++;
        } else {
          ties++;
        }
      }
    }
    return {
      equity: winShareSum / iterations,
      wins,
      ties,
      losses,
      iterations
    };
  }

  // ../../packages/poker-engine/dist/ev.js
  function calculatePotOdds(currentPot, amountToCall) {
    if (currentPot < 0)
      throw new Error(`currentPot cannot be negative, got ${currentPot}`);
    if (amountToCall <= 0) {
      throw new Error(`amountToCall must be positive, got ${amountToCall} (use 0 only for a check, which has no pot odds concept)`);
    }
    const breakevenEquity = amountToCall / (currentPot + amountToCall);
    return {
      breakevenEquity,
      breakevenEquityPercent: breakevenEquity * 100
    };
  }
  function calculateCallEV(equity, currentPot, amountToCall) {
    if (equity < 0 || equity > 1)
      throw new Error(`equity must be between 0 and 1, got ${equity}`);
    if (amountToCall <= 0)
      throw new Error(`amountToCall must be positive, got ${amountToCall}`);
    const ev = equity * currentPot - (1 - equity) * amountToCall;
    return { ev };
  }
  function calculateFoldEV() {
    return { ev: 0 };
  }
  function calculateRaiseEV(equityIfCalled, foldEquity, currentPot, investment, opponentCall) {
    if (![equityIfCalled, foldEquity].every((p) => Number.isFinite(p) && p >= 0 && p <= 1)) {
      throw new Error("Equity and fold equity must be finite probabilities");
    }
    if (!Number.isFinite(currentPot) || currentPot < 0 || !Number.isFinite(investment) || investment <= 0 || !Number.isFinite(opponentCall) || opponentCall <= 0 || opponentCall > investment) {
      throw new Error("Invalid pot, investment, or additional opponent call");
    }
    return { ev: foldEquity * currentPot + (1 - foldEquity) * (equityIfCalled * (currentPot + opponentCall) - (1 - equityIfCalled) * investment) };
  }
  function calculateSPR(effectiveStack, currentPot) {
    if (currentPot <= 0)
      throw new Error(`currentPot must be positive to compute SPR, got ${currentPot}`);
    return effectiveStack / currentPot;
  }

  // ../../packages/poker-engine/dist/outs.js
  function calculateOuts(holeCards, board) {
    if (holeCards.length !== 2) {
      throw new Error(`calculateOuts requires exactly 2 hole cards, got ${holeCards.length}`);
    }
    if (board.length !== 3 && board.length !== 4) {
      throw new Error(`calculateOuts requires a 3-card (flop) or 4-card (turn) board, got ${board.length}`);
    }
    const known = [...holeCards, ...board];
    const knownIds = new Set(known.map((c) => `${c.rank}${c.suit}`));
    const unseenCards = fullDeck().filter((c) => !knownIds.has(`${c.rank}${c.suit}`));
    const currentCategory = evaluateBest(known).category;
    const outs = [];
    for (const candidate of unseenCards) {
      const nextBoard = [...board, candidate];
      const improvedCategory = evaluateBest([...holeCards, ...nextBoard]).category;
      if (improvedCategory > currentCategory) {
        outs.push(candidate);
      }
    }
    return { outs, count: outs.length };
  }

  // ../../packages/poker-engine/dist/boardTexture.js
  function classifySuitTexture(board) {
    const suitCounts = /* @__PURE__ */ new Map();
    for (const c of board) {
      suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
    }
    const counts = [...suitCounts.values()].sort((a, b) => b - a);
    if (counts[0] >= board.length)
      return "monotone";
    if (counts[0] >= 2)
      return "two_tone";
    return "rainbow";
  }
  function classifyPairTexture(board) {
    const rankCounts = /* @__PURE__ */ new Map();
    for (const c of board) {
      rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
    }
    const maxCount = Math.max(...rankCounts.values());
    if (maxCount >= 3)
      return "trips_plus";
    if (maxCount === 2)
      return "paired";
    return "unpaired";
  }
  function classifyConnectivity(board) {
    const ranks = [...new Set(board.map((c) => c.rank))].sort((a, b) => a - b);
    let closePairs = 0;
    for (let i = 0; i < ranks.length; i++) {
      for (let j = i + 1; j < ranks.length; j++) {
        if (ranks[j] - ranks[i] <= 4)
          closePairs++;
      }
    }
    if (closePairs === 0)
      return "disconnected";
    if (closePairs <= 2)
      return "somewhat_connected";
    return "highly_connected";
  }
  function classifyOverall(suitTexture, pairTexture, connectivity) {
    let wetnessScore = 0;
    if (suitTexture === "monotone")
      wetnessScore += 2;
    else if (suitTexture === "two_tone")
      wetnessScore += 1;
    if (connectivity === "highly_connected")
      wetnessScore += 2;
    else if (connectivity === "somewhat_connected")
      wetnessScore += 1;
    if (pairTexture !== "unpaired")
      wetnessScore -= 1;
    if (wetnessScore >= 3)
      return "wet";
    if (wetnessScore >= 1)
      return "semi_wet";
    return "dry";
  }
  function classifyBoardTexture(board) {
    if (board.length < 3 || board.length > 5) {
      throw new Error(`classifyBoardTexture requires a 3-5 card board, got ${board.length}`);
    }
    const suitTexture = classifySuitTexture(board);
    const pairTexture = classifyPairTexture(board);
    const connectivity = classifyConnectivity(board);
    const overall = classifyOverall(suitTexture, pairTexture, connectivity);
    return { suitTexture, pairTexture, connectivity, overall };
  }

  // ../../packages/range-engine/dist/rangeEquity.js
  var DEFAULT_ITERATIONS2 = 1e4;
  function weightedSample(combos, rng) {
    const totalWeight = combos.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) {
      throw new Error("Cannot sample from a range with zero total weight (empty or all-excluded range)");
    }
    let roll = rng() * totalWeight;
    for (const combo of combos) {
      roll -= combo.weight;
      if (roll <= 0)
        return combo;
    }
    return combos[combos.length - 1];
  }
  function calculateEquityVsRange(heroCards2, opponentRange, board, options = {}) {
    if (heroCards2.length !== 2) {
      throw new Error(`calculateEquityVsRange requires exactly 2 hero cards, got ${heroCards2.length}`);
    }
    if (board.length > 5) {
      throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
    }
    const iterations = options.iterations ?? DEFAULT_ITERATIONS2;
    const rng = options.rng ?? Math.random;
    const cardsToComplete = 5 - board.length;
    const knownCards = [...heroCards2, ...board];
    validateSimulationInput(knownCards, board.length, iterations);
    const opponentCombos = expandRange(opponentRange, knownCards);
    if (opponentCombos.length === 0) {
      throw new Error("Opponent range has no valid combos remaining after excluding known cards");
    }
    let winShareSum = 0;
    for (let i = 0; i < iterations; i++) {
      const opponentCombo = weightedSample(opponentCombos, rng);
      const excludeThisIteration = [...knownCards, ...opponentCombo.cards];
      const deck = new Deck(rng, excludeThisIteration);
      const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];
      const heroValue = evaluateBest([...heroCards2, ...runoutBoard]).value;
      const opponentValue = evaluateBest([...opponentCombo.cards, ...runoutBoard]).value;
      if (heroValue > opponentValue)
        winShareSum += 1;
      else if (heroValue === opponentValue)
        winShareSum += 0.5;
    }
    return { equity: winShareSum / iterations, iterations };
  }

  // ../../packages/range-engine/dist/openingRanges.js
  var OPENING_RANGE_HANDS = {
    UTG: [
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "KTs",
      "KJs",
      "KQs",
      "QTs",
      "QJs",
      "JTs",
      "T9s",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "KQo"
    ],
    HJ: [
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q9s",
      "QTs",
      "QJs",
      "J9s",
      "JTs",
      "T9s",
      "98s",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "KJo",
      "KQo",
      "QJo"
    ],
    CO: [
      "22",
      "33",
      "44",
      "55",
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A2s",
      "A3s",
      "A4s",
      "A5s",
      "A6s",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K7s",
      "K8s",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q8s",
      "Q9s",
      "QTs",
      "QJs",
      "J8s",
      "J9s",
      "JTs",
      "T8s",
      "T9s",
      "97s",
      "98s",
      "87s",
      "76s",
      "A8o",
      "A9o",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "K9o",
      "KTo",
      "KJo",
      "KQo",
      "QTo",
      "QJo",
      "JTo"
    ],
    BTN: [
      "22",
      "33",
      "44",
      "55",
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A2s",
      "A3s",
      "A4s",
      "A5s",
      "A6s",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K2s",
      "K3s",
      "K4s",
      "K5s",
      "K6s",
      "K7s",
      "K8s",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q4s",
      "Q5s",
      "Q6s",
      "Q7s",
      "Q8s",
      "Q9s",
      "QTs",
      "QJs",
      "J6s",
      "J7s",
      "J8s",
      "J9s",
      "JTs",
      "T6s",
      "T7s",
      "T8s",
      "T9s",
      "95s",
      "96s",
      "97s",
      "98s",
      "85s",
      "86s",
      "87s",
      "75s",
      "76s",
      "64s",
      "65s",
      "54s",
      "A2o",
      "A3o",
      "A4o",
      "A5o",
      "A6o",
      "A7o",
      "A8o",
      "A9o",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "K7o",
      "K8o",
      "K9o",
      "KTo",
      "KJo",
      "KQo",
      "Q9o",
      "QTo",
      "QJo",
      "J9o",
      "JTo",
      "T9o"
    ],
    SB: [
      "22",
      "33",
      "44",
      "55",
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A2s",
      "A3s",
      "A4s",
      "A5s",
      "A6s",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K5s",
      "K6s",
      "K7s",
      "K8s",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q8s",
      "Q9s",
      "QTs",
      "QJs",
      "J8s",
      "J9s",
      "JTs",
      "T8s",
      "T9s",
      "97s",
      "98s",
      "87s",
      "76s",
      "65s",
      "A7o",
      "A8o",
      "A9o",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "K9o",
      "KTo",
      "KJo",
      "KQo",
      "QTo",
      "QJo",
      "JTo"
    ]
  };
  function getOpeningRange(position2) {
    if (position2 === "BB")
      return rangeFromList([]);
    return rangeFromList(OPENING_RANGE_HANDS[position2]);
  }
  function getPreflopOpeningReference(input) {
    if (!input.unopened || input.position === null || input.position === "BB" || input.playersDealtIn !== 6 || input.effectiveStackBB === null || !Number.isFinite(input.effectiveStackBB) || input.effectiveStackBB < 100)
      return null;
    return getOpeningRange(input.position);
  }

  // ../../packages/range-engine/dist/chenScore.js
  function chenScore(hand) {
    const { highRank, lowRank, suited } = hand;
    let score;
    if (highRank === 14)
      score = 10;
    else if (highRank === 13)
      score = 8;
    else if (highRank === 12)
      score = 7;
    else if (highRank === 11)
      score = 6;
    else if (highRank === 10)
      score = 5;
    else
      score = highRank / 2;
    if (highRank === lowRank) {
      score = Math.max(score * 2, 5);
      return score;
    }
    if (suited)
      score += 2;
    const gap = highRank - lowRank - 1;
    if (gap === 1)
      score -= 1;
    else if (gap === 2)
      score -= 2;
    else if (gap === 3)
      score -= 4;
    else if (gap >= 4)
      score -= 5;
    if ((gap === 0 || gap === 1) && highRank < 12) {
      score += 1;
    }
    return Math.ceil(score);
  }

  // ../../packages/range-engine/dist/actionNarrowing.js
  function rankRangeByStrength(range) {
    return [...range.keys()].sort((a, b) => chenScore(parseHandType(b)) - chenScore(parseHandType(a)));
  }
  function tendencyMultiplier(rate) {
    if (!rate || rate.samples <= 0 || ![rate.estimate, rate.priorMean, rate.playerWeight].every((v) => Number.isFinite(v) && v >= 0 && v <= 1))
      return 1;
    return 1 + Math.max(-0.15, Math.min(0.15, (rate.estimate - rate.priorMean) * rate.playerWeight));
  }
  function retainStrengthMass(range, fraction) {
    const ranked = rankRangeByStrength(range);
    const target = rangeComboCount(range) * fraction;
    const result = /* @__PURE__ */ new Map();
    let mass = 0;
    let boundary = Infinity;
    for (const hand of ranked) {
      const score = chenScore(parseHandType(hand));
      if (mass >= target && score < boundary)
        break;
      const weight = range.get(hand);
      result.set(hand, weight);
      mass += rangeComboCount(/* @__PURE__ */ new Map([[hand, weight]]));
      boundary = score;
    }
    return result;
  }
  function estimateOpponentRange(input) {
    const known = input.knownCards ?? [];
    if (new Set(known.map((c) => c.rank + c.suit)).size !== known.length)
      throw new Error("Duplicate known cards");
    let range = input.baseline ? new Map(input.baseline.range) : rangeFromList(allHandTypes().map(formatHandType));
    for (const [hand, weight] of range) {
      parseHandType(hand);
      if (!Number.isFinite(weight) || weight < 0 || weight > 1)
        throw new Error("Range weights must be finite and between 0 and 1");
      if (weight === 0)
        range.delete(hand);
    }
    let modeled = input.baseline !== void 0;
    let confidence = input.baseline?.confidence ?? "medium";
    const assumptions = ["Chen strength ordering and retained fractions are illustrative heuristics, not calibrated frequencies or solved ranges."];
    const fallbacks = [];
    const entryMultiplier = tendencyMultiplier(input.tendencies?.vpip);
    const aggressionMultiplier = tendencyMultiplier(input.tendencies?.pfr);
    const path = [];
    const warn = (message) => {
      confidence = "low";
      assumptions.push(message);
    };
    if (input.historyCoverage === "partial")
      warn("Partial history may omit hero actions, raises, and intervening calls; unknown raise levels are not inferred.");
    if (input.position === null)
      warn("Opponent position is unknown.");
    if (entryMultiplier !== 1 || aggressionMultiplier !== 1)
      warn("Range width uses opportunity-aware shrunk VPIP/PFR with a second reliability discount and bounded adjustment. Fold-to-3bet is not substituted for shove fold equity.");
    const available = (candidate) => expandRange(candidate, known).some((c) => c.weight > 0);
    let previousStreet = -1;
    let previousObservation = -1;
    for (const event of input.actions) {
      const streetIndex = ["preflop", "flop", "turn", "river"].indexOf(event.street);
      const unordered = streetIndex < previousStreet || event.observation !== void 0 && event.observation < previousObservation || event.observation !== void 0 && input.actions.filter((a) => a.observation === event.observation).length > 1;
      previousStreet = Math.max(previousStreet, streetIndex);
      previousObservation = Math.max(previousObservation, event.observation ?? -1);
      const verb = event.action === "all-in" ? event.wagerAction : event.action;
      let label = event.street + " " + (verb ?? "all-in (wager unknown)");
      if (event.action === "all-in" && verb)
        label += " all-in";
      let candidate = range;
      let establishesModel = false;
      if (unordered) {
        warn("Unordered or regressing action retained the previous range.");
      } else if (event.street !== "preflop") {
        if (verb === "bet" || verb === "raise" || verb === "call")
          warn(label + ": board-aware continuation model unavailable; retained prior range.");
      } else if (verb === "raise" || verb === "bet") {
        const level = event.priorRaises;
        if (input.historyCoverage !== "complete" || level === null || !Number.isInteger(level) || level < 0 || event.facing === "unknown") {
          label = "preflop aggression (raise level unknown)";
          warn("Preflop aggression lacks verified prior action; no 3-bet cut applied.");
        } else if (level === 0 && event.facing === "none") {
          label = event.unopened === true ? (input.position ?? "unknown position") + " open" : "preflop raise (unopened pot unverified)";
          const reference = input.chipEvOnly && event.unopened === true ? getPreflopOpeningReference({ position: input.position, effectiveStackBB: input.effectiveStackBB, playersDealtIn: input.playersDealtIn ?? 0, unopened: true }) : null;
          if (reference) {
            candidate = new Map([...range].filter(([hand]) => reference.has(hand)));
            if (aggressionMultiplier > 1) {
              const extras = new Map([...range].filter(([hand]) => !reference.has(hand)));
              const extraMass = rangeComboCount(candidate) * (aggressionMultiplier - 1), mass = rangeComboCount(extras);
              if (mass > 0) {
                const selected = retainStrengthMass(extras, Math.min(1, extraMass / mass));
                const scale = Math.min(1, extraMass / rangeComboCount(selected));
                for (const [hand, weight] of selected)
                  candidate.set(hand, weight * scale);
              }
            } else if (aggressionMultiplier < 1)
              candidate = retainStrengthMass(candidate, aggressionMultiplier);
            if (aggressionMultiplier !== 1)
              warn("Opening prior adjusted conservatively by shrunk PFR; maximum target mass change 15%, not a player-skill label.");
            establishesModel = true;
            assumptions.push("Opening reference is a 100BB+ six-max chip-EV RFI prior; it is carried forward only from this observed open.");
          } else
            warn("Opening reference out of scope (position, depth, table size or tournament conditions); retained prior.");
        } else if (level >= 1 && event.facing === "raise") {
          label = event.street + (level === 1 ? " 3-bet" : " later re-raise");
          if (input.effectiveStackBB === null || !Number.isFinite(input.effectiveStackBB) || input.effectiveStackBB < 100 || input.playersDealtIn !== 6 || !input.chipEvOnly) {
            warn(label + ": short-stack/tournament/unknown context not modeled; retained prior.");
          } else {
            const fraction = level > 1 ? 0.12 : event.facingPosition === "UTG" ? 0.18 : 0.25;
            candidate = retainStrengthMass(range, fraction * aggressionMultiplier);
            establishesModel = true;
            warn(label + ": assumed top " + fraction * 100 + "% weighted strength mass; bluffs and sizing are unmodeled.");
          }
        } else
          warn("Inconsistent preflop facing action and raise count; retained prior.");
      } else if (verb === "call") {
        if (input.historyCoverage !== "complete" || event.facing !== "raise" || event.priorRaises === null || !Number.isInteger(event.priorRaises) || event.priorRaises < 1 || input.effectiveStackBB === null || !Number.isFinite(input.effectiveStackBB) || input.effectiveStackBB < 100 || input.playersDealtIn !== 6 || !input.chipEvOnly) {
          warn("Call context is unresolved or outside deep-stack scope; retained prior.");
        } else {
          candidate = retainStrengthMass(range, (event.priorRaises === 1 ? 0.65 : 0.5) * entryMultiplier);
          const premiums = retainStrengthMass(range, 0.1);
          candidate = new Map([...candidate].map(([hand, weight]) => [hand, weight * (premiums.has(hand) ? 0.5 : 1)]));
          establishesModel = true;
          warn("Flat-call heuristic retains a stronger continuing subset with reduced premium weights; traps remain possible.");
        }
      } else if (event.action === "all-in")
        warn("All-in status alone supplies no additional range evidence.");
      path.push(label);
      if (candidate !== range && !available(candidate)) {
        fallbacks.push(label + ": heuristic removed all legal combos; retained previous weighted range.");
        confidence = "low";
      } else {
        range = candidate;
        modeled ||= establishesModel;
      }
    }
    const combos = expandRange(range, known);
    const status = combos.length === 0 ? "unavailable" : modeled ? "modeled" : "prior_only";
    if (status !== "modeled")
      warn(status === "unavailable" ? "Supplied prior has no legal combos; equity is unavailable, not replaced by random hands." : "No supported conditioning evidence; broad legal-card prior only, not an estimated opponent strategy.");
    return {
      range,
      combos,
      status,
      confidence,
      basis: (modeled ? "Estimated from " : "Unconditioned prior; observed ") + (path.join(" -> ") || "no actions") + (input.baseline ? "; prior: " + input.baseline.basis : ""),
      assumptions: [...new Set(assumptions)],
      fallbacks
    };
  }

  // ../../packages/range-engine/dist/multiwayEquity.js
  var suits = ["s", "h", "d", "c"];
  function cardId(card) {
    if (!Number.isInteger(card.rank) || card.rank < 2 || card.rank > 14 || !suits.includes(card.suit))
      throw new Error("Invalid card");
    return suits.indexOf(card.suit) * 13 + card.rank - 2;
  }
  function masked(combo) {
    let low = 0, high = 0;
    for (const card of combo.cards) {
      const id = cardId(card);
      if (id < 32)
        low |= 1 << id;
      else
        high |= 1 << id - 32;
    }
    return { ...combo, low, high };
  }
  function pick(combos, total, rng) {
    let roll = rng() * total;
    for (const combo of combos) {
      if (roll < combo.weight)
        return combo;
      roll -= combo.weight;
    }
    return combos[combos.length - 1];
  }
  function calculateEquityVsRanges(heroCards2, opponentRanges, board, options = {}) {
    if (heroCards2.length !== 2)
      throw new Error("Exactly two hero cards required");
    if (![0, 3, 4, 5].includes(board.length))
      throw new Error("Board must contain 0, 3, 4, or 5 cards");
    if (opponentRanges.length < 1 || opponentRanges.length > 9)
      throw new Error("Requires 1 to 9 opponent ranges");
    const known = [...heroCards2, ...board];
    if (new Set(known.map(cardId)).size !== known.length)
      throw new Error("Duplicate known cards");
    const iterations = options.iterations ?? 1e4;
    const maxAttempts = options.maxSamplingAttempts ?? Math.max(1e3, iterations * 100);
    if (!Number.isSafeInteger(iterations) || iterations <= 0)
      throw new Error("iterations must be a positive safe integer");
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < iterations)
      throw new Error("maxSamplingAttempts must be an integer >= iterations");
    const random = options.rng ?? Math.random;
    const rng = () => {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1)
        throw new Error("RNG must return a finite value in [0, 1)");
      return value;
    };
    const ranges = opponentRanges.map((range, i) => {
      const combos = expandRange(range, known).map(masked);
      const mass = combos.reduce((sum, combo) => sum + combo.weight, 0);
      if (combos.length === 0 || mass <= 0)
        throw new Error("Opponent " + (i + 1) + " range has no legal combos after known-card removal");
      return { combos, mass };
    });
    let completed = 0, attempts = 0, share = 0;
    attemptsLoop: while (completed < iterations && attempts < maxAttempts) {
      attempts++;
      const hands = [];
      let usedLow = 0, usedHigh = 0;
      for (const range of ranges) {
        const legal = hands.length === 0 ? range.combos : range.combos.filter((combo2) => (combo2.low & usedLow) === 0 && (combo2.high & usedHigh) === 0);
        const mass = hands.length === 0 ? range.mass : legal.reduce((sum, combo2) => sum + combo2.weight, 0);
        if (mass <= 0)
          continue attemptsLoop;
        if (mass < range.mass && rng() >= mass / range.mass)
          continue attemptsLoop;
        const combo = pick(legal, mass, rng);
        hands.push(combo);
        usedLow |= combo.low;
        usedHigh |= combo.high;
      }
      const deck = new Deck(rng, [...known, ...hands.flatMap((hand) => hand.cards)]);
      const runout = [...board, ...deck.drawMany(5 - board.length)];
      const heroValue = evaluateBest([...heroCards2, ...runout]).value;
      const values = hands.map((hand) => evaluateBest([...hand.cards, ...runout]).value);
      const best = Math.max(heroValue, ...values);
      if (heroValue === best)
        share += 1 / (1 + values.filter((value) => value === best).length);
      completed++;
    }
    if (completed !== iterations)
      throw new Error("Range sampling limit reached: " + completed + "/" + iterations + " valid deals in " + attempts + " attempts; ranges may be mutually incompatible or too collision-heavy");
    return { equity: share / completed, iterations: completed, attempts, rejectedSamples: attempts - completed };
  }

  // ../../packages/range-engine/dist/estimatedEquity.js
  function calculateEquityForEstimates(hero, estimates, board, options = {}) {
    if (estimates.length === 0)
      throw new Error("At least one opponent estimate required");
    const missing = estimates.map((e, i) => e.status !== "modeled" ? "opponent " + (i + 1) + " (" + e.status + ")" : null).filter(Boolean);
    if (missing.length > 0) {
      const reason = "Ranges cannot be constructed for " + missing.join(", ");
      if (estimates.length === 1)
        return { equity: void 0, source: void 0, reason };
      return { equity: calculateEquity(hero, board, estimates.length, options).equity, source: "random_hands", reason: reason + "; all opponents sampled as random hands, not estimated ranges." };
    }
    try {
      const equity = estimates.length === 1 ? calculateEquityVsRange(hero, estimates[0].range, board, options).equity : calculateEquityVsRanges(hero, estimates.map((e) => e.range), board, options).equity;
      return { equity, source: estimates.length === 1 ? "estimated_range" : "estimated_multiway_ranges", reason: null };
    } catch (error) {
      return { equity: void 0, source: void 0, reason: "Range equity unavailable: " + (error instanceof Error ? error.message : String(error)) };
    }
  }

  // ../../packages/ai-core/dist/preflopContext.js
  var position = external_exports.enum(["UTG", "HJ", "CO", "BTN", "SB", "BB"]);
  var chips = external_exports.number().finite().nonnegative();
  var wager = external_exports.enum(["bet", "raise", "call"]);
  var player = external_exports.object({
    seat: external_exports.number().int().positive(),
    position: position.nullable(),
    remainingStackBB: chips.nullable(),
    contributionBB: chips.nullable(),
    folded: external_exports.boolean(),
    allIn: external_exports.boolean()
  });
  var action = external_exports.object({
    seat: external_exports.number().int().positive(),
    action: external_exports.enum(["post_blind", "check", "call", "bet", "raise", "fold", "all-in"]),
    totalContributionBB: chips.nullable(),
    observation: external_exports.number().int().nonnegative(),
    wagerAction: wager.nullable()
  });
  var PreflopInputSchema = external_exports.object({
    heroSeat: external_exports.number().int().positive(),
    players: external_exports.array(player).min(2),
    /** Seats dealt into this hand, not just opponents still active. Null if unverified. */
    playersDealtIn: external_exports.number().int().min(2).max(10).nullable(),
    potBB: chips.nullable(),
    amountToCallBB: chips.nullable(),
    contributionMeaning: external_exports.enum(["street_total", "increment", "unknown"]),
    historyCoverage: external_exports.enum(["complete", "partial"]),
    actions: external_exports.array(action),
    historyNotes: external_exports.array(external_exports.string()),
    tournamentContext: external_exports.enum(["chip_ev_only", "unknown"])
  });
  var situation = external_exports.enum(["unopened", "limped_pot", "facing_open", "facing_open_and_callers", "facing_3bet", "facing_4bet_or_more", "facing_raise_unknown_level", "unknown"]);
  var PreflopContextSchema = PreflopInputSchema.extend({
    situation,
    heroPosition: position.nullable(),
    heroStackBB: chips.nullable(),
    activeOpponents: external_exports.number().int().nonnegative(),
    blindDefending: external_exports.boolean().nullable(),
    raiseToBB: chips.nullable(),
    lastAggressorSeat: external_exports.number().int().positive().nullable(),
    effectiveStackBB: chips.nullable(),
    effectiveStacks: external_exports.array(external_exports.object({ seat: external_exports.number().int().positive(), effectiveStackBB: chips.nullable() })),
    shortStack: external_exports.boolean().nullable(),
    pushFold: external_exports.enum(["not_applicable", "not_established", "requires_calling_model"]),
    openingReference: external_exports.object({ applicable: external_exports.boolean(), hands: external_exports.array(external_exports.string()) }),
    decisionSupport: external_exports.enum(["ai_judgment", "uncertain"]),
    reasons: external_exports.array(external_exports.string())
  });
  function buildPreflopContext(value) {
    const input = PreflopInputSchema.parse(value);
    const heroes = input.players.filter((p) => p.seat === input.heroSeat);
    if (heroes.length !== 1 || new Set(input.players.map((p) => p.seat)).size !== input.players.length)
      throw new Error("Preflop seats must be unique and include hero");
    const hero = heroes[0];
    const opponents = input.players.filter((p) => !p.folded && p.seat !== input.heroSeat);
    const reasons = [...input.historyNotes];
    const totalsKnown = input.contributionMeaning === "street_total" && input.players.filter((p) => !p.folded).every((p) => p.contributionBB !== null);
    if (!totalsKnown)
      reasons.push("Wager values are not verified street totals; a displayed 15BB cannot be assumed to mean raise-to 15BB.");
    if (input.historyCoverage === "partial")
      reasons.push("History is partial (including potentially missing hero actions); do not infer open/3-bet level from size alone.");
    const events = [...input.actions].sort((a, b) => a.observation - b.observation);
    const voluntary = events.filter((a) => a.action !== "post_blind");
    const orderKnown = new Set(voluntary.map((a) => a.observation)).size === voluntary.length;
    if (!orderKnown)
      reasons.push("Several actions share an observation; their order is unknown.");
    const eventSeatsKnown = events.every((a) => input.players.some((p) => p.seat === a.seat));
    if (!eventSeatsKnown)
      reasons.push("History includes an unidentified seat.");
    const unknownAllIn = events.some((a) => a.action === "all-in" && a.wagerAction === null);
    if (unknownAllIn)
      reasons.push("An all-in label has no known underlying wager action.");
    const raised = events.filter((a) => a.action === "raise" || a.action === "bet" || a.action === "all-in" && (a.wagerAction === "raise" || a.wagerAction === "bet"));
    const lastRaise = raised.at(-1);
    const highest = totalsKnown ? Math.max(1, ...input.players.filter((p) => !p.folded).map((p) => p.contributionBB)) : null;
    const raiseToBB = highest !== null && highest > 1 ? highest : null;
    const expectedCall = totalsKnown ? Math.max(0, Math.max(0, ...opponents.map((p) => p.contributionBB)) - hero.contributionBB) : null;
    const callConsistent = input.amountToCallBB !== null && expectedCall !== null && Math.abs(expectedCall - input.amountToCallBB) < 1e-8;
    if (!callConsistent)
      reasons.push("Call amount is unknown or disagrees with observed street totals.");
    const historyConsistent = raised.every((a, index) => a.totalContributionBB !== null && a.totalContributionBB > (index === 0 ? 1 : raised[index - 1].totalContributionBB ?? Infinity)) && (raised.length === 0 ? highest === 1 : lastRaise?.totalContributionBB === highest);
    if (!historyConsistent)
      reasons.push("Observed wager totals do not establish a consistent full raise sequence.");
    let previousTotal = 1;
    let minimumRaise = 1;
    const fullRaises = raised.every((a) => {
      if (a.totalContributionBB === null)
        return false;
      const increment = a.totalContributionBB - previousTotal;
      previousTotal = a.totalContributionBB;
      if (increment < minimumRaise)
        return false;
      minimumRaise = increment;
      return true;
    });
    if (!fullRaises)
      reasons.push("A short/incomplete raise may not reopen betting; full raise level is unresolved.");
    const complete = fullRaises && input.historyCoverage === "complete" && orderKnown && eventSeatsKnown && !unknownAllIn && totalsKnown && callConsistent && historyConsistent;
    let classified = raiseToBB !== null && (input.amountToCallBB ?? 0) > 0 ? "facing_raise_unknown_level" : "unknown";
    if (complete) {
      if (raised.length === 0) {
        classified = voluntary.some((a) => a.action === "call" || a.wagerAction === "call") ? "limped_pot" : "unopened";
      } else if (lastRaise?.seat !== input.heroSeat && (input.amountToCallBB ?? 0) > 0) {
        if (raised.length === 1) {
          classified = voluntary.some((a) => a.observation > lastRaise.observation && (a.action === "call" || a.wagerAction === "call")) ? "facing_open_and_callers" : "facing_open";
        } else
          classified = raised.length === 2 ? "facing_3bet" : "facing_4bet_or_more";
      }
    }
    const heroTotal = totalsKnown && hero.remainingStackBB !== null ? hero.remainingStackBB + hero.contributionBB : null;
    const effectiveStacks = opponents.map((opponent) => ({
      seat: opponent.seat,
      effectiveStackBB: heroTotal !== null && opponent.remainingStackBB !== null && opponent.contributionBB !== null ? Math.min(heroTotal, opponent.remainingStackBB + opponent.contributionBB) : null
    }));
    const effectiveStackBB = opponents.length === 1 ? effectiveStacks[0].effectiveStackBB : null;
    const allStacksKnown = effectiveStacks.length > 0 && effectiveStacks.every((p) => p.effectiveStackBB !== null);
    if (!allStacksKnown)
      reasons.push("Effective stack is unknown for at least one opponent; All In text is not numeric zero.");
    if (opponents.length > 1)
      reasons.push("Effective stacks are pairwise; multiway calling/side-pot strategy is not modeled.");
    if (hero.position === null || opponents.some((p) => p.position === null))
      reasons.push("One or more active positions are unknown.");
    if (input.potBB === null)
      reasons.push("Decision pot is unverified.");
    if (input.tournamentContext === "unknown")
      reasons.push("Antes, payouts, ICM, bounties, and tournament risk adjustments are unknown.");
    const minimumEffective = allStacksKnown ? Math.min(...effectiveStacks.map((p) => p.effectiveStackBB)) : null;
    const reference = getPreflopOpeningReference({ position: hero.position, effectiveStackBB: minimumEffective, playersDealtIn: input.playersDealtIn ?? 0, unopened: classified === "unopened" });
    const shortStack = heroTotal === null ? null : heroTotal <= 20;
    const pushFold = !complete || heroTotal === null ? "not_established" : classified === "unopened" && opponents.length === 1 && hero.position === "SB" && opponents[0]?.position === "BB" && effectiveStackBB !== null && effectiveStackBB <= 10 ? "requires_calling_model" : "not_applicable";
    if (pushFold === "requires_calling_model")
      reasons.push("Possible short-stack blind-vs-blind shove study only; a caller range, explicit fold-equity assumption, and correct commitment model are still required.");
    if (reference === null)
      reasons.push("No applicable strategic response model: 100BB+ six-max RFI charts are not defending, calling, 3-bet, 4-bet, or tournament short-stack charts.");
    const decisionSupport = reference !== null && complete && input.potBB !== null && !hero.folded && !hero.allIn && hero.remainingStackBB !== null && hero.remainingStackBB > 0 && opponents.every((p) => p.position !== null && !p.allIn) && input.tournamentContext === "chip_ev_only" ? "ai_judgment" : "uncertain";
    return PreflopContextSchema.parse({
      ...input,
      situation: classified,
      heroPosition: hero.position,
      heroStackBB: hero.remainingStackBB,
      activeOpponents: opponents.length,
      blindDefending: classified === "unopened" || classified === "limped_pot" ? false : raiseToBB === null || input.amountToCallBB === null || hero.position === null ? null : (hero.position === "SB" || hero.position === "BB") && input.amountToCallBB > 0,
      raiseToBB,
      lastAggressorSeat: complete ? lastRaise?.seat ?? null : null,
      effectiveStackBB,
      effectiveStacks,
      shortStack,
      pushFold,
      openingReference: { applicable: reference !== null, hands: reference ? [...reference.keys()] : [] },
      decisionSupport,
      reasons
    });
  }
  function preflopUncertainty(packet) {
    if (packet.table.street !== "preflop")
      return null;
    if (!packet.preflop)
      return ["Structured preflop context is missing."];
    if (packet.dataConfidence === "low")
      return ["Decision-critical table data is unreliable.", ...packet.preflop.reasons];
    return packet.preflop.decisionSupport === "uncertain" ? ["Insufficient strategic model / uncertain.", ...packet.preflop.reasons] : null;
  }

  // ../../packages/ai-core/dist/decisionPolicy.js
  var chips2 = external_exports.number().finite().nonnegative();
  var probability = external_exports.number().finite().min(0).max(1);
  var PotEvidenceSchema = external_exports.object({
    unit: external_exports.literal("chips"),
    mainPot: chips2.nullable(),
    displayedTotalPot: chips2.nullable(),
    decisionPot: chips2.nullable(),
    decisionPotSource: external_exports.string().min(1).nullable(),
    isPotSemanticsVerified: external_exports.boolean(),
    bigBlind: external_exports.number().finite().positive()
  });
  var PolicyEstimateSchema = external_exports.object({
    estimate: probability,
    low: probability,
    high: probability,
    source: external_exports.string().min(1),
    confidence: external_exports.enum(["low", "medium"])
  }).refine((p) => p.low <= p.estimate && p.estimate <= p.high, "Estimate must lie within its bounds");
  var PolicyContextSchema = external_exports.object({
    potVerified: external_exports.boolean(),
    potSource: external_exports.string().min(1),
    accounting: external_exports.enum(["single_pot_no_rake", "unknown"]),
    /** Calling ends all betting (river closing action, or a matched heads-up all-in). */
    terminalAfterCall: external_exports.boolean(),
    /** Checking ends the hand, not merely hero's turn. */
    checkEndsHand: external_exports.boolean(),
    legal: external_exports.object({
      verified: external_exports.boolean(),
      source: external_exports.string().min(1),
      heroStreetBetBB: chips2,
      opponentStreetBetBB: chips2,
      opponentStackBB: chips2,
      chipUnitBB: external_exports.number().finite().positive(),
      minBetBB: external_exports.number().finite().positive(),
      /** Total street contribution required for a full raise, not the raise increment. */
      minRaiseToBB: external_exports.number().finite().positive().nullable(),
      aggressionReopened: external_exports.boolean()
    }),
    /** Against the current range for CALL, or the checking range for a terminal CHECK. */
    equity: PolicyEstimateSchema.optional(),
    responses: external_exports.array(external_exports.object({
      /** Additional hero investment from this decision; one model PER candidate size. */
      investmentBB: external_exports.number().finite().positive(),
      equityIfCalled: PolicyEstimateSchema,
      callerRangeBasis: external_exports.string().min(1),
      foldEquity: PolicyEstimateSchema,
      /** Explicit approximation; no re-raise branch is currently modeled. */
      model: external_exports.literal("fold_or_call"),
      assumption: external_exports.string().min(1)
    })).max(32)
  });
  var EPS = 1e-8;
  var near = (a, b) => Math.abs(a - b) < EPS;
  function potEvidenceProblems(packet) {
    const evidence = packet.potEvidence;
    if (!evidence)
      return [];
    if (!evidence.isPotSemanticsVerified || evidence.decisionPot === null || !evidence.decisionPotSource) {
      return ["Live decision-pot semantics/provenance are unverified."];
    }
    if (!near(evidence.decisionPot / evidence.bigBlind, packet.table.potBB)) {
      return ["DecisionPacket potBB contradicts the verified chip pot / big blind."];
    }
    if (packet.policyContext && (!packet.policyContext.potVerified || packet.policyContext.potSource !== evidence.decisionPotSource)) {
      return ["Policy pot provenance contradicts the live evidence."];
    }
    return [];
  }
  function policyContextProblems(packet, ctx) {
    const legal = ctx.legal;
    const call = Math.max(0, legal.opponentStreetBetBB - legal.heroStreetBetBB);
    const onGrid = (value) => near(value / legal.chipUnitBB, Math.round(value / legal.chipUnitBB));
    const problems = potEvidenceProblems(packet);
    if (!legal.verified)
      problems.push("Exact action legality has not been verified.");
    if (legal.heroStreetBetBB > legal.opponentStreetBetBB || !near(call, packet.facingAction.amountBB ?? 0) || call > 0 !== (packet.facingAction.type !== "none")) {
      problems.push("Street contributions contradict the facing action/call cost.");
    }
    if (call > packet.hero.stackBB)
      problems.push("An unmatched all-in/short call needs separate pot accounting.");
    if (packet.table.potBB + EPS < legal.heroStreetBetBB + legal.opponentStreetBetBB) {
      problems.push("Verified pot cannot exclude the current street contributions.");
    }
    if (packet.facingAction.type === "all_in" && legal.opponentStackBB > 0) {
      problems.push("An all-in opponent cannot also have chips behind.");
    }
    if (![
      legal.heroStreetBetBB,
      legal.opponentStreetBetBB,
      legal.opponentStackBB,
      packet.hero.stackBB,
      legal.minBetBB,
      ...legal.minRaiseToBB === null ? [] : [legal.minRaiseToBB]
    ].every(onGrid)) {
      problems.push("Chip amounts or legal bounds do not match the verified chip unit.");
    }
    if (call > 0 && legal.aggressionReopened && legal.opponentStackBB > 0 && (legal.minRaiseToBB === null || legal.minRaiseToBB <= legal.opponentStreetBetBB)) {
      problems.push("Minimum raise-to is unknown or inconsistent.");
    }
    return problems;
  }
  function policyWagerProblems(packet, investmentBB) {
    if (packet.table.street === "preflop")
      return ["Exact preflop wager legality is outside this postflop sizing model."];
    const ctx = packet.policyContext;
    if (!ctx)
      return ["Exact wager legality is unknown; verified controls/minimums are required."];
    const problems = policyContextProblems(packet, ctx);
    if (problems.length)
      return problems;
    const legal = ctx.legal;
    const call = packet.facingAction.amountBB ?? 0;
    if (!Number.isFinite(investmentBB) || investmentBB <= call || investmentBB > packet.hero.stackBB + EPS) {
      return ["Wager must exceed the call cost and cannot exceed hero's available stack."];
    }
    if (!legal.aggressionReopened || legal.opponentStackBB === 0)
      return ["Aggression is not open or no opponent can match a wager."];
    if (!near(investmentBB / legal.chipUnitBB, Math.round(investmentBB / legal.chipUnitBB)))
      return ["Wager is not on the verified chip unit."];
    const total = legal.heroStreetBetBB + investmentBB;
    const minimum = call > 0 ? legal.minRaiseToBB : legal.heroStreetBetBB + legal.minBetBB;
    if (total + EPS < minimum && !near(investmentBB, packet.hero.stackBB))
      return ["Wager is below the verified legal minimum."];
    return [];
  }
  function generatePolicyCandidates(packet) {
    const ctx = packet.policyContext;
    if (packet.table.street === "preflop" || !ctx || !ctx.potVerified || ctx.accounting !== "single_pot_no_rake" || packet.table.numOpponentsRemaining !== 1 || policyContextProblems(packet, ctx).length || !ctx.legal.aggressionReopened)
      return [];
    const legal = ctx.legal;
    const call = packet.facingAction.amountBB ?? 0;
    if (legal.opponentStackBB === 0 || packet.hero.stackBB <= call)
      return [];
    const cap = Math.min(packet.hero.stackBB, call + legal.opponentStackBB);
    const potAfterCall = packet.table.potBB + call;
    const spr = potAfterCall > 0 ? (cap - call) / potAfterCall : Infinity;
    const sizes = [0.25, 0.33, 0.5, 0.67, 0.75, 1].map((fraction) => ({
      amount: call + fraction * potAfterCall,
      basis: `${Math.round(fraction * 100)}% of ${call ? "pot after call, plus call cost" : "pot"}`
    }));
    sizes.push({ amount: cap, basis: `${near(cap, packet.hero.stackBB) ? "shove" : "effective stack cap"}; SPR ${Number.isFinite(spr) ? spr.toFixed(2) : "undefined"}` });
    const candidates = /* @__PURE__ */ new Map();
    for (const size of sizes) {
      const investmentBB = Number((Math.floor((size.amount + EPS) / legal.chipUnitBB) * legal.chipUnitBB).toFixed(8));
      if (investmentBB <= call || investmentBB > cap + EPS)
        continue;
      const raiseToBB = legal.heroStreetBetBB + investmentBB;
      const shove = near(investmentBB, packet.hero.stackBB);
      if (policyWagerProblems(packet, investmentBB).length)
        continue;
      const action2 = shove ? "ALL_IN" : call > 0 ? "RAISE" : "BET";
      candidates.set(investmentBB, {
        action: action2,
        investmentBB,
        raiseToBB,
        opponentCallBB: investmentBB - call,
        basis: size.basis
      });
    }
    return [...candidates.values()].sort((a, b) => a.investmentBB - b.investmentBB);
  }
  function boundedEV(estimate, formula) {
    return { evBB: formula(estimate.estimate), lowBB: formula(estimate.low), highBB: formula(estimate.high) };
  }
  function evaluateDecisionPolicy(packet) {
    const result = {
      version: "v1",
      status: "unsupported",
      chosenAction: null,
      chosenSizeBB: null,
      raiseToBB: null,
      actionEVs: [],
      assumptions: ["Chip EV only; sunk contributions are excluded from incremental cost."],
      reasons: [],
      confidence: "low",
      equitySource: packet.engineCalculations.equitySource ?? "unknown",
      foldEquitySource: "not supplied",
      llmMayChoose: true
    };
    const stop = (reason) => {
      result.reasons.push(reason);
      return result;
    };
    const potProblems = potEvidenceProblems(packet);
    if (potProblems.length) {
      result.reasons.push(...potProblems);
      result.llmMayChoose = false;
      return result;
    }
    if (packet.dataConfidence !== "high") {
      result.llmMayChoose = false;
      return stop("High table-read confidence is required by this policy.");
    }
    if (packet.table.street === "preflop")
      return stop("Preflop remains on the existing context/fallback path.");
    if (packet.table.numOpponentsRemaining !== 1)
      return stop("Multiway action EV and side pots are not modeled in V1.");
    const expectedBoard = { flop: 3, turn: 4, river: 5 }[packet.table.street];
    if (packet.table.board.length !== expectedBoard || new Set([...packet.hero.holeCards, ...packet.table.board].map((c) => `${c.rank}${c.suit}`)).size !== expectedBoard + 2) {
      result.llmMayChoose = false;
      return stop("Invalid board length or duplicate known cards.");
    }
    const ctx = packet.policyContext;
    if (!ctx)
      return stop("Policy evidence is absent: pot semantics, legality and uncertainty bounds are required.");
    if (!ctx.potVerified || ctx.accounting !== "single_pot_no_rake") {
      result.llmMayChoose = false;
      return stop("Verified contestable pot, no side pots, and no unmodeled rake are required.");
    }
    result.assumptions.push(`Pot accounting: ${ctx.potSource}.`, `Legality: ${ctx.legal.source}.`, "No rake or side pots. Probability bounds are supplied sensitivity bounds, not calibrated confidence intervals.");
    const problems = policyContextProblems(packet, ctx);
    if (problems.length) {
      result.reasons.push(...problems);
      result.llmMayChoose = false;
      return result;
    }
    const call = packet.facingAction.amountBB ?? 0;
    const pot = packet.table.potBB;
    const eq = ctx.equity;
    if (call > 0)
      result.actionEVs.push({
        action: "FOLD",
        investmentBB: 0,
        evBB: calculateFoldEV().ev,
        lowBB: 0,
        highBB: 0,
        confidence: "medium",
        equitySource: "not needed",
        foldEquitySource: "not needed",
        assumptions: ["No additional chips invested."]
      });
    if (!eq || packet.engineCalculations.equity === void 0 || !near(eq.estimate, packet.engineCalculations.equity) || packet.engineCalculations.equitySource !== "estimated_range" || packet.opponentContext?.rangeStatus !== "modeled") {
      return stop("A modeled heads-up range, matching equity estimate and explicit uncertainty bounds are required; random-hand equity is not a policy input.");
    }
    result.equitySource += `: ${eq.source}`;
    if (call > 0 && !ctx.terminalAfterCall || call === 0 && (!ctx.checkEndsHand || packet.table.street !== "river")) {
      return stop("Future betting/equity realization is unmodeled; a check is not automatically worth zero.");
    }
    if (call > 0 && packet.table.street !== "river" && ctx.legal.opponentStackBB > 0 && !near(call, packet.hero.stackBB)) {
      result.llmMayChoose = false;
      return stop("Calling cannot end betting before the river with chips behind on both sides.");
    }
    result.actionEVs.push({
      action: call > 0 ? "CALL" : "CHECK",
      investmentBB: call,
      ...boundedEV(eq, (e) => call > 0 ? calculateCallEV(e, pot, call).ev : e * pot),
      confidence: eq.confidence,
      equitySource: eq.source,
      foldEquitySource: "not needed",
      assumptions: [call > 0 ? "Call ends betting; showdown equity is fully realized." : "Check ends the hand; EV(check) = equity times pot."]
    });
    const candidates = generatePolicyCandidates(packet);
    if (ctx.legal.aggressionReopened && ctx.legal.opponentStackBB > 0 && packet.hero.stackBB > call && candidates.length === 0) {
      return stop("No supported aggressive size fits the verified bounds; do not silently exclude aggression.");
    }
    for (const candidate of candidates) {
      const matches = ctx.responses.filter((r) => near(r.investmentBB, candidate.investmentBB));
      const response = matches.length === 1 ? matches[0] : void 0;
      const row = {
        action: candidate.action,
        investmentBB: candidate.investmentBB,
        raiseToBB: candidate.raiseToBB,
        evBB: null,
        lowBB: null,
        highBB: null,
        confidence: "low",
        equitySource: "not supplied",
        foldEquitySource: "not supplied",
        assumptions: [candidate.basis]
      };
      result.actionEVs.push(row);
      if (!response || packet.table.street !== "river") {
        row.assumptions.push("A unique per-size calling range/fold estimate and a river response model are required.");
        continue;
      }
      const formula = (e, f) => calculateRaiseEV(e, f, pot, candidate.investmentBB, candidate.opponentCallBB).ev;
      const corners = [response.equityIfCalled.low, response.equityIfCalled.high].flatMap((e) => [response.foldEquity.low, response.foldEquity.high].map((f) => formula(e, f)));
      Object.assign(row, {
        evBB: formula(response.equityIfCalled.estimate, response.foldEquity.estimate),
        lowBB: Math.min(...corners),
        highBB: Math.max(...corners),
        confidence: response.equityIfCalled.confidence === "medium" && response.foldEquity.confidence === "medium" ? "medium" : "low",
        equitySource: `${response.callerRangeBasis}: ${response.equityIfCalled.source}`,
        foldEquitySource: response.foldEquity.source
      });
      row.assumptions.push(response.assumption, "Opponent folds or calls; re-raises excluded by this explicit model.");
    }
    if (candidates.length)
      result.assumptions.push("Conditional river fold-or-call model; only the listed legal sizing grid is compared, not all possible strategies.");
    if (result.actionEVs.some((row) => row.evBB === null))
      return stop("Some legal candidates lack a response model. No action is selected from an incomplete comparison.");
    result.llmMayChoose = false;
    result.status = "uncertain";
    if (eq.confidence === "low" || packet.opponentContext?.rangeConfidence !== "medium" || result.actionEVs.some((row) => row.confidence === "low"))
      return stop("Range or response estimates have low confidence; EV scores are diagnostic only.");
    const ranked = [...result.actionEVs].sort((a, b) => b.evBB - a.evBB);
    const best = ranked[0];
    if (!ranked.slice(1).every((other) => best.lowBB > other.highBB + EPS)) {
      return stop("EV sensitivity intervals overlap or tie; no robust preference is established.");
    }
    if (!packet.candidateActions.includes(best.action))
      return stop("Selected action conflicts with the supplied candidate list.");
    result.status = "selected";
    result.confidence = "medium";
    result.chosenAction = best.action;
    result.chosenSizeBB = best.investmentBB > 0 ? best.investmentBB : null;
    result.raiseToBB = best.raiseToBB ?? null;
    if (best.action !== "FOLD")
      result.equitySource = best.equitySource;
    result.foldEquitySource = best.foldEquitySource;
    result.assumptions.push(...best.assumptions);
    result.reasons.push("Selected action's lower EV bound exceeds every other scored action's upper bound.");
    return result;
  }

  // ../../packages/ai-core/dist/decisionPacket.js
  var CardSchema = external_exports.object({
    rank: external_exports.union([
      external_exports.literal(2),
      external_exports.literal(3),
      external_exports.literal(4),
      external_exports.literal(5),
      external_exports.literal(6),
      external_exports.literal(7),
      external_exports.literal(8),
      external_exports.literal(9),
      external_exports.literal(10),
      external_exports.literal(11),
      external_exports.literal(12),
      external_exports.literal(13),
      external_exports.literal(14)
    ]),
    suit: external_exports.enum(["s", "h", "d", "c"])
  });
  var PositionSchema = external_exports.enum(["UTG", "HJ", "CO", "BTN", "SB", "BB"]);
  var StreetSchema = external_exports.enum(["preflop", "flop", "turn", "river"]);
  var FacingActionSchema = external_exports.enum(["none", "bet", "raise", "all_in"]);
  var EquitySourceSchema = external_exports.enum(["estimated_range", "estimated_multiway_ranges", "random_hands", "unknown"]);
  var CandidateActionSchema = external_exports.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]);
  function deriveCandidateActions(facingActionType) {
    const facingBet = facingActionType === "bet" || facingActionType === "raise" || facingActionType === "all_in";
    return facingBet ? ["FOLD", "CALL", "RAISE", "ALL_IN"] : ["CHECK", "BET", "ALL_IN"];
  }
  var DecisionPacketSchema = external_exports.object({
    hero: external_exports.object({
      holeCards: external_exports.tuple([CardSchema, CardSchema]),
      position: PositionSchema,
      stackBB: external_exports.number().finite().positive()
    }),
    table: external_exports.object({
      potBB: external_exports.number().finite().nonnegative(),
      // 0 is valid: the very first action of a hand, before blinds have registered in the main pot display
      board: external_exports.array(CardSchema).max(5),
      street: StreetSchema,
      numOpponentsRemaining: external_exports.number().int().min(1)
    }),
    facingAction: external_exports.object({
      type: FacingActionSchema,
      amountBB: external_exports.number().finite().nonnegative().optional()
    }),
    /** Derived via deriveCandidateActions() -- see its doc comment above. */
    candidateActions: external_exports.array(CandidateActionSchema).min(1),
    /** Optional for legacy packets; preflop requests without it yield uncertainty. */
    preflop: PreflopContextSchema.optional(),
    /** Optional evidence for the conservative deterministic policy; never an LLM action. */
    policyContext: PolicyContextSchema.optional(),
    /** Preserved display values/provenance for live packets; not interchangeable pots. */
    potEvidence: PotEvidenceSchema.optional(),
    engineCalculations: external_exports.object({
      equity: external_exports.number().min(0).max(1).optional(),
      /** Should be present whenever equity is -- see EquitySourceSchema doc comment above. Not schema-enforced as a pair, by convention only. */
      equitySource: EquitySourceSchema.optional(),
      potOddsBreakevenPercent: external_exports.number().min(0).max(100).optional(),
      callEV: external_exports.number().optional(),
      spr: external_exports.number().positive().optional(),
      outs: external_exports.number().int().nonnegative().optional(),
      boardTexture: external_exports.object({
        suitTexture: external_exports.enum(["monotone", "two_tone", "rainbow"]),
        pairTexture: external_exports.enum(["paired", "trips_plus", "unpaired"]),
        connectivity: external_exports.enum(["disconnected", "somewhat_connected", "highly_connected"]),
        overall: external_exports.enum(["dry", "semi_wet", "wet"])
      }).optional()
    }),
    opponentContext: external_exports.object({
      estimatedRangeDescription: external_exports.string().optional(),
      rangeConfidence: external_exports.enum(["medium", "low"]).optional(),
      rangeStatus: external_exports.enum(["modeled", "prior_only", "unavailable"]).optional(),
      rangeAssumptions: external_exports.array(external_exports.string()).optional(),
      rangeFallbacks: external_exports.array(external_exports.string()).optional(),
      opponents: external_exports.array(external_exports.object({
        seat: external_exports.number().int().positive(),
        position: PositionSchema.nullable(),
        playerProfile: OpponentProfileSchema.optional(),
        statsStorage: external_exports.enum(["available", "unavailable", "pending"]).optional(),
        rangeBasis: external_exports.string(),
        rangeConfidence: external_exports.enum(["medium", "low"]),
        rangeStatus: external_exports.enum(["modeled", "prior_only", "unavailable"])
      })).optional(),
      rangeVsHeroEquity: external_exports.number().min(0).max(1).optional()
    }).optional(),
    /** Explicit confidence flag per Rule 5: never let the AI reason
     *  confidently over uncertain data. */
    dataConfidence: external_exports.enum(["high", "medium", "low"]).default("low")
  });

  // ../../packages/ai-core/dist/recommendation.js
  var RecommendationSchema = external_exports.object({
    action: external_exports.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]),
    /** Additional investment from this decision, in BB; not a total raise-to. */
    sizingBB: external_exports.number().positive().optional(),
    confidence: external_exports.number().min(0).max(1),
    reasoning: external_exports.string().min(1),
    alternative: external_exports.object({
      action: external_exports.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]),
      reasoning: external_exports.string().min(1)
    }).optional()
  });

  // ../../packages/ai-core/dist/auditRecord.js
  var AuditRecordSchema = external_exports.object({
    timestamp: external_exports.string().datetime(),
    sessionId: external_exports.string(),
    handId: external_exports.string(),
    decisionPacket: DecisionPacketSchema,
    provider: external_exports.string(),
    model: external_exports.string(),
    promptVersion: external_exports.string(),
    rawResponse: external_exports.string().optional(),
    parsedRecommendation: RecommendationSchema.optional(),
    latencyMs: external_exports.number().nonnegative(),
    error: external_exports.string().optional()
  });

  // ../../packages/ai-core/dist/modelRegistry.js
  var ModelConfigSchema = external_exports.object({
    provider: external_exports.enum(["groq", "gemini", "nvidia"]),
    modelId: external_exports.string().min(1),
    supportsVision: external_exports.boolean(),
    supportsStructuredOutput: external_exports.boolean(),
    costTier: external_exports.enum(["free", "paid"]),
    speedTier: external_exports.enum(["fast", "moderate", "slow"]),
    /** Latency we've actually measured ourselves, not a vendor claim.
     *  Optional until we've run a real test against this exact model. */
    measuredLatencyMs: external_exports.number().positive().optional(),
    /** When we last confirmed (via a real API call) that this model is
     *  actually callable -- per the lesson learned twice now that
     *  documentation and reality can drift apart (Groq's Enterprise-only
     *  model move, needing to verify Gemini's model name against official
     *  docs rather than guessing). null means never verified. */
    lastVerifiedAt: external_exports.string().datetime().nullable()
  });

  // ../../packages/ai-core/dist/consistencyCheck.js
  var SEP = "[\\s\\-\\u2010-\\u2013]";
  var CATEGORY_PATTERNS = [
    { name: "High Card", pattern: `high${SEP}card` },
    { name: "Pair", pattern: "pairs?" },
    { name: "Two Pair", pattern: `two${SEP}pairs?` },
    { name: "Three of a Kind", pattern: `three${SEP}of${SEP}a${SEP}kind` },
    // Negative lookahead so "straight flush" isn't ALSO read as a "straight" claim.
    { name: "Straight", pattern: `straight(?!${SEP}flush)` },
    { name: "Flush", pattern: "flush" },
    { name: "Full House", pattern: `full${SEP}house` },
    { name: "Four of a Kind", pattern: `four${SEP}of${SEP}a${SEP}kind` },
    { name: "Straight Flush", pattern: `straight${SEP}flush` }
  ];

  // src/preflop.ts
  function buildLivePreflopContext(assessment, actionHistory2) {
    const { state, bigBlind, positions, decisionPot, amountToCall } = assessment;
    if (bigBlind === null || !Number.isFinite(bigBlind) || bigBlind <= 0) return null;
    const hero = state?.seats.find((s) => s.isYou);
    try {
      const preflop = state?.street === "preflop" && hero?.isOccupied && bigBlind !== null && state.seats.filter((s) => s.isOccupied).length >= 2 ? buildPreflopContext({
        heroSeat: hero.seatNumber,
        players: state.seats.filter((s) => s.isOccupied).map((s) => ({
          seat: s.seatNumber,
          position: positions.get(s.seatNumber) ?? null,
          remainingStackBB: s.stack === null ? null : s.stack / bigBlind,
          contributionBB: s.betReadError || s.currentBet === null ? null : s.currentBet / bigBlind,
          folded: s.isFolded,
          allIn: s.isAllIn ?? false
        })),
        playersDealtIn: null,
        potBB: decisionPot === null ? null : decisionPot / bigBlind,
        amountToCallBB: amountToCall === null ? null : amountToCall / bigBlind,
        contributionMeaning: "unknown",
        historyCoverage: "partial",
        tournamentContext: "unknown",
        historyNotes: actionHistory2.notes,
        actions: [...actionHistory2.records.values()].flat().filter((a) => a.street === "preflop").map((a) => ({
          seat: a.seat,
          action: a.action,
          totalContributionBB: a.amount === null ? null : a.amount / bigBlind,
          observation: a.observation,
          wagerAction: a.wagerAction
        }))
      }) : null;
      return preflop;
    } catch {
      return null;
    }
  }

  // ../../packages/browser-reader/dist/cardParsing.js
  var CLASS_SUIT_MAP = {
    "card-s": "s",
    "card-h": "h",
    "card-d": "d",
    "card-c": "c"
  };
  var CLASS_RANK_MAP = {
    "card-s-2": 2,
    "card-s-3": 3,
    "card-s-4": 4,
    "card-s-5": 5,
    "card-s-6": 6,
    "card-s-7": 7,
    "card-s-8": 8,
    "card-s-9": 9,
    "card-s-T": 10,
    "card-s-J": 11,
    "card-s-Q": 12,
    "card-s-K": 13,
    "card-s-A": 14
  };
  function parseHoleCardFromClassList(classList) {
    if (!classList.includes("flipped")) {
      return null;
    }
    let suit;
    let rank;
    for (const cls of classList) {
      if (Object.hasOwn(CLASS_SUIT_MAP, cls)) {
        if (suit !== void 0 && suit !== CLASS_SUIT_MAP[cls])
          return null;
        suit = CLASS_SUIT_MAP[cls];
      }
      if (Object.hasOwn(CLASS_RANK_MAP, cls)) {
        if (rank !== void 0 && rank !== CLASS_RANK_MAP[cls])
          return null;
        rank = CLASS_RANK_MAP[cls];
      }
    }
    if (suit === void 0 || rank === void 0) {
      return null;
    }
    return { rank, suit };
  }
  var TEXT_SUIT_MAP = {
    h: "h",
    s: "s",
    d: "d",
    c: "c",
    "\u2660": "s",
    "\u2665": "h",
    "\u2666": "d",
    "\u2663": "c"
  };
  var TEXT_RANK_MAP = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14
  };
  function parseBoardCardFromText(valueText, suitText) {
    const rankKey = valueText.trim().toUpperCase();
    const suitKey = normalizeSuitText(suitText);
    const rank = Object.hasOwn(TEXT_RANK_MAP, rankKey) ? TEXT_RANK_MAP[rankKey] : void 0;
    const suit = Object.hasOwn(TEXT_SUIT_MAP, suitKey) ? TEXT_SUIT_MAP[suitKey] : void 0;
    if (rank === void 0) {
      throw new Error(`Unrecognized board card value text: "${valueText}"`);
    }
    if (suit === void 0) {
      throw new Error(`Unrecognized board card suit text: "${suitText}"`);
    }
    return { rank, suit };
  }
  function normalizeSuitText(text) {
    return text.trim().replace(/[\uFE0E\uFE0F]/g, "").toLowerCase();
  }
  function parseBoardCardFromEvidence(evidence) {
    const ranks = /* @__PURE__ */ new Set();
    const suits2 = /* @__PURE__ */ new Set();
    for (const text of evidence.valueTexts) {
      if (text.trim())
        ranks.add(parseBoardCardFromText(text, "s").rank);
    }
    for (const text of evidence.suitTexts) {
      if (text.trim())
        suits2.add(parseBoardCardFromText("2", text).suit);
    }
    if (ranks.size > 0 || suits2.size > 0 || evidence.classList.includes("flipped")) {
      for (const cls of evidence.classList) {
        if (Object.hasOwn(CLASS_RANK_MAP, cls))
          ranks.add(CLASS_RANK_MAP[cls]);
        if (Object.hasOwn(CLASS_SUIT_MAP, cls))
          suits2.add(CLASS_SUIT_MAP[cls]);
      }
    }
    if (ranks.size !== 1 || suits2.size !== 1) {
      throw new Error(`Board card needs one consistent rank and suit; found ${ranks.size} rank(s), ${suits2.size} suit(s)`);
    }
    return { rank: [...ranks][0], suit: [...suits2][0] };
  }

  // ../../packages/browser-reader/dist/tableInfoParsing.js
  function parseChipsValueText(normalValueText) {
    const text = normalValueText.trim();
    const cleaned = text.replace(/,/g, "");
    if (cleaned.length === 0) {
      throw new Error(`Chips value text is empty (expected a number, got an empty string)`);
    }
    const value = Number(cleaned);
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text) || !Number.isFinite(value) || value < 0) {
      throw new Error(`Unrecognized chips value text: "${normalValueText}"`);
    }
    return value;
  }
  function parsePotSizeInfo(mainValueText, totalValueText) {
    return {
      mainValue: parseChipsValueText(mainValueText),
      totalValue: totalValueText !== null ? parseChipsValueText(totalValueText) : null
    };
  }
  var ALL_IN_STACK_TEXT = "all in";
  function isAllInStackText(text) {
    return text?.trim().replace(/\s+/g, " ").toLowerCase() === ALL_IN_STACK_TEXT;
  }
  function parseBlindValues(texts) {
    const parse = (text) => {
      if (text == null)
        return null;
      try {
        const value = parseChipsValueText(text);
        return value > 0 ? value : null;
      } catch {
        return null;
      }
    };
    return { smallBlind: parse(texts[0]), bigBlind: parse(texts[1]) };
  }
  function parsePlayerNameAndStack(nameText, stackText) {
    const name = nameText.trim();
    if (name.length === 0) {
      throw new Error("Player name text is empty");
    }
    if (isAllInStackText(stackText)) {
      return { name, stack: null };
    }
    return {
      name,
      stack: parseChipsValueText(stackText)
    };
  }

  // ../../packages/browser-reader/dist/gameState.js
  function deriveStreet(boardCardCount) {
    if (boardCardCount === 0)
      return "preflop";
    if (boardCardCount === 3)
      return "flop";
    if (boardCardCount === 4)
      return "turn";
    if (boardCardCount === 5)
      return "river";
    throw new Error(`Unexpected board card count: ${boardCardCount} (expected 0, 3, 4, or 5)`);
  }
  function parseBetValue(betValueText) {
    if (betValueText === null)
      return null;
    const trimmed = betValueText.trim();
    if (trimmed.length === 0)
      return null;
    try {
      return parseChipsValueText(trimmed);
    } catch {
      return null;
    }
  }
  function isCheckText(betValueText) {
    return betValueText !== null && betValueText.trim().toLowerCase() === "check";
  }
  function assembleSeat(raw) {
    if (!raw.isOccupied) {
      return {
        seatNumber: raw.seatNumber,
        isOccupied: false,
        isYou: false,
        playerName: null,
        stack: null,
        isFolded: false,
        isCurrentToAct: false,
        isOffline: false,
        holeCards: [],
        currentBet: null,
        isChecking: false
      };
    }
    const isFolded = raw.statusClasses.includes("fold");
    const isCurrentToAct = raw.statusClasses.includes("decision-current");
    const isOffline = raw.statusClasses.includes("offline");
    const playerName = raw.playerNameText?.trim() || null;
    let stack = null;
    if (playerName !== null && raw.stackText !== null) {
      try {
        stack = parsePlayerNameAndStack(playerName, raw.stackText).stack;
      } catch {
        stack = null;
      }
    }
    const holeCards = raw.holeCardClassLists.map(parseHoleCardFromClassList).filter((c) => c !== null);
    return {
      seatNumber: raw.seatNumber,
      isOccupied: true,
      isYou: raw.isYou,
      playerName,
      stack,
      isAllIn: isAllInStackText(raw.stackText) || isAllInStackText(raw.stackContainerText ?? null),
      betReadError: raw.betValueText !== null && parseBetValue(raw.betValueText) === null && !isCheckText(raw.betValueText),
      isFolded,
      isCurrentToAct,
      isOffline,
      holeCards,
      currentBet: parseBetValue(raw.betValueText),
      isChecking: isCheckText(raw.betValueText)
    };
  }
  function assembleGameState(raw) {
    if (raw.potMainValueText === null)
      throw new Error("Main pot element is missing");
    const board = raw.boardCards.map((c) => parseBoardCardFromText(c.valueText, c.suitText));
    const potInfo = parsePotSizeInfo(raw.potMainValueText, raw.potTotalValueText);
    const seats = raw.seats.map(assembleSeat);
    return {
      seats,
      board,
      potMainValue: potInfo.mainValue,
      potTotalValue: potInfo.totalValue,
      street: deriveStreet(board.length)
    };
  }
  function calculateAmountToCall(state) {
    const heroes = state.seats.filter((s) => s.isOccupied && s.isYou);
    const hero = heroes[0];
    if (heroes.length !== 1 || !hero || hero.isFolded)
      return null;
    const relevantSeats = state.seats.filter((s) => s.isOccupied && !s.isFolded);
    if (relevantSeats.some((s) => s.betReadError || s.currentBet !== null && (!Number.isFinite(s.currentBet) || s.currentBet < 0)))
      return null;
    const heroBet = hero?.currentBet ?? 0;
    const highestOpponentBet = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded && s.currentBet !== null).reduce((max, s) => Math.max(max, s.currentBet), 0);
    return Math.max(0, highestOpponentBet - heroBet);
  }

  // ../../packages/browser-reader/dist/dataConfidence.js
  var EXPECTED_BOARD_COUNT = {
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5
  };
  function computeDataConfidence(state, context) {
    const criticalReasons = [];
    const uncertainReasons = [];
    const hero = state.seats.find((s) => s.isYou);
    if (state.seats.filter((s) => s.isOccupied && s.isYou).length > 1) {
      criticalReasons.push("multiple hero seats found");
    }
    if (state.seats.filter((s) => s.isOccupied && s.isCurrentToAct).length !== 1) {
      criticalReasons.push("current player to act is missing or ambiguous");
    }
    if (new Set(state.seats.map((s) => s.seatNumber)).size !== state.seats.length) {
      criticalReasons.push("duplicate seat numbers");
    }
    if (!hero || !hero.isOccupied) {
      criticalReasons.push("hero seat not found in state");
    } else {
      if (hero.holeCards.length !== 2) {
        criticalReasons.push(`hero hole cards incomplete (${hero.holeCards.length}/2)`);
      }
      if (hero.stack === null || !Number.isFinite(hero.stack) || hero.stack < 0) {
        criticalReasons.push("hero stack missing or invalid");
      }
      if (hero.stack === 0 || hero.isAllIn) {
        criticalReasons.push("hero has no remaining chips to act with");
      }
      if (hero.isFolded) {
        criticalReasons.push("hero has already folded -- no decision to make");
      }
      if (!hero.isCurrentToAct) {
        criticalReasons.push("it is not hero's turn -- unsafe to base a decision on this state");
      }
      if (hero.isOffline) {
        criticalReasons.push("hero is showing as offline");
      }
    }
    const expectedBoardCount = EXPECTED_BOARD_COUNT[state.street];
    const visibleCards = [...state.board, ...state.seats.filter((s) => s.isOccupied).flatMap((s) => s.holeCards)];
    if (new Set(visibleCards.map((c) => `${c.rank}${c.suit}`)).size !== visibleCards.length) {
      criticalReasons.push("duplicate visible cards -- the table read is inconsistent");
    }
    if (state.board.length !== expectedBoardCount) {
      criticalReasons.push(`board card count (${state.board.length}) does not match street "${state.street}" (expected ${expectedBoardCount})`);
    }
    if (!Number.isFinite(state.potMainValue) || state.potMainValue < 0) {
      criticalReasons.push("pot value missing or invalid");
    }
    if (state.potTotalValue !== null && (!Number.isFinite(state.potTotalValue) || state.potTotalValue < 0)) {
      criticalReasons.push("add-on pot value is invalid");
    }
    if (!context.potSemanticsVerified) {
      criticalReasons.push("main/add-on pot meaning needs live confirmation -- pot-based recommendations withheld");
    }
    if (context.contributionSemanticsVerified === false) {
      criticalReasons.push("current-bet totals and absent/check markers need live confirmation -- call interpretation is provisional");
    }
    if (context.amountToCall === null || !Number.isFinite(context.amountToCall) || context.amountToCall < 0) {
      criticalReasons.push("amount-to-call is missing or invalid");
    }
    const activeOpponents = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded);
    if (state.seats.some((s) => s.isOccupied && !s.isFolded && (s.betReadError || s.currentBet !== null && (!Number.isFinite(s.currentBet) || s.currentBet < 0)))) {
      criticalReasons.push("current street contribution is unreadable");
    }
    if (activeOpponents.some((s) => !s.isAllIn && (s.stack === null || !Number.isFinite(s.stack) || s.stack < 0))) {
      criticalReasons.push("active opponent stack missing or invalid");
    }
    if (activeOpponents.length < 1) {
      criticalReasons.push("no active opponents remain -- hand is already decided");
    }
    if (context.bigBlindWasDefaulted) {
      criticalReasons.push("big blind could not be read from the table -- BB-based sizing is unreliable");
    }
    if (activeOpponents.some((s) => s.isOffline)) {
      uncertainReasons.push("at least one active opponent is showing as offline -- their state may be stale");
    }
    if (!context.isPositionKnown) {
      criticalReasons.push("hero's real table position is not yet known -- no fallback position will be sent");
    }
    if (criticalReasons.length > 0) {
      return { level: "low", reasons: criticalReasons };
    }
    if (uncertainReasons.length > 0) {
      return { level: "medium", reasons: uncertainReasons };
    }
    return { level: "high", reasons: [] };
  }

  // ../../packages/browser-reader/dist/actionHistory.js
  function emptyActionHistory() {
    return {
      records: /* @__PURE__ */ new Map(),
      observation: 0,
      lastHeroCards: null,
      lastHeroIdentity: null,
      dealerSeatNumber: null,
      streetContributions: /* @__PURE__ */ new Map(),
      awaitingStreetBaseline: false,
      notes: []
    };
  }
  function identity(seat) {
    return seat?.isOccupied && seat.playerName ? `${seat.seatNumber}:${seat.playerName}` : null;
  }
  function heroCards(state) {
    const cards = state.seats.find((s) => s.isYou && s.isOccupied)?.holeCards;
    return cards?.length === 2 ? cards.map((c) => `${c.rank}${c.suit}`).sort().join(",") : null;
  }
  function contribution(seat) {
    if (seat.betReadError)
      return null;
    if (seat.currentBet === null)
      return 0;
    return Number.isFinite(seat.currentBet) && seat.currentBet >= 0 ? seat.currentBet : null;
  }
  function boundaryReason(history, previous, current, context) {
    const streets = ["preflop", "flop", "turn", "river"];
    if (streets.indexOf(current.street) < streets.indexOf(previous.street))
      return "Board/street regressed; started a fresh history baseline.";
    if (previous.board.some((card, i) => current.board[i]?.rank !== card.rank || current.board[i]?.suit !== card.suit)) {
      return "Board was cleared or replaced; started a fresh history baseline.";
    }
    const currentIdentity = identity(current.seats.find((s) => s.isYou));
    const priorIdentity = history.lastHeroIdentity ?? identity(previous.seats.find((s) => s.isYou));
    const knownCards = history.lastHeroCards ?? heroCards(previous);
    const cards = heroCards(current);
    if (currentIdentity !== null && currentIdentity === priorIdentity && knownCards !== null && cards !== null && cards !== knownCards) {
      return "A different complete hero hand was observed; started a fresh history baseline.";
    }
    if (current.street === "preflop" && context.dealerSeatNumber != null && history.dealerSeatNumber !== null && context.dealerSeatNumber !== history.dealerSeatNumber) {
      return "Dealer changed preflop; started a fresh history baseline.";
    }
    if (current.seats.some((seat) => {
      const before = previous.seats.find((s) => s.seatNumber === seat.seatNumber);
      return identity(seat) !== null && identity(seat) === identity(before) && before?.isFolded && !seat.isFolded;
    }))
      return "A folded player became active again; hand continuity is uncertain, so history was reset.";
    return null;
  }
  function updateActionHistory(history, previous, current, context = {}) {
    const boundary = previous ? boundaryReason(history, previous, current, context) : "No preceding read; actions before this baseline are unknown.";
    const reset = boundary !== null;
    const next = reset ? emptyActionHistory() : {
      ...history,
      records: new Map(history.records),
      streetContributions: new Map(history.streetContributions),
      notes: [...history.notes]
    };
    next.handBoundary = reset;
    next.observation = history.observation + 1;
    const note = (message) => {
      if (!next.notes.includes(message))
        next.notes.push(message);
    };
    if (boundary)
      note(boundary);
    const heroIdentity = identity(current.seats.find((s) => s.isYou));
    if (heroIdentity !== null && heroIdentity !== next.lastHeroIdentity) {
      next.lastHeroIdentity = heroIdentity;
      next.lastHeroCards = null;
    }
    next.lastHeroCards = heroCards(current) ?? next.lastHeroCards ?? (previous && !reset ? heroCards(previous) : null);
    next.dealerSeatNumber = context.dealerSeatNumber ?? next.dealerSeatNumber;
    for (const seatNumber of next.records.keys()) {
      const before = previous?.seats.find((s) => s.seatNumber === seatNumber);
      const now = current.seats.find((s) => s.seatNumber === seatNumber);
      if (identity(now) === null || identity(now) !== identity(before)) {
        next.records.delete(seatNumber);
        next.streetContributions.delete(seatNumber);
        note("A seat disappeared or changed identity; its previous actions were discarded.");
      }
    }
    const sameStreet = previous !== null && previous.street === current.street;
    const cleanStreet = current.seats.filter((s) => s.isOccupied && !s.isFolded).every((s) => contribution(s) === 0 && !s.isChecking);
    if (!reset && (!sameStreet || history.awaitingStreetBaseline)) {
      next.awaitingStreetBaseline = !cleanStreet;
      next.streetContributions.clear();
      if (next.awaitingStreetBaseline)
        note("Street boundary has non-cleared action labels; waiting for a clean betting baseline.");
    }
    if (!sameStreet)
      next.streetContributions.clear();
    const baselineTotals = new Map(next.streetContributions);
    if (!reset && sameStreet && !history.awaitingStreetBaseline && previous) {
      for (const seat of previous.seats) {
        const total = contribution(seat);
        if (seat.isOccupied && total !== null)
          baselineTotals.set(seat.seatNumber, Math.max(baselineTotals.get(seat.seatNumber) ?? 0, total));
      }
    }
    for (const seat of current.seats) {
      const before = previous?.seats.find((s) => s.seatNumber === seat.seatNumber);
      if (identity(seat) === null || identity(seat) !== identity(before)) {
        baselineTotals.delete(seat.seatNumber);
        next.streetContributions.delete(seat.seatNumber);
      }
      const total = contribution(seat);
      if (seat.isOccupied && total !== null)
        next.streetContributions.set(seat.seatNumber, Math.max(baselineTotals.get(seat.seatNumber) ?? 0, total));
    }
    if (reset || !previous)
      return next;
    if (!sameStreet) {
      note("Street changed; actions spanning the transition were not reconstructed.");
      return next;
    }
    if (history.awaitingStreetBaseline)
      return next;
    const pairs = current.seats.flatMap((seat) => {
      const before = previous.seats.find((s) => s.seatNumber === seat.seatNumber);
      return before && identity(seat) !== null && identity(seat) === identity(before) ? [{ seat, before }] : [];
    });
    const increased = pairs.filter(({ seat, before }) => !seat.isFolded && !before.isFolded && contribution(seat) !== null && contribution(seat) > (baselineTotals.get(seat.seatNumber) ?? 0));
    const activeBefore = previous.seats.filter((s) => s.isOccupied && !s.isFolded);
    const unknownWager = activeBefore.some((s) => contribution(s) === null) || current.seats.some((s) => s.isOccupied && !s.isFolded && contribution(s) === null);
    const rosterChanged = previous.seats.some((s) => identity(s) !== identity(current.seats.find((now) => now.seatNumber === s.seatNumber))) || current.seats.some((s) => identity(s) !== identity(previous.seats.find((before) => before.seatNumber === s.seatNumber)));
    const previousHighest = Math.max(0, ...activeBefore.map((s) => baselineTotals.get(s.seatNumber) ?? contribution(s) ?? 0));
    if (increased.length > 1)
      note("Multiple wagers changed in one observation; bet/call/raise order is unknown and was omitted.");
    if (unknownWager)
      note("An active contribution was unreadable; numeric action classification was omitted.");
    if (rosterChanged)
      note("Seat identities changed during the observation; numeric action classification was omitted.");
    for (const { seat, before } of pairs) {
      if (seat.isYou || before.isFolded)
        continue;
      const records = next.records.get(seat.seatNumber) ?? [];
      const total = contribution(seat);
      const priorTotal = baselineTotals.get(seat.seatNumber) ?? 0;
      let action2 = null;
      let wagerAction = null;
      const grew = total !== null && total > priorTotal;
      const possiblePosting = current.street === "preflop" && (!before.isCurrentToAct || previousHighest === 0 || priorTotal === 0 && context.bigBlind != null && total !== null && total <= context.bigBlind);
      if (possiblePosting && (grew || !before.isAllIn && seat.isAllIn)) {
        note("Preflop posting or unobserved turn: wager/all-in was not treated as a voluntary action.");
      }
      if (grew && !unknownWager && !rosterChanged && increased.length === 1 && !possiblePosting) {
        if (previousHighest === 0)
          wagerAction = "bet";
        else if (total > previousHighest)
          wagerAction = "raise";
        else if (total === previousHighest || seat.isAllIn)
          wagerAction = "call";
        else
          note("A partial contribution without an all-in label was omitted.");
      }
      if (!before.isFolded && seat.isFolded)
        action2 = "fold";
      else if (!before.isAllIn && seat.isAllIn && !possiblePosting && !records.some((r) => r.action === "all-in"))
        action2 = "all-in";
      else if (seat.isChecking && !before.isChecking && !seat.isAllIn && !before.isAllIn && !unknownWager && previousHighest <= priorTotal && !records.some((r) => r.street === current.street && r.action === "check"))
        action2 = "check";
      else if (!seat.isAllIn && !before.isAllIn)
        action2 = wagerAction;
      if (action2) {
        next.records.set(seat.seatNumber, [...records, {
          street: current.street,
          action: action2,
          seat: seat.seatNumber,
          observation: next.observation,
          amount: action2 === "check" || action2 === "fold" || seat.currentBet === null ? null : total,
          wagerAction: action2 === "all-in" ? wagerAction : null
        }]);
      }
    }
    return next;
  }

  // ../../packages/browser-reader/dist/position.js
  function assignPositions(seats, dealerSeatNumber) {
    const occupied = seats.filter((s) => s.isOccupied).sort((a, b) => a.seatNumber - b.seatNumber);
    const positions = /* @__PURE__ */ new Map();
    if (occupied.length === 0)
      return positions;
    const dealerIndex = occupied.findIndex((s) => s.seatNumber === dealerSeatNumber);
    if (dealerIndex === -1) {
      return positions;
    }
    const clockwise = [...occupied.slice(dealerIndex), ...occupied.slice(0, dealerIndex)];
    const n = clockwise.length;
    clockwise.forEach((seat, i) => {
      let position2;
      if (i === 0) {
        position2 = "BTN";
      } else if (n === 2) {
        position2 = "BB";
      } else if (i === 1) {
        position2 = "SB";
      } else if (i === 2) {
        position2 = "BB";
      } else if (i === n - 1) {
        position2 = "CO";
      } else if (i === n - 2 && n >= 6) {
        position2 = "HJ";
      } else {
        position2 = "UTG";
      }
      positions.set(seat.seatNumber, position2);
    });
    return positions;
  }

  // ../../packages/browser-reader/dist/potSemantics.js
  function readPotProvenance(raw) {
    const parse = (text) => {
      if (text === null)
        return null;
      try {
        return parseChipsValueText(text);
      } catch {
        return null;
      }
    };
    return {
      unit: "chips",
      mainPot: parse(raw.potMainValueText),
      displayedTotalPot: parse(raw.potTotalValueText),
      decisionPot: null,
      decisionPotSource: null,
      isPotSemanticsVerified: false
    };
  }

  // ../../packages/browser-reader/dist/liveState.js
  function assessLiveState(raw, context) {
    const pot = readPotProvenance(raw);
    const legality = {
      verified: false,
      contributionMeaning: "unverified",
      minBet: null,
      minRaiseTo: null,
      chipUnit: null,
      aggressionReopened: null,
      reasons: [
        "Current-bet totals and absent/check-as-zero need live confirmation.",
        "Action controls, minimum raise-to, chip unit and reopening rights have no verified reader."
      ]
    };
    const blinds = parseBlindValues(context.blindTexts);
    const readErrors = [...context.readErrors];
    if (blinds.smallBlind === null)
      readErrors.push("small blind could not be read");
    if (blinds.bigBlind === null)
      readErrors.push("big blind could not be read -- BB conversions disabled");
    if (blinds.smallBlind !== null && blinds.bigBlind !== null && blinds.smallBlind > blinds.bigBlind) {
      readErrors.push("small blind exceeds big blind -- verify selector order");
    }
    let state;
    try {
      state = assembleGameState(raw);
    } catch (error) {
      return {
        state: null,
        ...blinds,
        positions: /* @__PURE__ */ new Map(),
        amountToCall: null,
        activeOpponents: null,
        decisionPot: pot.decisionPot,
        pot,
        legality,
        confidence: { level: "low", reasons: [...readErrors, error instanceof Error ? error.message : String(error)] }
      };
    }
    const positions = context.dealerSeatNumber === null ? /* @__PURE__ */ new Map() : assignPositions(state.seats, context.dealerSeatNumber);
    const hero = state.seats.find((s) => s.isYou);
    const amountToCall = calculateAmountToCall(state);
    const confidence = computeDataConfidence(state, {
      amountToCall,
      bigBlindWasDefaulted: blinds.bigBlind === null,
      isPositionKnown: hero !== void 0 && positions.has(hero.seatNumber),
      potSemanticsVerified: pot.isPotSemanticsVerified,
      contributionSemanticsVerified: false
    });
    return {
      state,
      ...blinds,
      positions,
      amountToCall,
      decisionPot: pot.decisionPot,
      pot,
      legality,
      activeOpponents: state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded).length,
      confidence: readErrors.length > 0 ? { level: "low", reasons: [...readErrors, ...confidence.reasons] } : confidence
    };
  }

  // ../../packages/browser-reader/dist/legalityProof.js
  var unknown = (reason) => ({ value: null, status: "unknown", confidence: "low", source: "insufficient evidence", reasons: [reason] });
  function unknownBettingProof(reason) {
    return {
      lastFullRaiseAmount: unknown(reason),
      fullMinimumRaiseTo: unknown(reason),
      stackCappedUnderRaiseTo: unknown(reason),
      actionReopened: unknown(reason)
    };
  }
  function unknownContestablePot(reason) {
    return { contestablePotBeforeCall: unknown(reason), contestablePotAfterCall: unknown(reason), callCost: unknown(reason), pots: [], uncalledReturns: [] };
  }

  // ../../packages/browser-reader/dist/liveLegalityEvidence.js
  var LIVE_LEGALITY_OBSERVATIONS = {
    source: "User live PokerNow evidence, 2026-10-05",
    scope: "Observed situations only; no automatic matching by chip amounts",
    normalRaise: { street: "flop", openingBet: 3, minRaiseButtonResult: 6, displayedBB: "3BB" },
    stackCappedRaise: { heroContribution: 2, heroRemaining: 23, opposingTotal: 20, allowedRaiseTo: 25 },
    potDisplay: { collected: 4, streetContributions: 3, displayedTotal: 7 },
    callGap: { heroContribution: 2, opposingTotal: 8, displayedCall: 6 },
    unverified: [
      "Last-full-raise event coverage",
      "PokerNow reopening after short/cumulative all-ins",
      "Whole-hand eligibility and side pots",
      "Uncalled returns and rake/drop"
    ]
  };
  function assessLiveLegalityEvidence(raw, assessment, history) {
    const state = assessment.state;
    const seats = state?.seats.filter((s) => s.isOccupied) ?? [];
    const hero = seats.find((s) => s.isYou);
    const contributionsKnown = state !== null && seats.length > 0 && seats.every((s) => !s.betReadError && (s.currentBet !== null || s.isChecking));
    const subtotal = contributionsKnown ? seats.reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null;
    const { mainPot, displayedTotalPot } = assessment.pot;
    const ledgerReason = "Current street snapshots do not contain complete whole-hand contributions, all eligible/folded/departed players, returns or rake evidence.";
    return {
      observations: LIVE_LEGALITY_OBSERVATIONS,
      historyCoverage: {
        kind: "snapshot_inferred",
        complete: false,
        observedEvents: [...history.records.values()].reduce((n, records) => n + records.length, 0),
        reasons: ["Polling can omit intermediate actions; opponent history omits hero actions.", ...history.notes]
      },
      betting: unknownBettingProof("Complete ordered street events including hero and a verified reopening rule profile are unavailable."),
      contestablePot: unknownContestablePot(ledgerReason),
      displayReconciliation: {
        confidence: "observation_only",
        source: "Current DOM values; arithmetic comparison only, not pot eligibility proof",
        collectedMainPot: mainPot,
        displayedTotalPot,
        currentStreetSubtotal: subtotal,
        matches: subtotal === null || mainPot === null || displayedTotalPot === null ? null : Math.abs(mainPot + subtotal - displayedTotalPot) < 1e-8,
        rawMainPotText: raw.potMainValueText,
        rawDisplayedTotalPotText: raw.potTotalValueText
      },
      heroMaximumRaiseTo: {
        value: hero?.stack != null && !hero.betReadError && (hero.currentBet !== null || hero.isChecking) ? hero.stack + (hero.currentBet ?? 0) : null,
        source: "Read remaining stack plus explicit street contribution; capacity only, not legal permission",
        confidence: "observation_only"
      },
      activation: { allowed: false, reasons: [
        ledgerReason,
        "Full raise and reopening cannot be proven from this history; selected raise-to/slider values do not supply missing proof.",
        "Existing pot, chip-unit, action-control and policy gates remain in force."
      ] }
    };
  }

  // src/raiseControlRead.ts
  var RAISE_SELECTORS = {
    form: "form.raise-controller-form",
    amount: ".raise-bet-value",
    input: "input.value",
    displayedBB: ".bb-value",
    submit: '.action-buttons input[type="submit"].action-button.bet'
  };
  function isControlVisible(element) {
    for (let node = element; node; node = node.parentElement) {
      if (node.hasAttribute("hidden")) return false;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function readRaiseControl(root = document, isVisible = isControlVisible) {
    const issues = [];
    const forms = [...root.querySelectorAll(RAISE_SELECTORS.form)].filter(isVisible);
    const form = forms.length === 1 ? forms[0] : null;
    if (forms.length > 1) issues.push("Multiple visible raise forms");
    const containers = form ? [...form.querySelectorAll(RAISE_SELECTORS.amount)].filter(isVisible) : [];
    const container = containers.length === 1 ? containers[0] : null;
    if (form && containers.length === 0) issues.push("Visible raise form has no visible amount container");
    if (containers.length > 1) issues.push("Multiple visible raise amount containers");
    const inputs = container ? [...container.querySelectorAll(RAISE_SELECTORS.input)].filter(isVisible) : [];
    const input = inputs.length === 1 ? inputs[0] : null;
    if (container && inputs.length !== 1) issues.push("Expected exactly one visible selected raise-to input");
    const selectedRaiseToText = input?.value ?? null;
    let selectedRaiseToChips = null;
    if (selectedRaiseToText !== null) {
      try {
        selectedRaiseToChips = parseChipsValueText(selectedRaiseToText);
      } catch {
        issues.push("Selected raise-to amount is unreadable");
      }
    }
    const bbDisplays = container ? [...container.querySelectorAll(RAISE_SELECTORS.displayedBB)].filter(isVisible) : [];
    if (bbDisplays.length > 1) issues.push("Multiple visible raise BB displays");
    const submits = form ? [...form.querySelectorAll(RAISE_SELECTORS.submit)].filter(isVisible) : [];
    const submit = submits.length === 1 ? submits[0] : null;
    if (form && submits.length !== 1) issues.push("Expected exactly one visible Raise submit control");
    const raiseSubmitVisible = submit?.value.trim().toLowerCase() === "raise";
    if (submit && !raiseSubmitVisible) issues.push("Submit control is not labeled Raise");
    return {
      formVisible: forms.length > 0,
      amountControlVisible: containers.length > 0,
      selectedRaiseToText,
      selectedRaiseToChips,
      selectedRaiseToSource: selectedRaiseToChips === null ? null : ".raise-bet-value input.value (live value property)",
      displayedBBText: bbDisplays.length === 1 ? bbDisplays[0].textContent : null,
      submitText: submit?.value ?? null,
      raiseSubmitVisible,
      raiseSubmitEnabled: raiseSubmitVisible && submit !== null ? !submit.disabled && !submit.hasAttribute("disabled") && !submit.closest('fieldset[disabled], [inert], [aria-disabled="true"]') : null,
      issues
    };
  }

  // src/tableRead.ts
  var TABLE_SELECTORS = {
    board: ".table-cards",
    boardCard: ".card-container",
    boardValue: ".value",
    boardSuit: ".suit:not(.sub-suit)",
    boardAllSuits: ".suit",
    seat: ".table-player-N (N=1..10)",
    name: ".table-player-name a",
    stack: ".table-player-stack .normal-value",
    stackContainer: ".table-player-stack",
    holeCard: ".table-player-cards .card-container",
    bet: ".table-player-bet-value",
    mainPot: ".table-pot-size .main-value .normal-value",
    addOnPot: ".table-pot-size .add-on-container .normal-value",
    potContainer: ".table-pot-size",
    blind: ".blind-value .chips-value .normal-value",
    dealer: '[class*="dealer-position-"]'
  };
  function readLiveTable() {
    const readErrors = [];
    const unique = (root, selector, label, required) => {
      const matches = root.querySelectorAll(selector);
      if (matches.length > 1 || required && matches.length === 0) {
        readErrors.push(`${label}: expected ${required ? "one" : "at most one"} match, found ${matches.length}`);
      }
      return matches.length === 1 ? matches[0] : null;
    };
    const board = unique(document, TABLE_SELECTORS.board, "board container", true);
    const boardCardEvidence = [];
    const boardCards = [...board?.querySelectorAll(TABLE_SELECTORS.boardCard) ?? []].map((card, index) => {
      const evidence = {
        classList: [...card.classList],
        valueTexts: [...card.querySelectorAll(TABLE_SELECTORS.boardValue)].map((node) => node.textContent ?? ""),
        suitTexts: [...card.querySelectorAll(TABLE_SELECTORS.boardSuit)].map((node) => node.textContent ?? ""),
        allSuitTexts: [...card.querySelectorAll(TABLE_SELECTORS.boardAllSuits)].map((node) => node.textContent ?? "")
      };
      boardCardEvidence.push(evidence);
      try {
        const parsed = parseBoardCardFromEvidence(evidence);
        return { valueText: formatCard(parsed).slice(0, -1), suitText: parsed.suit };
      } catch (error) {
        readErrors.push(`board card ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
        return { valueText: "", suitText: "" };
      }
    });
    const seatEvidence = [];
    const seats = [];
    for (let seatNumber = 1; seatNumber <= 10; seatNumber++) {
      const seat = unique(document, `.table-player-${seatNumber}`, `seat ${seatNumber}`, false);
      const classes = [...seat?.classList ?? []];
      const name = seat ? unique(seat, TABLE_SELECTORS.name, `seat ${seatNumber} name`, false) : null;
      const stack = seat ? unique(seat, TABLE_SELECTORS.stack, `seat ${seatNumber} stack`, false) : null;
      const stackContainer = seat ? unique(seat, TABLE_SELECTORS.stackContainer, `seat ${seatNumber} stack container`, false) : null;
      const bet = seat ? unique(seat, TABLE_SELECTORS.bet, `seat ${seatNumber} bet`, false) : null;
      const holeCards = [...seat?.querySelectorAll(TABLE_SELECTORS.holeCard) ?? []];
      const isOccupied = name !== null;
      if (!name && (stack || classes.includes("you-player") || classes.includes("decision-current"))) {
        readErrors.push(`seat ${seatNumber}: player markers present but name element missing`);
      }
      seats.push({
        seatNumber,
        isOccupied,
        isYou: classes.includes("you-player"),
        playerNameText: name?.textContent ?? null,
        stackText: stack?.textContent ?? null,
        stackContainerText: stackContainer?.textContent ?? null,
        statusClasses: classes,
        holeCardClassLists: holeCards.map((card) => [...card.classList]),
        betValueText: bet?.textContent ?? null
      });
      seatEvidence.push({
        seatNumber,
        seatMatches: document.querySelectorAll(`.table-player-${seatNumber}`).length,
        nameFound: name !== null,
        stackValueFound: stack !== null,
        betFound: bet !== null,
        stackContainerText: stackContainer?.textContent ?? null,
        seatText: seat?.textContent ?? null
      });
    }
    const main = unique(document, TABLE_SELECTORS.mainPot, "main pot", true);
    const addOn = unique(document, TABLE_SELECTORS.addOnPot, "add-on pot", false);
    const blindTexts = [...document.querySelectorAll(TABLE_SELECTORS.blind)].map((el) => el.textContent);
    if (blindTexts.length !== 2) readErrors.push(`blind values: expected two, found ${blindTexts.length}`);
    const dealer = unique(document, TABLE_SELECTORS.dealer, "dealer marker", true);
    const dealerClasses = [...dealer?.classList ?? []];
    const dealerTokens = dealerClasses.filter((cls) => cls.startsWith("dealer-position-"));
    const token = dealerTokens.length === 1 ? dealerTokens[0] : void 0;
    const dealerSeatNumber = token && /^dealer-position-(?:[1-9]|10)$/.test(token) ? Number(token.slice("dealer-position-".length)) : null;
    if (dealerSeatNumber === null) readErrors.push("dealer seat number unreadable or ambiguous");
    const raw = {
      seats,
      boardCards,
      potMainValueText: main?.textContent ?? null,
      potTotalValueText: addOn?.textContent ?? null
    };
    const context = { blindTexts, dealerSeatNumber, readErrors };
    return {
      raw,
      context,
      raiseControl: readRaiseControl(),
      evidence: {
        selectors: TABLE_SELECTORS,
        seatEvidence,
        dealerClasses,
        boardCardEvidence,
        boardContainerFound: board !== null,
        boardCardElementCount: boardCards.length,
        mainPotFound: main !== null,
        addOnPotFound: addOn !== null,
        potContainerText: document.querySelector(TABLE_SELECTORS.potContainer)?.textContent ?? null
      }
    };
  }

  // src/diagnostics.ts
  var DIAGNOSTICS_KEY = "poker-ai:diagnostics";
  var lastSnapshot = null;
  function buildLiveDiagnosticSnapshot(read, assessment, history, preflop = null, packet = null, unclassifiedControls = []) {
    const seats = assessment.state?.seats ?? [];
    const seatRow = (seat) => {
      const raw = read.raw.seats.find((row) => row.seatNumber === seat.seatNumber);
      return {
        seat: seat.seatNumber,
        player: seat.playerName,
        position: assessment.positions.get(seat.seatNumber) ?? null,
        stack: seat.stack,
        currentBet: seat.currentBet,
        stackText: raw?.stackText ?? null,
        currentBetText: raw?.betValueText ?? null,
        isAllIn: seat.isAllIn ?? false,
        isFolded: seat.isFolded,
        isOffline: seat.isOffline,
        isCurrentToAct: seat.isCurrentToAct,
        isChecking: seat.isChecking,
        betReadError: seat.betReadError ?? false
      };
    };
    const hero = seats.find((s) => s.isOccupied && s.isYou);
    const opponents = seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded);
    const occupied = seats.filter((s) => s.isOccupied);
    const policy = packet ? evaluateDecisionPolicy(packet) : null;
    return {
      version: 2,
      parsedStateAvailable: assessment.state !== null,
      units: { read: "chips", decisionPacket: "BB", candidateSizes: "additional BB; raiseToBB is total street BB" },
      street: assessment.state?.street ?? null,
      board: assessment.state ? formatCards(assessment.state.board) : null,
      hero: hero ? seatRow(hero) : null,
      activeOpponents: opponents.map(seatRow),
      seats: occupied.map(seatRow),
      monetary: {
        rawMainPotText: read.raw.potMainValueText,
        rawDisplayedTotalPotText: read.raw.potTotalValueText,
        potContainerText: read.evidence.potContainerText,
        ...assessment.pot,
        calculatedAmountToCall: assessment.amountToCall,
        amountToCallMeaning: "uncapped opposing contribution gap; totals and absent/check-as-zero are unverified",
        highestActiveOpposingContribution: !assessment.state || opponents.some((s) => s.betReadError) ? null : Math.max(0, ...opponents.map((s) => s.currentBet ?? 0)),
        knownNumericBetSubtotalIncludingFolded: assessment.state ? occupied.reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null,
        betSubtotalHasUnknowns: !assessment.state || occupied.some((s) => s.currentBet === null || s.betReadError),
        // Folded money still belongs to the pot; it is excluded only from the call target.
        foldedNumericBetSubtotal: assessment.state ? occupied.filter((s) => s.isFolded).reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null,
        smallBlind: assessment.smallBlind,
        bigBlind: assessment.bigBlind,
        rawBlindTexts: read.context.blindTexts,
        allInCallCostIfGapIsCorrect: hero?.stack == null || assessment.amountToCall === null ? null : Math.min(hero.stack, assessment.amountToCall)
      },
      legality: {
        ...assessment.legality,
        proof: assessLiveLegalityEvidence(read.raw, assessment, history),
        raiseControl: read.raiseControl,
        unclassifiedControls,
        controlsMeaning: "Selected raise-to is input evidence, not a legal minimum. Slider attributes and unclassified controls do not verify legality."
      },
      decision: {
        packetBuilt: packet !== null,
        decisionPotActuallyUsedBB: packet?.table.potBB ?? null,
        packetAmountToCallBB: packet?.facingAction.amountBB ?? null,
        policyPotActuallyUsedBB: packet?.policyContext?.potVerified && policy && policy.actionEVs.some((row) => row.action !== "FOLD" && row.evBB !== null) ? packet.table.potBB : null,
        candidateActionSizes: packet ? generatePolicyCandidates(packet) : [],
        candidateSizeStatus: packet?.policyContext ? "see policy reasons and verified bounds" : "withheld: no verified policy legality/pot inputs",
        policy,
        potEvidence: packet?.potEvidence ?? null,
        engineCalculations: packet?.engineCalculations ?? null
      },
      confidence: assessment.confidence,
      preflop,
      raw: read.raw,
      evidence: read.evidence,
      context: read.context,
      actionHistory: { records: Object.fromEntries(history.records), observation: history.observation, notes: history.notes },
      assumptions: {
        pot: "Total = collected + street contributions was observed live; hero eligibility, returns and side pots still require proof before EV use.",
        positions: "Ascending seat numbers assumed clockwise; verify against dealer and screen.",
        bets: "Absent/check indicators retain the existing zero interpretation. Other action words are unknown. Confirm against controls.",
        street: "Derived from board count; not independently read from PokerNow.",
        opponents: "Occupied and non-folded, including offline/all-in; sitting-out semantics still unverified."
      }
    };
  }
  function readUnclassifiedControls() {
    return [...document.querySelectorAll('button, [role="button"], input[type="number"], input[type="range"]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
    }).map((el) => ({
      tag: el.tagName,
      text: el.textContent?.trim() ?? "",
      ariaLabel: el.getAttribute("aria-label"),
      disabled: el.hasAttribute("disabled"),
      ariaDisabled: el.getAttribute("aria-disabled"),
      type: el.getAttribute("type"),
      value: el instanceof HTMLInputElement ? el.value : null,
      min: el.getAttribute("min"),
      max: el.getAttribute("max"),
      step: el.getAttribute("step")
    }));
  }
  function logLiveDiagnostics(read, assessment, history, preflop = null, packet = null) {
    let mode = null;
    try {
      mode = localStorage.getItem(DIAGNOSTICS_KEY);
    } catch {
    }
    if (mode !== "1" && mode !== "once") {
      lastSnapshot = null;
      return;
    }
    const snapshot = buildLiveDiagnosticSnapshot(read, assessment, history, preflop, packet, readUnclassifiedControls());
    const serialized = JSON.stringify(snapshot);
    if (mode !== "once" && serialized === lastSnapshot) return;
    lastSnapshot = serialized;
    const captured = { capturedAt: (/* @__PURE__ */ new Date()).toISOString(), ...JSON.parse(serialized) };
    console.groupCollapsed("[Poker AI State] " + captured.capturedAt + " | " + snapshot.street + " | confidence=" + assessment.confidence.level);
    console.log("Monetary/legality snapshot", captured);
    console.table(snapshot.seats);
    console.log("Copyable snapshot JSON", JSON.stringify(captured));
    console.groupEnd();
    if (mode === "once") {
      try {
        localStorage.removeItem(DIAGNOSTICS_KEY);
      } catch {
      }
    }
  }

  // src/requestIdentity.ts
  function decisionFingerprint(tableUrl, raw, context, raiseControl) {
    return JSON.stringify({ tableUrl, raw, context, raiseControl });
  }
  function decisionRequestKey(epoch, fingerprint) {
    return `${epoch}:${fingerprint}`;
  }

  // src/contentScript.ts
  console.log("[Poker AI Reader] Content script loaded on:", window.location.href);
  var overlayState = {
    street: "-",
    equityLine: null,
    potOddsLine: null,
    preflopLine: null,
    opponentStatsLine: null,
    policyLine: null,
    aiStatus: "idle",
    aiResult: null,
    aiWarnings: []
  };
  var OVERLAY_ID = "poker-ai-reader-overlay";
  function ensureOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) return existing;
    const el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.style.cssText = `
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 999999;
    width: 280px;
    max-height: 90vh;
    overflow-y: auto;
    background: rgba(20, 20, 24, 0.92);
    color: #eee;
    font-family: -apple-system, "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1.4;
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  `.trim();
    document.body.appendChild(el);
    return el;
  }
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var AI_STATUS_COLORS = {
    idle: "#888888",
    waiting: "#e0a030",
    received: "#4caf50",
    blocked: "#e05050",
    error: "#e05050"
  };
  function renderOverlay() {
    const el = ensureOverlay();
    const s = overlayState;
    const parts = [];
    parts.push(`<div style="font-weight:600; margin-bottom:6px; color:#9ad;">Poker AI Reader</div>`);
    parts.push(`<div>Street: <b>${escapeHtml(s.street)}</b></div>`);
    if (s.equityLine) parts.push(`<div>${escapeHtml(s.equityLine)}</div>`);
    if (s.potOddsLine) parts.push(`<div>${escapeHtml(s.potOddsLine)}</div>`);
    if (s.opponentStatsLine) parts.push(`<div>${escapeHtml(s.opponentStatsLine)}</div>`);
    if (s.preflopLine) {
      parts.push(
        `<div style="margin-top:6px; padding-top:6px; border-top:1px solid #444;">${escapeHtml(s.preflopLine)}</div>`
      );
    }
    parts.push(`<div style="margin-top:8px; padding-top:8px; border-top:1px solid #444;">`);
    parts.push(
      `<div style="color:${AI_STATUS_COLORS[s.aiStatus]}; font-weight:600;">${escapeHtml(s.aiStatus.toUpperCase())}</div>`
    );
    if (s.policyLine) parts.push(`<div>${escapeHtml(s.policyLine)}</div>`);
    if (s.aiResult) {
      parts.push(`<div style="font-size:16px; font-weight:700; margin:4px 0;">${escapeHtml(s.aiResult.action)}</div>`);
      parts.push(`<div>Confidence: ${(s.aiResult.confidence * 100).toFixed(0)}%</div>`);
      parts.push(`<div style="margin-top:4px; color:#ccc;">${escapeHtml(s.aiResult.reasoning)}</div>`);
    }
    if (s.aiWarnings.length > 0) {
      parts.push(
        `<div style="margin-top:6px; color:#e0a030;">${s.aiWarnings.map((w) => escapeHtml(w)).join("<br/>")}</div>`
      );
    }
    parts.push(`</div>`);
    el.innerHTML = parts.join("");
  }
  var RELAY_SERVER_URL = "http://localhost:8787/recommendation";
  function buildDecisionPacket(input) {
    const {
      state,
      amountToCall,
      equity,
      equitySource,
      bigBlind,
      decisionPot,
      potProvenance,
      confidence,
      heroPosition,
      opponentRangeContext
    } = input;
    const hero = state.seats.find((s) => s.isYou);
    const numOpponentsRemaining = state.seats.filter(
      (s) => s.isOccupied && !s.isYou && !s.isFolded
    ).length;
    if (confidence.level === "low" || hero.stack === null || !Number.isFinite(bigBlind) || bigBlind <= 0 || !potProvenance.isPotSemanticsVerified || potProvenance.decisionPotSource === null || potProvenance.decisionPot !== decisionPot) {
      throw new Error("Cannot build a DecisionPacket from an untrusted table read");
    }
    console.log(
      `[Poker AI Reader] Data confidence: ${confidence.level}${confidence.reasons.length > 0 ? ` (${confidence.reasons.join("; ")})` : ""}`
    );
    const facingActionType = amountToCall > 0 ? "bet" : "none";
    let potOddsBreakevenPercent;
    let callEV;
    if (amountToCall > 0 && decisionPot > 0) {
      potOddsBreakevenPercent = calculatePotOdds(decisionPot, amountToCall).breakevenEquityPercent;
      if (equity !== void 0) callEV = calculateCallEV(equity, decisionPot / bigBlind, amountToCall / bigBlind).ev;
    }
    let spr;
    const headsUpOpponent = numOpponentsRemaining === 1 ? state.seats.find((s) => s.isOccupied && !s.isYou && !s.isFolded) : void 0;
    if (hero.stack !== null && hero.stack > 0 && headsUpOpponent?.stack != null && headsUpOpponent.stack > 0 && decisionPot > 0) {
      spr = calculateSPR(Math.min(hero.stack, headsUpOpponent.stack), decisionPot);
    }
    let outs;
    if (state.board.length === 3 || state.board.length === 4) {
      outs = calculateOuts(hero.holeCards, state.board).count;
    }
    let boardTexture;
    if (state.board.length >= 3) {
      boardTexture = classifyBoardTexture(state.board);
    }
    return {
      hero: {
        holeCards: hero.holeCards,
        position: heroPosition,
        stackBB: hero.stack / bigBlind
      },
      table: {
        potBB: decisionPot / bigBlind,
        board: state.board,
        street: state.street,
        numOpponentsRemaining
      },
      facingAction: {
        type: facingActionType,
        ...amountToCall > 0 ? { amountBB: amountToCall / bigBlind } : {}
      },
      candidateActions: deriveCandidateActions(facingActionType),
      potEvidence: { ...potProvenance, bigBlind },
      // policyContext intentionally absent until live pot/legality and range
      // uncertainty evidence are verified. The relay reports explicit fallback
      // eligibility; never invent fold equity or exact raise controls here.
      engineCalculations: {
        equity,
        equitySource,
        potOddsBreakevenPercent,
        callEV,
        spr,
        outs,
        boardTexture
      },
      opponentContext: opponentRangeContext,
      dataConfidence: confidence.level
    };
  }
  async function requestRecommendation(packet, stateDescription, requestKey) {
    try {
      const response = await fetch(RELAY_SERVER_URL, {
        method: "POST",
        signal: AbortSignal.timeout(7e4),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast", decisionPacket: packet })
      });
      const data = await response.json();
      if (requestKey !== lastRecommendationRequestKey) {
        console.warn(
          `[Poker AI Reader] Discarding stale AI response (for: ${stateDescription}) -- a newer decision point is already current.`
        );
        return;
      }
      const latest = readLiveTable();
      const latestFingerprint = decisionFingerprint(location.origin + location.pathname, latest.raw, latest.context, latest.raiseControl);
      if (requestKey !== decisionRequestKey(requestSequence, latestFingerprint)) {
        lastRecommendationRequestKey = null;
        overlayState.aiResult = null;
        overlayState.aiStatus = "blocked";
        overlayState.policyLine = null;
        overlayState.aiWarnings = ["Table changed while the recommendation was pending."];
        overlayState.equityLine = null;
        overlayState.potOddsLine = null;
        overlayState.preflopLine = null;
        renderOverlay();
        return;
      }
      overlayState.policyLine = data.policy ? `Decision: ${data.decisionSource}; policy ${data.policy.status} (${data.policy.confidence} confidence)` : null;
      if (data.policy) console.log("[Poker AI Reader] Engine policy evidence:", data.policy);
      if (data.ok && data.result === null && data.blocked) {
        overlayState.aiResult = null;
        overlayState.aiStatus = "blocked";
        overlayState.aiWarnings = data.uncertainty ?? [data.originalReason ?? data.blockedReason];
      } else if (data.ok) {
        if (!response.ok || Array.isArray(data.result)) throw new Error("Invalid live relay response");
        data.result = RecommendationSchema.parse(data.result);
        console.log(`[Poker AI Reader] AI recommendation (for: ${stateDescription}):`, data.result);
        overlayState.aiResult = {
          action: data.result.action + (data.result.sizingBB === void 0 ? "" : ` ${data.result.sizingBB}BB${data.decisionSource === "engine_policy" ? " additional" : ""}`) + (data.policy?.raiseToBB == null ? "" : ` (to ${data.policy.raiseToBB}BB)`),
          confidence: data.result.confidence,
          reasoning: data.result.reasoning
        };
        overlayState.aiWarnings = [
          ...data.blocked ? [`Blocked: ${data.blockedReason}${data.originalReason ? ` -- ${data.originalReason}` : ""}`] : [],
          ...data.consistencyWarnings ?? [],
          ...data.policy?.reasons ?? [],
          ...packet.opponentContext?.rangeConfidence === "low" ? ["Opponent range confidence: low", ...packet.opponentContext.rangeAssumptions ?? [], ...packet.opponentContext.rangeFallbacks ?? []] : []
        ];
        overlayState.aiStatus = data.blocked ? "blocked" : "received";
      } else {
        console.error(`[Poker AI Reader] Relay server returned an error (for: ${stateDescription}):`, data.error);
        overlayState.aiStatus = "error";
        overlayState.aiResult = null;
        overlayState.aiWarnings = [String(data.error)];
      }
      renderOverlay();
    } catch (error) {
      console.error(`[Poker AI Reader] Failed to reach relay server (for: ${stateDescription}):`, error);
      if (requestKey === lastRecommendationRequestKey) {
        overlayState.aiStatus = "error";
        overlayState.aiResult = null;
        overlayState.policyLine = null;
        overlayState.aiWarnings = ["Relay request failed, timed out, or returned an invalid response."];
        renderOverlay();
      }
    }
  }
  var opponentStats = createLiveOpponentClient("http://localhost:8787");
  var requestSequence = 0;
  var lastStateJson = null;
  var lastRecommendationRequestKey = null;
  var previousGameState = null;
  var actionHistory = emptyActionHistory();
  var currentDiagnosticPacket = null;
  setInterval(() => {
    try {
      const read = readLiveTable();
      const assessment = assessLiveState(read.raw, read.context);
      const stateJson = decisionFingerprint(location.origin + location.pathname, read.raw, read.context, read.raiseControl);
      if (stateJson !== lastStateJson) {
        currentDiagnosticPacket = null;
        const state = assessment.state;
        if (!state || read.context.readErrors.length > 0) {
          previousGameState = null;
          actionHistory = emptyActionHistory();
          opponentStats.observe(null, actionHistory);
        } else {
          actionHistory = updateActionHistory(actionHistory, previousGameState, state, {
            bigBlind: assessment.bigBlind,
            dealerSeatNumber: read.context.dealerSeatNumber
          });
          previousGameState = state;
          opponentStats.observe(state, actionHistory);
        }
      }
      opponentStats.tick();
      const preflop = buildLivePreflopContext(assessment, actionHistory);
      logLiveDiagnostics(read, assessment, actionHistory, preflop, currentDiagnosticPacket);
      if (stateJson !== lastStateJson) {
        lastStateJson = stateJson;
        lastRecommendationRequestKey = null;
        requestSequence++;
        const { state, confidence, bigBlind, amountToCall, positions, decisionPot } = assessment;
        overlayState.street = state?.street ?? "unreadable";
        overlayState.opponentStatsLine = state ? state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded).map((s) => {
          const evidence = opponentStats.profile(s.playerName);
          return s.playerName + ": " + (evidence ? evidence.playerProfile.handsObserved + " observed windows / " + evidence.playerProfile.eligibleHands + " eligible hands (" + evidence.statsStorage + ")" : "identity ambiguous");
        }).join("; ") : null;
        overlayState.aiResult = null;
        overlayState.policyLine = null;
        overlayState.equityLine = null;
        overlayState.potOddsLine = null;
        overlayState.preflopLine = null;
        overlayState.aiWarnings = confidence.reasons;
        overlayState.aiStatus = "blocked";
        renderOverlay();
        if (!state) return;
        const hero = state.seats.find((s) => s.isYou);
        const heroPosition = hero ? positions.get(hero.seatNumber) : void 0;
        if (preflop) {
          overlayState.preflopLine = "Preflop: " + preflop.situation + (preflop.decisionSupport === "uncertain" ? " - insufficient strategic model / uncertain" : "");
          overlayState.aiWarnings = [...confidence.reasons, ...preflop.reasons];
          renderOverlay();
        }
        if (confidence.level === "low" || !hero || hero.stack === null || bigBlind === null || amountToCall === null || decisionPot === null || heroPosition === void 0 || !assessment.pot.isPotSemanticsVerified || assessment.pot.decisionPotSource === null) return;
        overlayState.aiStatus = "idle";
        if (state.street === "preflop") {
          if (!preflop) {
            overlayState.aiStatus = "blocked";
            overlayState.aiWarnings = ["Structured preflop context is unavailable."];
            renderOverlay();
            return;
          }
          const facing = amountToCall > 0 ? "raise" : "none";
          const packet = {
            hero: { holeCards: hero.holeCards, position: heroPosition, stackBB: hero.stack / bigBlind },
            table: { potBB: decisionPot / bigBlind, board: [], street: "preflop", numOpponentsRemaining: preflop.activeOpponents },
            facingAction: { type: facing, ...amountToCall > 0 ? { amountBB: amountToCall / bigBlind } : {} },
            candidateActions: deriveCandidateActions(facing),
            engineCalculations: {},
            dataConfidence: confidence.level,
            preflop,
            potEvidence: { ...assessment.pot, bigBlind },
            opponentContext: { opponents: state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded).map((s) => ({ seat: s.seatNumber, position: positions.get(s.seatNumber) ?? null, rangeBasis: "Preflop context remains uncertain", rangeConfidence: "low", rangeStatus: "prior_only", ...opponentStats.profile(s.playerName) ?? {} })) }
          };
          const uncertainty = preflopUncertainty(packet);
          overlayState.preflopLine = "Preflop: " + preflop.situation;
          if (uncertainty) {
            overlayState.aiStatus = "blocked";
            overlayState.aiWarnings = uncertainty;
          } else if (hero.isCurrentToAct && hero.holeCards.length === 2) {
            const requestKey = decisionRequestKey(requestSequence, stateJson);
            lastRecommendationRequestKey = requestKey;
            overlayState.aiStatus = "waiting";
            overlayState.policyLine = null;
            currentDiagnosticPacket = packet;
            logLiveDiagnostics(read, assessment, actionHistory, preflop, packet);
            requestRecommendation(packet, "structured preflop", requestKey);
          }
          renderOverlay();
          return;
        }
        if (hero && hero.holeCards.length === 2) {
          const numOpponents = state.seats.filter(
            (s) => s.isOccupied && !s.isYou && !s.isFolded
          ).length;
          if (numOpponents >= 1) {
            const opponents = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded);
            const estimates = opponents.map((opponent) => {
              const records = actionHistory.records.get(opponent.seatNumber) ?? [];
              return estimateOpponentRange({
                position: positions.get(opponent.seatNumber) ?? null,
                // Missing hero actions prevent counting observed raises as a complete sequence.
                actions: records.map((r) => ({
                  street: r.street,
                  action: r.action,
                  priorRaises: null,
                  facing: "unknown",
                  wagerAction: r.wagerAction,
                  observation: r.observation
                })),
                historyCoverage: "partial",
                effectiveStackBB: null,
                playersDealtIn: null,
                chipEvOnly: false,
                knownCards: [...hero.holeCards, ...state.board],
                tendencies: opponentStats.profile(opponent.playerName)?.playerProfile.stats
              });
            });
            const selection = calculateEquityForEstimates(hero.holeCards, estimates, state.board, { iterations: 3e3 });
            const equityResult = selection.equity === void 0 ? void 0 : { equity: selection.equity };
            const equitySource = selection.source;
            const opponentRangeContext = {
              estimatedRangeDescription: estimates.map((estimate, i) => "Seat " + opponents[i].seatNumber + ": " + estimate.basis).join("; "),
              rangeConfidence: selection.reason || estimates.some((e) => e.confidence === "low") ? "low" : "medium",
              rangeStatus: selection.equity === void 0 ? "unavailable" : estimates.every((e) => e.status === "modeled") ? "modeled" : "prior_only",
              rangeAssumptions: [
                ...actionHistory.notes,
                ...estimates.flatMap((e, i) => e.assumptions.map((reason) => "Seat " + opponents[i].seatNumber + ": " + reason)),
                ...opponents.length > 1 ? ["Multiway equity is showdown share of one common pot; side pots and future betting are not modeled."] : []
              ],
              rangeFallbacks: [...estimates.flatMap((e, i) => e.fallbacks.map((reason) => "Seat " + opponents[i].seatNumber + ": " + reason)), ...selection.reason ? [selection.reason] : []],
              opponents: estimates.map((estimate, i) => ({
                seat: opponents[i].seatNumber,
                position: positions.get(opponents[i].seatNumber) ?? null,
                rangeBasis: estimate.basis,
                rangeConfidence: estimate.confidence,
                rangeStatus: estimate.status,
                ...opponentStats.profile(opponents[i].playerName) ?? {}
              }))
            };
            overlayState.aiWarnings = [opponentRangeContext.estimatedRangeDescription, ...opponentRangeContext.rangeAssumptions, ...opponentRangeContext.rangeFallbacks];
            const equityLabel = equitySource === "estimated_multiway_ranges" ? "vs distinct opponent ranges; heuristic" : equitySource === "estimated_range" ? "vs estimated range; heuristic" : "vs random hands; ranges unavailable";
            overlayState.equityLine = equityResult ? "Equity: " + (equityResult.equity * 100).toFixed(1) + "% (" + equityLabel + ")" : "Equity unavailable: opponent range is uncertain";
            if (amountToCall > 0 && decisionPot > 0) {
              const potOdds = calculatePotOdds(decisionPot, amountToCall);
              console.log(
                `[Poker AI Reader] Amount to call: ${amountToCall}. Breakeven equity needed: ${potOdds.breakevenEquityPercent.toFixed(1)}%`
              );
              overlayState.potOddsLine = `To call: ${amountToCall} (breakeven: ${potOdds.breakevenEquityPercent.toFixed(1)}%)`;
            } else if (amountToCall === 0) {
              console.log("[Poker AI Reader] No bet facing hero (check or already matched) -- pot odds not applicable.");
              overlayState.potOddsLine = null;
            }
            renderOverlay();
            if (hero.isCurrentToAct) {
              const requestKey = decisionRequestKey(requestSequence, stateJson);
              if (requestKey !== lastRecommendationRequestKey) {
                lastRecommendationRequestKey = requestKey;
                overlayState.aiStatus = "waiting";
                overlayState.policyLine = null;
                overlayState.aiResult = null;
                overlayState.aiWarnings = opponentRangeContext ? [opponentRangeContext.estimatedRangeDescription ?? "", ...opponentRangeContext.rangeAssumptions ?? [], ...opponentRangeContext.rangeFallbacks ?? []] : [];
                renderOverlay();
                const packet = buildDecisionPacket({
                  state,
                  amountToCall,
                  equity: equityResult?.equity,
                  equitySource,
                  bigBlind,
                  decisionPot,
                  potProvenance: assessment.pot,
                  confidence,
                  heroPosition,
                  opponentRangeContext
                });
                currentDiagnosticPacket = packet;
                logLiveDiagnostics(read, assessment, actionHistory, preflop, packet);
                console.log(`[Poker AI Reader] Big blind detected: ${bigBlind}. Hero stackBB: ${packet.hero.stackBB.toFixed(2)}. Facing amountBB: ${packet.facingAction.amountBB?.toFixed(2) ?? "n/a"}`);
                console.log(
                  `[Poker AI Reader] It's hero's turn -- requesting AI recommendation for street=${state.street}, board=${JSON.stringify(state.board)}, decisionPot=${decisionPot}`
                );
                requestRecommendation(packet, `${state.street} | board: ${JSON.stringify(state.board)} | pot: ${decisionPot}`, requestKey);
              }
            }
          }
        }
      }
    } catch (error) {
      requestSequence++;
      lastRecommendationRequestKey = null;
      lastStateJson = null;
      previousGameState = null;
      actionHistory = emptyActionHistory();
      currentDiagnosticPacket = null;
      overlayState.aiResult = null;
      overlayState.aiStatus = "blocked";
      overlayState.street = "unreadable";
      overlayState.opponentStatsLine = null;
      overlayState.policyLine = null;
      overlayState.equityLine = null;
      overlayState.potOddsLine = null;
      overlayState.preflopLine = null;
      overlayState.aiWarnings = ["Live read/calculation failed; recommendation withheld."];
      console.error("[Poker AI Reader] Poll failed", error);
      renderOverlay();
    }
  }, 1e3);
})();
