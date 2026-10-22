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
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object7) => {
      const keys = [];
      for (const key in object7) {
        if (Object.prototype.hasOwnProperty.call(object7, key)) {
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
    setLimit(kind2, value, inclusive, message) {
      return new _ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: kind2,
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
    setLimit(kind2, value, inclusive, message) {
      return new _ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind: kind2,
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
  function identityKey(identity3) {
    const valid2 = PlayerIdentitySchema.parse(identity3);
    return JSON.stringify([valid2.kind, valid2.scope, valid2.value]);
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
  function estimateOpponentProfile(identity3, displayName, observations) {
    const hands = [...new Map(observations.filter((h) => identityKey(h.identity) === identityKey(identity3)).map((h) => [h.handId, h])).values()];
    const eligible = hands.filter((h) => h.coverage === "complete");
    const stats = Object.fromEntries(metricNames.map((name) => {
      const values = eligible.map((h) => h.metrics[name]).filter((v) => v !== null);
      return [name, shrinkRate(values.filter(Boolean).length, values.length, STAT_PRIORS[name])];
    }));
    const a = eligible.reduce((sum, h) => sum + (h.aggression?.betsAndRaises ?? 0), 0), c = eligible.reduce((sum, h) => sum + (h.aggression?.calls ?? 0), 0);
    const aggression = shrinkRate(a, a + c, STAT_PRIORS.aggression);
    return { identity: identity3, displayName, handsObserved: hands.length, eligibleHands: eligible.length, confidence: getConfidenceLevel(Math.min(stats.vpip.samples, stats.pfr.samples)), stats: { ...stats, aggression }, aggressionFactor: aggression.estimate / (1 - aggression.estimate), notes: [
      "Rates use (successes + priorMean * 40) / (eligible opportunities + 40). Priors are explicit modeling assumptions, not calibrated population measurements.",
      "handsObserved counts recorded observation windows; only eligible opportunities affect rates. Missing actions never count as false.",
      ...identity3.kind === "display_name" ? ["Identity is scoped table/display name; duplicate names and name reuse can collide, and renames split history."] : []
    ] };
  }

  // src/opponentStats.ts
  function createLiveOpponentClient(relay) {
    let handId = crypto.randomUUID(), lastSync = 0, busy = false;
    let storage = "pending";
    let players = [];
    const pending = /* @__PURE__ */ new Map(), cache = /* @__PURE__ */ new Map();
    let ambiguous = /* @__PURE__ */ new Set();
    const identity3 = (name) => ({ kind: "display_name", scope: location.origin + location.pathname, value: name });
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
          players = opponents.filter((s) => !ambiguous.has(s.playerName)).map((s) => ({ identity: identity3(s.playerName), displayName: s.playerName }));
          for (const seat of opponents) {
            if (ambiguous.has(seat.playerName)) continue;
            const observation = summarizeHand({
              handId,
              identity: identity3(seat.playerName),
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
        if (!name || name.length > 150 || identity3(name).scope.length > 500 || ambiguous.has(name)) return null;
        return { playerProfile: storage === "available" ? cache.get(identityKey(identity3(name))) ?? estimateOpponentProfile(identity3(name), name, []) : estimateOpponentProfile(identity3(name), name, []), statsStorage: storage };
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
  function cardId(card) {
    return (card.rank - 2) * 4 + SUITS.indexOf(card.suit);
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
  function validateSimulationInput(known2, boardCount, iterations) {
    if (![0, 3, 4, 5].includes(boardCount))
      throw new Error("Invalid board count");
    if (!Number.isSafeInteger(iterations) || iterations < 1)
      throw new Error("Iterations must be a positive integer");
    if (known2.some((c) => !Number.isInteger(c.rank) || c.rank < 2 || c.rank > 14 || !["s", "h", "d", "c"].includes(c.suit)))
      throw new Error("Invalid card");
    if (new Set(known2.map((c) => `${c.rank}${c.suit}`)).size !== known2.length)
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
    for (const [handStr, weight2] of range) {
      if (!Number.isFinite(weight2) || weight2 < 0 || weight2 > 1)
        throw new Error("Invalid range weight");
      if (weight2 === 0)
        continue;
      const combos = expandHandType(parseHandType(handStr)).length;
      total += combos * weight2;
    }
    return total;
  }
  function expandRange(range, excludeCards = []) {
    const excludeIds = new Set(excludeCards.map((c) => `${c.rank}${c.suit}`));
    const result = [];
    for (const [handStr, weight2] of range) {
      if (!Number.isFinite(weight2) || weight2 < 0 || weight2 > 1)
        throw new Error("Invalid range weight");
      if (weight2 === 0)
        continue;
      const combos = expandHandType(parseHandType(handStr));
      for (const combo of combos) {
        const overlaps = combo.some((c) => excludeIds.has(`${c.rank}${c.suit}`));
        if (!overlaps) {
          result.push({ cards: combo, weight: weight2 });
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
  var HAND_CATEGORY_NAMES = [
    "High Card",
    "Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush"
  ];

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
    const known2 = [...holeCards, ...board];
    const knownIds = new Set(known2.map((c) => `${c.rank}${c.suit}`));
    const unseenCards = fullDeck().filter((c) => !knownIds.has(`${c.rank}${c.suit}`));
    const currentCategory = evaluateBest(known2).category;
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

  // ../../packages/range-engine/dist/comboRange.js
  function comboKey(cards) {
    if (cards.length !== 2)
      throw new Error("A combination requires exactly two cards");
    validateSimulationInput(cards, 0, 1);
    const [a, b] = cards.map(cardId);
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }
  function createComboRange(entries) {
    const seen = /* @__PURE__ */ new Set();
    const combos = [];
    for (const entry of entries) {
      const key = comboKey(entry.cards);
      if (seen.has(key))
        throw new Error(`Duplicate combination: ${key}`);
      seen.add(key);
      if (!Number.isFinite(entry.weight) || entry.weight < 0 || entry.weight > 1) {
        throw new Error("Combination weight must be finite and between 0 and 1");
      }
      if (entry.weight === 0)
        continue;
      const cards = [Object.freeze({ ...entry.cards[0] }), Object.freeze({ ...entry.cards[1] })];
      combos.push(Object.freeze({ cards: Object.freeze(cards), weight: entry.weight }));
    }
    return Object.freeze({ kind: "combination", combos: Object.freeze(combos) });
  }
  function removeKnownCards(range, knownCards) {
    validateSimulationInput(knownCards, 0, 1);
    const validated = createComboRange(range.combos);
    const blocked = new Set(knownCards.map(cardId));
    return createComboRange(validated.combos.filter((combo) => !combo.cards.some((card) => blocked.has(cardId(card)))));
  }
  function expandEquityRange(range, knownCards) {
    if (range instanceof Map)
      return expandRange(range, knownCards);
    return removeKnownCards(range, knownCards).combos.map((combo) => ({
      cards: [combo.cards[0], combo.cards[1]],
      weight: combo.weight
    }));
  }

  // ../../packages/range-engine/dist/rangeEquity.js
  var DEFAULT_ITERATIONS2 = 1e4;
  function checkedRng(random) {
    return () => {
      const value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1)
        throw new Error("RNG must return a finite value in [0, 1)");
      return value;
    };
  }
  function weightedSample(combos, rng) {
    const totalWeight = combos.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) {
      throw new Error("Cannot sample from a range with zero total weight (empty or all-excluded range)");
    }
    let roll = rng() * totalWeight;
    for (const combo of combos) {
      if (roll < combo.weight)
        return combo;
      roll -= combo.weight;
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
    const rng = checkedRng(options.rng ?? Math.random);
    const cardsToComplete = 5 - board.length;
    const knownCards = [...heroCards2, ...board];
    validateSimulationInput(knownCards, board.length, iterations);
    const opponentCombos = expandEquityRange(opponentRange, knownCards);
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
      const weight2 = range.get(hand);
      result.set(hand, weight2);
      mass += rangeComboCount(/* @__PURE__ */ new Map([[hand, weight2]]));
      boundary = score;
    }
    return result;
  }
  function estimateOpponentRange(input) {
    const known2 = input.knownCards ?? [];
    if (new Set(known2.map((c) => c.rank + c.suit)).size !== known2.length)
      throw new Error("Duplicate known cards");
    let range = input.baseline ? new Map(input.baseline.range) : rangeFromList(allHandTypes().map(formatHandType));
    for (const [hand, weight2] of range) {
      parseHandType(hand);
      if (!Number.isFinite(weight2) || weight2 < 0 || weight2 > 1)
        throw new Error("Range weights must be finite and between 0 and 1");
      if (weight2 === 0)
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
    const available = (candidate) => expandRange(candidate, known2).some((c) => c.weight > 0);
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
                for (const [hand, weight2] of selected)
                  candidate.set(hand, weight2 * scale);
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
          candidate = new Map([...candidate].map(([hand, weight2]) => [hand, weight2 * (premiums.has(hand) ? 0.5 : 1)]));
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
    const combos = expandRange(range, known2);
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
  function cardId2(card) {
    if (!Number.isInteger(card.rank) || card.rank < 2 || card.rank > 14 || !suits.includes(card.suit))
      throw new Error("Invalid card");
    return suits.indexOf(card.suit) * 13 + card.rank - 2;
  }
  function masked(combo) {
    let low = 0, high = 0;
    for (const card of combo.cards) {
      const id = cardId2(card);
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
    const known2 = [...heroCards2, ...board];
    if (new Set(known2.map(cardId2)).size !== known2.length)
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
      const combos = expandEquityRange(range, known2).map(masked);
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
      const deck = new Deck(rng, [...known2, ...hands.flatMap((hand) => hand.cards)]);
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
    /** Independently proven decision-local window, never whole-hand coverage. */
    openingEvidence: external_exports.enum(["first_utg_hand_start", "hj_after_utg_fold", "co_after_utg_hj_folds", "btn_after_utg_hj_co_folds", "sb_after_utg_hj_co_btn_folds"]).optional(),
    /** Closed source-backed response context; explicitly NOT an RFI permission. */
    actionWindowEvidence: external_exports.enum(["hj_facing_utg_open5", "co_facing_utg_open5_hj_call5"]).optional(),
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

  // ../../packages/ai-core/dist/preflopPolicy.js
  var PreflopExecutionSchema = external_exports.object({
    heroIsCurrentToAct: external_exports.boolean(),
    sourceWindowKey: external_exports.string().min(1).max(1e5),
    /** Independent sizing evidence; selected input alone cannot populate this. */
    raiseBounds: external_exports.object({
      source: external_exports.string().min(1),
      verified: external_exports.boolean(),
      chipUnitBB: external_exports.number().finite().positive(),
      minRaiseToBB: external_exports.number().finite().positive()
    }).optional(),
    /** Empirical exact-size rule, NOT a general minimum/grid or live server ack. */
    exactOpeningSize: external_exports.object({
      rule: external_exports.enum(["pokernow-0.1.72-th-4fun-1-2-exact5-v1", "pokernow-0.1.72-th-4fun-1-2-sb-exact5-v1"]),
      /** Legacy absence is UTG-only; later positions require an explicit bound window. */
      decisionWindow: external_exports.enum(["first_utg_boundary", "hj_after_utg_fold", "co_after_utg_hj_folds", "btn_after_utg_hj_co_folds", "sb_after_utg_hj_co_btn_folds"]).optional(),
      provenance: external_exports.string().min(1).max(2e3),
      tableId: external_exports.string().min(1),
      handId: external_exports.string().min(1),
      heroId: external_exports.string().min(1),
      heroSeat: external_exports.number().int().positive(),
      generation: external_exports.number().int().positive(),
      sourceCursor: external_exports.number().int().nonnegative(),
      decisionEpoch: external_exports.string().min(1),
      receivedAt: external_exports.number().finite(),
      expiresAt: external_exports.number().finite(),
      units: external_exports.literal("chips"),
      bigBlindChips: external_exports.literal(2),
      contributionChips: external_exports.union([external_exports.literal(0), external_exports.literal(1)]),
      raiseToChips: external_exports.literal(5),
      investmentChips: external_exports.union([external_exports.literal(4), external_exports.literal(5)]),
      remainingStackChips: external_exports.number().finite().min(200),
      controls: external_exports.enum(["panel_closed_unchecked", "selected_amount_matches", "selected_amount_differs"])
    }).superRefine((size, ctx) => {
      const sb = size.decisionWindow === "sb_after_utg_hj_co_btn_folds";
      if (size.rule !== (sb ? "pokernow-0.1.72-th-4fun-1-2-sb-exact5-v1" : "pokernow-0.1.72-th-4fun-1-2-exact5-v1") || size.contributionChips !== (sb ? 1 : 0) || size.investmentChips !== (sb ? 4 : 5))
        ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: "Exact opening rule, window and total/additional amounts must agree." });
    }).optional(),
    controls: external_exports.object({
      source: external_exports.string().min(1),
      formVisible: external_exports.boolean(),
      raiseSubmitVisible: external_exports.boolean(),
      raiseSubmitEnabled: external_exports.boolean().nullable(),
      selectedRaiseToBB: external_exports.number().finite().nonnegative().nullable(),
      issues: external_exports.array(external_exports.string()).max(32)
    })
  });
  var RFI_STRATEGY_SOURCE = "openingRanges.ts: six-max 100BB+ RFI reference; raise-or-fold, fixed 2.5BB opening convention";
  var order = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
  var near = (a, b) => Math.abs(a - b) < 1e-8;
  function unopenedChartAction(packet) {
    if (packet.table.street !== "preflop" || !packet.preflop)
      return null;
    let context;
    try {
      context = buildPreflopContext(packet.preflop);
    } catch {
      return null;
    }
    const depths = context.effectiveStacks.map((p) => p.effectiveStackBB);
    const reference = getPreflopOpeningReference({
      position: context.heroPosition,
      effectiveStackBB: depths.length && depths.every((n) => n !== null) ? Math.min(...depths) : null,
      playersDealtIn: context.playersDealtIn ?? 0,
      unopened: context.situation === "unopened"
    });
    if (!reference)
      return null;
    const [a, b] = packet.hero.holeCards;
    const weight2 = reference.get(formatHandType({
      highRank: a.rank >= b.rank ? a.rank : b.rank,
      lowRank: a.rank >= b.rank ? b.rank : a.rank,
      suited: a.suit === b.suit
    })) ?? 0;
    return weight2 === 0 ? "FOLD" : weight2 === 1 ? "RAISE" : null;
  }
  function evaluatePreflopReference(packet) {
    const fail = (reason) => ({
      action: null,
      raiseToBB: null,
      investmentBB: null,
      reasons: [reason],
      strategySource: RFI_STRATEGY_SOURCE,
      explanation: ""
    });
    if (!packet.preflop)
      return fail("Structured preflop window is missing.");
    let context;
    try {
      context = buildPreflopContext(packet.preflop);
    } catch {
      return fail("Preflop context cannot be validated.");
    }
    if (context.situation !== "unopened")
      return fail("No deterministic response table for facing an open, limps, re-raises or an unclassified window.");
    if (context.heroPosition === "BB")
      return fail("BB option is outside the raise-first-in chart; checking is not a voluntary open.");
    const execution = packet.preflopExecution;
    if (!execution?.heroIsCurrentToAct)
      return fail("Hero is not proven current to act.");
    if (!execution.sourceWindowKey)
      return fail("Current source/action window is unbound.");
    if (packet.table.street !== "preflop" || packet.table.board.length || new Set(packet.hero.holeCards.map((c) => `${c.rank}${c.suit}`)).size !== 2)
      return fail("Invalid preflop cards/street.");
    if (context.historyCoverage !== "complete" || context.contributionMeaning !== "street_total" || context.historyNotes.length)
      return fail("Ordered preflop window has unresolved evidence.");
    if (context.playersDealtIn !== 6 || context.players.length !== 6 || order.some((position2) => context.players.filter((p) => p.position === position2).length !== 1))
      return fail("Six dealt-in players with six distinct proven positions are required.");
    const hero = context.players.find((p) => p.seat === context.heroSeat);
    if (hero.folded || context.players.some((p) => p.allIn) || context.tournamentContext !== "chip_ev_only")
      return fail("All-ins, inactive hero or unknown tournament/ante context are unsupported.");
    if (context.heroPosition !== packet.hero.position || context.heroStackBB !== packet.hero.stackBB || context.activeOpponents !== packet.table.numOpponentsRemaining || context.amountToCallBB === null || context.amountToCallBB !== packet.facingAction.amountBB)
      return fail("Preflop facts contradict packet stack, call, position, roster or pot.");
    const events = [...context.actions].sort((a2, b2) => a2.observation - b2.observation);
    if (new Set(events.map((a2) => a2.observation)).size !== events.length)
      return fail("Blind/action ordering is ambiguous.");
    const posts = events.filter((a2) => a2.action === "post_blind");
    const firstUtg2 = context.openingEvidence === "first_utg_hand_start";
    const firstHj = context.openingEvidence === "hj_after_utg_fold";
    const firstCo = context.openingEvidence === "co_after_utg_hj_folds";
    const firstBtn = context.openingEvidence === "btn_after_utg_hj_co_folds";
    const firstSb = context.openingEvidence === "sb_after_utg_hj_co_btn_folds";
    if (firstSb && (context.heroPosition !== "SB" || events.length !== 4 || posts.length))
      return fail("SB fold-prefix evidence requires exactly UTG, HJ, CO and BTN folds and normal boundary blinds.");
    if (firstBtn && (context.heroPosition !== "BTN" || events.length !== 3 || posts.length))
      return fail("BTN fold-prefix evidence supports exactly UTG, HJ and CO folds and boundary blind totals.");
    if (firstUtg2 && (context.heroPosition !== "UTG" || events.length !== 0))
      return fail("First UTG boundary evidence cannot certify a later turn or prior voluntary action.");
    if (firstHj && (context.heroPosition !== "HJ" || events.length !== 1 || posts.length))
      return fail("HJ fold-prefix evidence supports exactly one prior UTG fold and boundary blind totals.");
    if (firstCo && (context.heroPosition !== "CO" || events.length !== 2 || posts.length))
      return fail("CO fold-prefix evidence supports exactly UTG then HJ folds and boundary blind totals.");
    if (!firstUtg2 && !firstHj && !firstCo && !firstBtn && !firstSb && (posts.length !== 2 || posts.some((a2) => {
      const position2 = context.players.find((p) => p.seat === a2.seat)?.position;
      return a2.totalContributionBB !== (position2 === "SB" ? 0.5 : position2 === "BB" ? 1 : -1);
    }) || new Set(posts.map((a2) => a2.seat)).size !== 2 || events.slice(0, 2).some((a2) => a2.action !== "post_blind")))
      return fail("Exactly two ordered normal blind posts are required; no antes, straddles or extra posts.");
    const heroIndex = order.indexOf(packet.hero.position);
    const voluntary = events.filter((a2) => a2.action !== "post_blind");
    if (voluntary.length !== heroIndex || voluntary.some((a2, i) => a2.action !== "fold" || context.players.find((p) => p.seat === a2.seat)?.position !== order[i] || a2.totalContributionBB !== 0))
      return fail("Hero must be first voluntary bettor after exactly the preceding positions folded in order.");
    if (context.players.some((p) => p.folded !== order.indexOf(p.position) < heroIndex || p.contributionBB !== (p.position === "SB" ? 0.5 : p.position === "BB" ? 1 : 0)))
      return fail("Roster/folds/contributions contradict the unopened action window.");
    const depths = context.effectiveStacks.map((p) => p.effectiveStackBB);
    const reference = getPreflopOpeningReference({
      position: context.heroPosition,
      effectiveStackBB: depths.length && depths.every((n) => n !== null) ? Math.min(...depths) : null,
      playersDealtIn: context.playersDealtIn,
      unopened: true
    });
    if (!reference)
      return fail("Reference requires 100BB+ effective stacks against every active opponent; no short-stack or response chart exists.");
    if (!near(1 - hero.contributionBB, context.amountToCallBB) || context.amountToCallBB <= 0 || packet.facingAction.type === "none" || packet.facingAction.type === "all_in")
      return fail("Current action legality and blind call cost must be independently proven.");
    const [a, b] = packet.hero.holeCards;
    const hand = formatHandType({
      highRank: a.rank >= b.rank ? a.rank : b.rank,
      lowRank: a.rank >= b.rank ? b.rank : a.rank,
      suited: a.suit === b.suit
    });
    const weight2 = reference.get(hand) ?? 0;
    if (weight2 !== 0 && weight2 !== 1)
      return fail("Mixed-frequency chart entries are unsupported by this deterministic reference policy.");
    const action2 = weight2 === 1 ? "RAISE" : "FOLD";
    if (!packet.candidateActions.includes(action2))
      return fail("Reference action is absent from the proven legal action set.");
    if (action2 === "FOLD")
      return {
        action: action2,
        raiseToBB: null,
        investmentBB: null,
        reasons: [],
        strategySource: RFI_STRATEGY_SOURCE,
        explanation: `${hand} is outside the ${packet.hero.position} six-max 100BB+ RFI reference. Fold; no limp strategy is modeled.`
      };
    const raiseToBB = 2.5, investmentBB = raiseToBB - hero.contributionBB;
    const controls = execution.controls;
    const legal = execution.raiseBounds;
    const exact = execution.exactOpeningSize;
    if (firstSb && !exact)
      return fail("SB RAISE requires its dependent exact-five-chip sizing certificate; no substitution with FOLD.");
    if (firstHj && !exact)
      return fail("HJ RAISE requires its dependent exact-five-chip sizing certificate; no substitution with FOLD.");
    if (firstCo && !exact)
      return fail("CO RAISE requires its dependent exact-five-chip sizing certificate; no substitution with FOLD.");
    if (firstBtn && !exact)
      return fail("BTN RAISE requires its dependent exact-five-chip sizing certificate; no substitution with FOLD.");
    if (exact) {
      const now = Date.now();
      if (exact.rule !== (firstSb ? "pokernow-0.1.72-th-4fun-1-2-sb-exact5-v1" : "pokernow-0.1.72-th-4fun-1-2-exact5-v1") || !(firstUtg2 && (exact.decisionWindow === void 0 || exact.decisionWindow === "first_utg_boundary") || firstHj && exact.decisionWindow === "hj_after_utg_fold" || firstCo && exact.decisionWindow === "co_after_utg_hj_folds" || firstBtn && exact.decisionWindow === "btn_after_utg_hj_co_folds" || firstSb && exact.decisionWindow === "sb_after_utg_hj_co_btn_folds") || hero.contributionBB !== (firstSb ? 0.5 : 0) || context.heroSeat !== exact.heroSeat || exact.units !== "chips" || exact.bigBlindChips !== 2 || exact.contributionChips !== (firstSb ? 1 : 0) || exact.raiseToChips !== 5 || exact.investmentChips !== (firstSb ? 4 : 5) || exact.remainingStackChips !== packet.hero.stackBB * 2 || investmentBB >= packet.hero.stackBB || packet.potEvidence?.bigBlind !== 2 || packet.decisionProofs?.handId !== `${exact.tableId}:hand:${exact.handId}` || packet.decisionProofs?.connectionGeneration !== exact.generation || packet.decisionProofs?.decisionEpoch !== exact.decisionEpoch || exact.expiresAt !== exact.receivedAt + 1e4 || now < exact.receivedAt || now >= exact.expiresAt)
        return fail("Exact five-chip opening rule is outside its bound profile, decision, capacity or original freshness window.");
      if (controls.issues.length || (exact.controls === "panel_closed_unchecked" ? controls.formVisible || controls.raiseSubmitVisible || controls.selectedRaiseToBB !== null : !controls.formVisible || !controls.raiseSubmitVisible || controls.raiseSubmitEnabled !== true || controls.selectedRaiseToBB === null || controls.selectedRaiseToBB < hero.contributionBB || controls.selectedRaiseToBB - hero.contributionBB > packet.hero.stackBB || (exact.controls === "selected_amount_matches" ? controls.selectedRaiseToBB !== 2.5 : controls.selectedRaiseToBB === 2.5)))
        return fail("Current Raise controls contradict the independently certified exact size.");
    } else {
      if (!legal?.verified || legal.minRaiseToBB <= 1 || raiseToBB < legal.minRaiseToBB || investmentBB >= packet.hero.stackBB || !Number.isFinite(legal.chipUnitBB) || legal.chipUnitBB <= 0 || !near(investmentBB / legal.chipUnitBB, Math.round(investmentBB / legal.chipUnitBB)) || !near(raiseToBB / legal.chipUnitBB, Math.round(raiseToBB / legal.chipUnitBB)))
        return fail("2.5BB opening size is outside independently proven minimum, reopening, chip-unit or capacity bounds.");
      if (!controls.formVisible || !controls.raiseSubmitVisible || controls.raiseSubmitEnabled !== true || controls.issues.length || controls.selectedRaiseToBB === null || !near(controls.selectedRaiseToBB, raiseToBB))
        return fail("Visible enabled PokerNow Raise control must independently match the 2.5BB total; selected amount never proves the minimum.");
    }
    return {
      action: action2,
      raiseToBB,
      investmentBB,
      reasons: [],
      strategySource: RFI_STRATEGY_SOURCE,
      explanation: `${hand} is inside the ${packet.hero.position} six-max 100BB+ RFI reference. Raise to 2.5BB (${investmentBB}BB additional). Fixed sizing convention, not a solved optimum or EV estimate.${exact ? " Exact 5-chip profile rule supported by historical server acceptance; no live server preflight. Manual action only." : ""}`
    };
  }

  // ../../packages/ai-core/dist/decisionProofs.js
  var PROOF_SCOPES = [
    "decisionState",
    "connection",
    "actionWindow",
    "position",
    "roster",
    "blinds",
    "stack",
    "callCost",
    "pot",
    "eligibility",
    "accounting",
    "legalActions",
    "raiseLegality",
    "reopening",
    "rangeInput",
    "equity",
    "terminal"
  ];
  var ScopedProofSchema = external_exports.object({
    scope: external_exports.enum(PROOF_SCOPES),
    status: external_exports.enum(["proven", "insufficient", "contradicted"]),
    confidence: external_exports.enum(["high", "medium", "low"]),
    provenance: external_exports.array(external_exports.string().trim().min(1).max(2e3)).max(32),
    reasons: external_exports.array(external_exports.string().trim().min(1).max(2e3)).max(32)
  });
  var DecisionProofsSchema = external_exports.object({
    version: external_exports.literal(1),
    /** Bound to this packet's facts, model inputs and local decision epoch; not a source certificate. */
    binding: external_exports.string().min(1).max(25e4),
    decisionEpoch: external_exports.string().min(1).max(256),
    handId: external_exports.string().min(1).max(256).nullable(),
    connectionGeneration: external_exports.number().int().positive().nullable(),
    proofs: external_exports.array(ScopedProofSchema).max(PROOF_SCOPES.length)
  });
  function assessDecisionProofs(input, evidence) {
    const type = input.street === null ? "unclassified" : input.street === "preflop" ? input.preflopSituation === "unopened" || input.preflopRfiCandidate ? "preflop_unopened" : input.preflopSituation === "facing_open" ? "preflop_facing_open" : "preflop_unclassified" : input.opponents === null ? "unclassified" : input.opponents !== 1 ? "multiway_postflop" : input.amountToCall === null ? "unclassified" : input.amountToCall > 0 ? "heads_up_call_fold" : "heads_up_bet_check";
    const required = type === "preflop_unopened" ? ["decisionState", "connection", "actionWindow", "position", "roster", "blinds", "stack", "callCost"] : ["decisionState", "connection", "actionWindow", "blinds", "stack", "callCost", "pot", "eligibility", "accounting", "legalActions"];
    if (type === "preflop_unopened") {
      if (input.preflopAction !== "FOLD")
        required.push("raiseLegality");
    } else if (input.street === "preflop")
      required.push("position", "roster", "raiseLegality", "reopening");
    else {
      required.push("rangeInput", "equity", "terminal", "reopening");
      if (input.amountToCall === 0 || input.aggressionPossible !== false)
        required.push("raiseLegality");
    }
    const proofs = PROOF_SCOPES.map((scope) => {
      const matches = evidence.filter((p) => p.scope === scope);
      let proof = matches[0] ?? { scope, status: "insufficient", confidence: "low", provenance: [], reasons: [`${scope}: no independent evidence supplied.`] };
      if (matches.length > 1)
        proof = { scope, status: "contradicted", confidence: "low", provenance: [], reasons: [`${scope}: duplicate proof entries are ambiguous.`] };
      if (proof.status === "proven" && (proof.confidence !== "high" || !proof.provenance.some((s) => s.trim()) || proof.reasons.length)) {
        proof = { ...proof, status: "insufficient", reasons: [...proof.reasons, `${scope}: a proven fact needs high evidence confidence, provenance and no unresolved reasons.`] };
      }
      return { ...proof, permits: proof.status === "proven" && required.includes(scope) ? [type] : [] };
    });
    const failed = proofs.filter((p) => required.includes(p.scope) && p.status !== "proven");
    const contradicted = failed.some((p) => p.status === "contradicted");
    const unsupported = type === "multiway_postflop";
    return {
      allowed: !failed.length && !unsupported && type !== "unclassified" && type !== "preflop_unclassified",
      state: contradicted ? "unsafe" : unsupported ? "unsupported" : failed.length || type === "unclassified" || type === "preflop_unclassified" ? "waiting_for_proof" : "proof_ready",
      supportedDecisionType: type,
      requiredProofs: required,
      failedProofs: failed.map((p) => p.scope),
      proofs,
      reasons: [
        ...unsupported ? ["Multiway postflop decisions, including side-pot EV, are unsupported."] : [],
        ...type === "preflop_unclassified" ? ["Preflop action level is unproven or outside the unopened/single-open scope; bet size does not establish it."] : [],
        ...failed.flatMap((p) => p.reasons.length ? p.reasons : [`${p.scope}: ${p.status}.`])
      ]
    };
  }
  function decisionProofBinding(packet, epoch) {
    const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== void 0).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
    return JSON.stringify(canonical({
      epoch,
      handId: packet.decisionProofs?.handId ?? null,
      connectionGeneration: packet.decisionProofs?.connectionGeneration ?? null,
      hero: packet.hero,
      table: packet.table,
      facingAction: packet.facingAction,
      candidateActions: packet.candidateActions,
      preflop: packet.preflop ?? null,
      potEvidence: packet.potEvidence ?? null,
      preflopExecution: packet.preflopExecution ?? null,
      policyContext: packet.policyContext ?? null,
      engineCalculations: packet.engineCalculations,
      opponentContext: packet.opponentContext ?? null,
      dataConfidence: packet.dataConfidence
    }));
  }
  function assessPacketDecisionProofs(packet, requireProofs = false) {
    if (!requireProofs && !packet.potEvidence && !packet.decisionProofs)
      return null;
    const envelope = packet.decisionProofs;
    const evidence = envelope ? envelope.proofs.map((p) => ({ ...p })) : [];
    const replace = (scope, status, reason) => {
      if (status !== "contradicted" && evidence.some((p) => p.scope === scope && p.status === "contradicted"))
        return;
      for (let i = evidence.length - 1; i >= 0; i--)
        if (evidence[i].scope === scope)
          evidence.splice(i, 1);
      evidence.push({ scope, status, confidence: "low", provenance: ["DecisionPacket cross-check"], reasons: [reason] });
    };
    if (envelope && envelope.binding !== decisionProofBinding(packet, envelope.decisionEpoch))
      replace("decisionState", "contradicted", "Scoped proofs belong to different decision facts/model inputs; refresh evidence.");
    if (envelope && (!envelope.handId || envelope.connectionGeneration === null))
      replace("connection", "insufficient", "Hand identity/connection generation is missing from the scoped evidence.");
    const rfiCandidate = packet.table.street === "preflop" && (packet.preflop?.situation === "unopened" || !!packet.preflopExecution && packet.preflop?.situation === "unknown");
    if (!rfiCandidate && packet.dataConfidence !== "high")
      replace("decisionState", "insufficient", "Existing table-read confidence gate is not high.");
    if (!packet.potEvidence?.isPotSemanticsVerified || packet.potEvidence.decisionPot === null || !packet.potEvidence.decisionPotSource) {
      replace("pot", "insufficient", "No independently verified contestable decision pot.");
    }
    if (packet.policyContext?.accounting !== "single_pot_no_rake")
      replace("accounting", "insufficient", "Returns, side-pot eligibility and rake/drop are not independently excluded/resolved for this decision.");
    const call = packet.facingAction.amountBB ?? 0;
    if (packet.facingAction.type !== "none" !== call > 0 || call > packet.hero.stackBB)
      replace("callCost", "contradicted", "Call amount contradicts facing action or exceeds remaining capacity.");
    const preflop = packet.preflop;
    if (packet.table.street === "preflop" && (!preflop || preflop.historyCoverage !== "complete" || preflop.contributionMeaning !== "street_total" || preflop.situation === "facing_raise_unknown_level")) {
      replace("actionWindow", "insufficient", "Preflop classification needs a complete ordered preflop window, not complete whole-hand history or wager size alone.");
    }
    const ctx = packet.policyContext;
    if (packet.table.street !== "preflop") {
      if (!ctx?.legal.verified)
        replace("legalActions", "insufficient", "Exact current legal action set is unproven.");
      if (!ctx?.equity || packet.engineCalculations.equitySource !== "estimated_range" || packet.opponentContext?.rangeStatus !== "modeled" || packet.opponentContext.rangeConfidence !== "medium")
        replace("rangeInput", "insufficient", "A modeled heads-up range and explicit equity sensitivity bounds are required.");
      if (packet.table.street !== "river" || (call > 0 ? !ctx?.terminalAfterCall : !ctx?.checkEndsHand))
        replace("terminal", "insufficient", "Existing strategy does not model future betting/equity realization for this simple non-all-in decision.");
      if (ctx && (ctx.legal.opponentStackBB === 0 || call === packet.hero.stackBB || packet.facingAction.type === "all_in"))
        replace("eligibility", "insufficient", "All-in/short-call eligibility is outside the scoped simple-pot live subset.");
    }
    const activation = assessDecisionProofs({
      street: packet.table.street,
      opponents: packet.table.numOpponentsRemaining,
      amountToCall: call,
      preflopSituation: preflop?.situation ?? null,
      preflopRfiCandidate: rfiCandidate,
      preflopAction: unopenedChartAction(packet),
      aggressionPossible: ctx?.legal.aggressionReopened ?? null
    }, evidence);
    if (packet.table.street === "preflop" && activation.state !== "unsafe") {
      if (!rfiCandidate) {
        activation.allowed = false;
        activation.state = "unsupported";
        activation.reasons.push("No deterministic preflop response model for this situation; only the scoped six-max 100BB+ unopened reference is implemented.");
      }
    } else if (packet.table.street !== "river" && activation.state !== "unsafe") {
      activation.allowed = false;
      activation.state = "unsupported";
      activation.reasons.push("Simple flop/turn bet/check and call/fold require an equity-realization/future-betting model that is not implemented.");
    }
    return activation;
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
  var near2 = (a, b) => Math.abs(a - b) < EPS;
  function potEvidenceProblems(packet) {
    const evidence = packet.potEvidence;
    if (!evidence)
      return [];
    if (!evidence.isPotSemanticsVerified || evidence.decisionPot === null || !evidence.decisionPotSource) {
      return ["Live decision-pot semantics/provenance are unverified."];
    }
    if (packet.table.potBB === null || !near2(evidence.decisionPot / evidence.bigBlind, packet.table.potBB)) {
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
    const onGrid2 = (value) => near2(value / legal.chipUnitBB, Math.round(value / legal.chipUnitBB));
    const problems = potEvidenceProblems(packet);
    if (!legal.verified)
      problems.push("Exact action legality has not been verified.");
    if (legal.heroStreetBetBB > legal.opponentStreetBetBB || !near2(call, packet.facingAction.amountBB ?? 0) || call > 0 !== (packet.facingAction.type !== "none")) {
      problems.push("Street contributions contradict the facing action/call cost.");
    }
    if (call > packet.hero.stackBB)
      problems.push("An unmatched all-in/short call needs separate pot accounting.");
    if (packet.table.potBB === null || packet.table.potBB + EPS < legal.heroStreetBetBB + legal.opponentStreetBetBB) {
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
    ].every(onGrid2)) {
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
    if (!near2(investmentBB / legal.chipUnitBB, Math.round(investmentBB / legal.chipUnitBB)))
      return ["Wager is not on the verified chip unit."];
    const total = legal.heroStreetBetBB + investmentBB;
    const minimum = call > 0 ? legal.minRaiseToBB : legal.heroStreetBetBB + legal.minBetBB;
    if (total + EPS < minimum && !near2(investmentBB, packet.hero.stackBB))
      return ["Wager is below the verified legal minimum."];
    return [];
  }
  function generatePolicyCandidates(packet) {
    const activation = assessPacketDecisionProofs(packet);
    if (activation && !activation.allowed)
      return [];
    const ctx = packet.policyContext;
    if (packet.table.street === "preflop" || packet.table.potBB === null || !ctx || !ctx.potVerified || ctx.accounting !== "single_pot_no_rake" || packet.table.numOpponentsRemaining !== 1 || policyContextProblems(packet, ctx).length || !ctx.legal.aggressionReopened)
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
    sizes.push({ amount: cap, basis: `${near2(cap, packet.hero.stackBB) ? "shove" : "effective stack cap"}; SPR ${Number.isFinite(spr) ? spr.toFixed(2) : "undefined"}` });
    const candidates = /* @__PURE__ */ new Map();
    for (const size of sizes) {
      const investmentBB = Number((Math.floor((size.amount + EPS) / legal.chipUnitBB) * legal.chipUnitBB).toFixed(8));
      if (investmentBB <= call || investmentBB > cap + EPS)
        continue;
      const raiseToBB = legal.heroStreetBetBB + investmentBB;
      const shove = near2(investmentBB, packet.hero.stackBB);
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
    const result = evaluatePolicyWithProofs(packet);
    if (result.activation?.allowed && result.status !== "selected") {
      result.activation = {
        ...result.activation,
        allowed: false,
        state: result.status === "unsupported" ? "unsupported" : "waiting_for_proof",
        reasons: [...result.activation.reasons, ...result.reasons]
      };
    }
    return result;
  }
  function evaluatePolicyWithProofs(packet) {
    const activation = assessPacketDecisionProofs(packet);
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
      llmMayChoose: activation === null,
      ...activation ? { activation } : {}
    };
    const stop = (reason) => {
      result.reasons.push(reason);
      return result;
    };
    if (activation && !activation.allowed) {
      result.reasons.push(...activation.reasons);
      return result;
    }
    if (packet.table.street === "preflop") {
      result.llmMayChoose = false;
      if (!activation)
        return stop("Scoped proofs are mandatory for the deterministic preflop reference.");
      const reference = evaluatePreflopReference(packet);
      result.strategySource = reference.strategySource;
      result.reasons.push(...reference.reasons);
      if (!reference.action)
        return result;
      result.status = "selected";
      result.chosenAction = reference.action;
      result.chosenSizeBB = reference.investmentBB;
      result.raiseToBB = reference.raiseToBB;
      result.ruleExplanation = reference.explanation;
      result.confidence = "medium";
      result.assumptions = [
        "Six-max normal blinds, no antes/straddles; 100BB+ effective; chip-EV context.",
        "Existing reference membership, not a solver or an EV comparison. Fixed 2.5BB opening convention."
      ];
      result.equitySource = "not used by the RFI reference";
      result.foldEquitySource = "not assumed";
      return result;
    }
    const potProblems = potEvidenceProblems(packet);
    if (potProblems.length) {
      result.reasons.push(...potProblems);
      result.llmMayChoose = false;
      return result;
    }
    if (packet.dataConfidence !== "high" || packet.table.potBB === null) {
      result.llmMayChoose = false;
      return stop("High table-read confidence and a known decision pot are required by the EV policy.");
    }
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
    if (!eq || packet.engineCalculations.equity === void 0 || !near2(eq.estimate, packet.engineCalculations.equity) || packet.engineCalculations.equitySource !== "estimated_range" || packet.opponentContext?.rangeStatus !== "modeled") {
      return stop("A modeled heads-up range, matching equity estimate and explicit uncertainty bounds are required; random-hand equity is not a policy input.");
    }
    result.equitySource += `: ${eq.source}`;
    if (call > 0 && !ctx.terminalAfterCall || call === 0 && (!ctx.checkEndsHand || packet.table.street !== "river")) {
      return stop("Future betting/equity realization is unmodeled; a check is not automatically worth zero.");
    }
    if (call > 0 && packet.table.street !== "river" && ctx.legal.opponentStackBB > 0 && !near2(call, packet.hero.stackBB)) {
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
      const matches = ctx.responses.filter((r) => near2(r.investmentBB, candidate.investmentBB));
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
      potBB: external_exports.number().finite().nonnegative().nullable(),
      // Null is allowed only for the non-EV preflop reference.
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
    /** Current controls/window observations; independent scoped proofs are still mandatory. */
    preflopExecution: PreflopExecutionSchema.optional(),
    /** Optional evidence for the conservative deterministic policy; never an LLM action. */
    policyContext: PolicyContextSchema.optional(),
    /** Decision-local facts; global historyComplete remains a separate diagnostic. */
    decisionProofs: DecisionProofsSchema.optional(),
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
  var CLAIM_PREFIX = "\\b(?:hero|you|we)(?:['\\u2019]ve)?\\s+(?:(?:only|just|already|now|currently|still|is|are)\\s+)*(?:has|have|had|hold|holds|holding|made|make|makes|flopped|turned|hit|hits|got|own|owns)";
  var FILLER_WORDS = "only|just|a|an|the|top|middle|bottom|weak|strong|marginal|made|nut|low|high|small|big|solid|decent|current|already|now|still";
  var NOT_A_MADE_HAND = "draws?|possibilit\\w*|potential|outs?|blockers?|equity";
  function findHeroClaimedHandCategories(text2) {
    const found = [];
    for (const { name, pattern } of CATEGORY_PATTERNS) {
      const claim = new RegExp(`${CLAIM_PREFIX}(?:${SEP}+(?:${FILLER_WORDS})){0,4}${SEP}+(?:${pattern})\\b(?!${SEP}+(?:${NOT_A_MADE_HAND}))`, "i");
      if (claim.test(text2))
        found.push(name);
    }
    return found;
  }
  function validateReasoningConsistency(recommendation, packet) {
    const warnings = [];
    const allCards = [...packet.hero.holeCards, ...packet.table.board];
    if (allCards.length >= 5) {
      const actualCategory = HAND_CATEGORY_NAMES[evaluateBest(allCards).category];
      const claimed = findHeroClaimedHandCategories(recommendation.reasoning);
      if (claimed.length > 0 && !claimed.includes(actualCategory)) {
        warnings.push(`Reasoning claims hero has ${claimed.join("/")} but hero's actual made hand is ${actualCategory}.`);
      }
    }
    return { isConsistent: warnings.length === 0, warnings };
  }

  // ../../packages/ai-core/dist/policyRecommendation.js
  function engineExplanation(policy) {
    if (policy.ruleExplanation)
      return {
        action: policy.chosenAction,
        ...policy.chosenSizeBB === null ? {} : { sizingBB: policy.chosenSizeBB },
        confidence: 0.65,
        reasoning: policy.ruleExplanation
      };
    const best = policy.actionEVs.find((row) => row.action === policy.chosenAction && (policy.chosenSizeBB === null ? row.investmentBB === 0 : row.investmentBB === policy.chosenSizeBB));
    return {
      action: policy.chosenAction,
      ...policy.chosenSizeBB === null ? {} : { sizingBB: policy.chosenSizeBB },
      // Compatibility with the old UI's numeric confidence; not a calibrated win probability.
      confidence: 0.65,
      reasoning: `${best.action}${best.investmentBB ? `: invest ${best.investmentBB}BB${best.raiseToBB === void 0 ? "" : ` (street total ${best.raiseToBB}BB)`}` : ""}. Estimated EV ${best.evBB.toFixed(2)}BB, sensitivity bounds ${best.lowBB.toFixed(2)} to ${best.highBB.toFixed(2)}BB. Preferred within the supported comparison, conditional on: ${policy.assumptions.join(" ")} Equity: ${policy.equitySource}. Fold equity: ${policy.foldEquitySource}.`
    };
  }
  function lockedEngineRecommendation(policy) {
    return policy.status === "selected" && policy.activation?.allowed === true && policy.llmMayChoose === false && policy.chosenAction !== null ? engineExplanation(policy) : null;
  }

  // ../../packages/ai-core/dist/preflopResponsePolicy.js
  var HJ_RESPONSE_POLICY_VERSION = "hj-vs-utg-2.5bb-reference-v1";
  var HJ_RESPONSE_PROFILE = "pokernow-0.1.72-th-4fun-1-2-exact5-v1";
  var positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
  var handTypes = new Set(allHandTypes().map(formatHandType));
  var text = external_exports.string().trim().min(1).max(2e3);
  var weight = external_exports.number().finite().min(0).max(1);
  var depth = external_exports.number().finite().min(100);
  var allocation = external_exports.discriminatedUnion("action", [
    external_exports.object({ action: external_exports.literal("FOLD"), frequency: weight }).strict(),
    external_exports.object({ action: external_exports.literal("CALL"), frequency: weight }).strict(),
    external_exports.object({
      action: external_exports.literal("THREE_BET"),
      frequency: weight,
      raiseToBB: external_exports.number().finite().gt(2.5)
    }).strict()
  ]);
  var HjResponseReferenceSchema = external_exports.object({
    schemaVersion: external_exports.literal(1),
    id: text,
    version: text,
    provenance: external_exports.object({
      kind: external_exports.enum(["verified_reference", "adaptation", "heuristic", "test_fixture"]),
      url: external_exports.string().url(),
      node: text,
      review: external_exports.enum(["pending", "reviewed"]),
      reviewNotes: text,
      assumptions: external_exports.array(text).min(1).max(32)
    }).strict(),
    referenceSettings: external_exports.object({
      players: external_exports.literal(6),
      hero: external_exports.literal("HJ"),
      opener: external_exports.literal("UTG"),
      openToBB: external_exports.literal(2.5),
      anteBB: external_exports.literal(0),
      startingCapacitiesBB: external_exports.object({ UTG: depth, HJ: depth, CO: depth, BTN: depth, SB: depth, BB: depth }).strict(),
      rakeDescription: text,
      coldCallsAllowed: external_exports.boolean(),
      threeBetSizesBB: external_exports.array(external_exports.number().finite().gt(2.5)).max(8)
    }).strict(),
    application: external_exports.object({
      profile: external_exports.literal(HJ_RESPONSE_PROFILE),
      minCapacityBB: external_exports.number().finite().min(100),
      maxCapacityBB: external_exports.number().finite().min(100),
      /** Required even for an exact reference: why its rake/tree/depth fits. */
      rationale: text
    }).strict(),
    entries: external_exports.array(external_exports.object({
      hand: external_exports.string().refine((h) => handTypes.has(h), "Expected canonical hand type"),
      allocations: external_exports.array(allocation).min(1).max(10)
    }).strict()).min(1).max(169)
  }).strict().superRefine((r, ctx) => {
    const issue = (message) => ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message });
    const { minCapacityBB: min, maxCapacityBB: max } = r.application;
    if (max < min)
      issue("Reversed depth coverage.");
    const nativeDepths = Object.values(r.referenceSettings.startingCapacitiesBB);
    if (r.provenance.kind === "verified_reference" && (min !== Math.min(...nativeDepths) || max !== Math.max(...nativeDepths)))
      issue("Depth coverage different from the native stack vector must be explicitly labeled an adaptation.");
    if (new Set(r.entries.map((e) => e.hand)).size !== r.entries.length)
      issue("Duplicate hand entries.");
    if (new Set(r.referenceSettings.threeBetSizesBB).size !== r.referenceSettings.threeBetSizesBB.length)
      issue("Duplicate reference sizes.");
    for (const e of r.entries) {
      if (Math.abs(e.allocations.reduce((sum, a) => sum + a.frequency, 0) - 1) > 1e-9)
        issue(`Frequencies for ${e.hand} must sum to one; do not invent a residual fold frequency.`);
      const keys = e.allocations.map((a) => a.action === "THREE_BET" ? `${a.action}:${a.raiseToBB}` : a.action);
      if (new Set(keys).size !== keys.length)
        issue(`Duplicate action/size for ${e.hand}.`);
      if (e.allocations.some((a) => a.action === "CALL" && a.frequency > 0) && !r.referenceSettings.coldCallsAllowed)
        issue("CALL frequencies contradict the reference tree.");
      if (e.allocations.some((a) => a.action === "THREE_BET" && !r.referenceSettings.threeBetSizesBB.includes(a.raiseToBB)))
        issue("3-bet entry lacks a documented reference size.");
    }
  });
  function reviewHjResponseReference(input, reference) {
    const result = {
      policyVersion: HJ_RESPONSE_POLICY_VERSION,
      status: "invalid_context",
      hand: null,
      strategyClass: null,
      raiseToBB: null,
      allocations: null,
      reference: null,
      chosenAction: null,
      liveAuthorized: false,
      reasons: []
    };
    const fail = (status, reason) => ({ ...result, status, reasons: [reason] });
    const parsed = PreflopInputSchema.safeParse(input.preflop);
    const cards = external_exports.array(external_exports.object({ rank: external_exports.number().int().min(2).max(14), suit: external_exports.enum(["s", "h", "d", "c"]) }).strict()).length(2).safeParse(input.holeCards);
    if (!parsed.success || !cards.success || new Set(cards.data.map((c) => `${c.rank}${c.suit}`)).size !== 2)
      return fail("invalid_context", "Invalid response context/cards.");
    let context;
    try {
      context = buildPreflopContext(parsed.data);
    } catch {
      return fail("invalid_context", "Response seats or context are contradictory.");
    }
    const [a, b] = cards.data;
    result.hand = formatHandType({
      highRank: a.rank >= b.rank ? a.rank : b.rank,
      lowRank: a.rank >= b.rank ? b.rank : a.rank,
      suited: a.suit === b.suit
    });
    const utg = context.players.find((p) => p.position === "UTG"), action2 = context.actions[0];
    if (context.actionWindowEvidence !== "hj_facing_utg_open5" || context.openingEvidence !== void 0 || context.situation !== "facing_open" || context.heroPosition !== "HJ" || context.playersDealtIn !== 6 || context.players.length !== 6 || positions.some((pos) => context.players.filter((p) => p.position === pos).length !== 1) || context.historyCoverage !== "complete" || context.contributionMeaning !== "street_total" || context.tournamentContext !== "chip_ev_only" || context.amountToCallBB !== 2.5 || context.actions.length !== 1 || action2?.action !== "raise" || action2.wagerAction !== "raise" || action2.seat !== utg?.seat || action2.totalContributionBB !== 2.5 || context.players.some((p) => p.folded || p.allIn || p.remainingStackBB === null || p.contributionBB !== (p.position === "UTG" ? 2.5 : p.position === "SB" ? 0.5 : p.position === "BB" ? 1 : 0)))
      return fail("invalid_context", "Only the certified six-player HJ first response to UTG 2.5BB is covered.");
    const capacities = context.players.map((p) => p.remainingStackBB + p.contributionBB);
    if (capacities.some((n) => n < 100))
      return fail("invalid_context", "Every starting capacity must be known and at least 100BB.");
    if (reference === null)
      return fail("reference_missing", "No reviewed HJ-versus-UTG 2.5BB response reference is installed. Frequencies, cold-call tree, rake/profile applicability and bounded stack coverage are required; no fallback FOLD.");
    const checked = HjResponseReferenceSchema.safeParse(reference);
    if (!checked.success)
      return fail("invalid_reference", "Response reference metadata, coverage or frequencies are invalid.");
    const r = checked.data;
    result.reference = { id: r.id, version: r.version, provenance: r.provenance, referenceSettings: r.referenceSettings, application: r.application };
    if (r.provenance.kind === "verified_reference" && context.players.some((p) => p.remainingStackBB + p.contributionBB !== r.referenceSettings.startingCapacitiesBB[p.position]))
      return fail("out_of_scope", "Exact reference requires its full position-specific starting stack vector; an interval is not extrapolation permission.");
    if (capacities.some((n) => n < r.application.minCapacityBB || n > r.application.maxCapacityBB))
      return fail("out_of_scope", "Stack capacities lie outside the explicitly reviewed reference/adaptation interval.");
    const entry = r.entries.find((e) => e.hand === result.hand);
    if (!entry)
      return fail("uncovered", "Hand is not explicitly covered; absence is not FOLD.");
    result.allocations = entry.allocations;
    const positive = entry.allocations.filter((a2) => a2.frequency > 0);
    if (positive.length !== 1 || positive[0].frequency !== 1)
      return { ...result, status: "mixed", reasons: ["Mixed frequencies/sizes retained; no pure action or random sample selected."] };
    const pure = positive[0];
    return {
      ...result,
      status: "pure",
      strategyClass: pure.action,
      raiseToBB: pure.action === "THREE_BET" ? pure.raiseToBB : null,
      reasons: ["Reference classification only. Review status and source/action legality must be independently enforced before any live activation."]
    };
  }
  function inspectLiveHjResponseStrategy(input) {
    return reviewHjResponseReference(input, null);
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
  function normalizeSuitText(text2) {
    return text2.trim().replace(/[\uFE0E\uFE0F]/g, "").toLowerCase();
  }
  function parseBoardCardFromEvidence(evidence) {
    const ranks = /* @__PURE__ */ new Set();
    const suits2 = /* @__PURE__ */ new Set();
    for (const text2 of evidence.valueTexts) {
      if (text2.trim())
        ranks.add(parseBoardCardFromText(text2, "s").rank);
    }
    for (const text2 of evidence.suitTexts) {
      if (text2.trim())
        suits2.add(parseBoardCardFromText("2", text2).suit);
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
    const text2 = normalValueText.trim();
    const cleaned = text2.replace(/,/g, "");
    if (cleaned.length === 0) {
      throw new Error(`Chips value text is empty (expected a number, got an empty string)`);
    }
    const value = Number(cleaned);
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text2) || !Number.isFinite(value) || value < 0) {
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
  function isAllInStackText(text2) {
    return text2?.trim().replace(/\s+/g, " ").toLowerCase() === ALL_IN_STACK_TEXT;
  }
  function parseBlindValues(texts) {
    const parse = (text2) => {
      if (text2 == null)
        return null;
      try {
        const value = parseChipsValueText(text2);
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
    const isSettling = raw.stackIsSettlement === true || raw.statusClasses.includes("winner");
    let stack = null;
    if (!isSettling && playerName !== null && raw.stackText !== null) {
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
      isSettling,
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
    if (state.seats.some((s) => s.isOccupied && s.isSettling)) {
      criticalReasons.push("settlement display present -- waiting for stable remaining stacks");
    }
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
      criticalReasons.push("hero-contestable pot, uncalled returns and rake/drop remain unverified -- EV recommendations withheld");
    }
    if (context.contributionSemanticsVerified === false) {
      criticalReasons.push("active contribution data is incomplete or ambiguous -- call gap unverified; absent labels are not proven zero");
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
  function contribution(seat, strict = false) {
    if (seat.betReadError)
      return null;
    if (strict && seat.currentBet === null && !seat.isChecking)
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
    const readContribution = (seat) => contribution(seat, context.requireExplicitContributions);
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
    const cleanStreet = current.seats.filter((s) => s.isOccupied && !s.isFolded).every((s) => readContribution(s) === 0 && !s.isChecking);
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
        const total = readContribution(seat);
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
      const total = readContribution(seat);
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
    const increased = pairs.filter(({ seat, before }) => !seat.isFolded && !before.isFolded && readContribution(seat) !== null && readContribution(seat) > (baselineTotals.get(seat.seatNumber) ?? 0));
    const activeBefore = previous.seats.filter((s) => s.isOccupied && !s.isFolded);
    const unknownWager = activeBefore.some((s) => readContribution(s) === null) || current.seats.some((s) => s.isOccupied && !s.isFolded && readContribution(s) === null);
    const rosterChanged = previous.seats.some((s) => identity(s) !== identity(current.seats.find((now) => now.seatNumber === s.seatNumber))) || current.seats.some((s) => identity(s) !== identity(previous.seats.find((before) => before.seatNumber === s.seatNumber)));
    const previousHighest = Math.max(0, ...activeBefore.map((s) => baselineTotals.get(s.seatNumber) ?? readContribution(s) ?? 0));
    if (increased.length > 1)
      note("Multiple wagers changed in one observation; bet/call/raise order is unknown and was omitted.");
    if (unknownWager)
      note("An active contribution was unreadable; numeric action classification was omitted.");
    if (rosterChanged)
      note("Seat identities changed during the observation; numeric action classification was omitted.");
    for (const { seat, before } of pairs) {
      if (seat.isYou && !context.includeHero || before.isFolded)
        continue;
      const records = next.records.get(seat.seatNumber) ?? [];
      const total = readContribution(seat);
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
    const positions2 = /* @__PURE__ */ new Map();
    if (occupied.length === 0)
      return positions2;
    const dealerIndex = occupied.findIndex((s) => s.seatNumber === dealerSeatNumber);
    if (dealerIndex === -1) {
      return positions2;
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
      positions2.set(seat.seatNumber, position2);
    });
    return positions2;
  }

  // ../../packages/browser-reader/dist/potSemantics.js
  function readPotProvenance(raw) {
    const parse = (text2) => {
      if (text2 === null)
        return null;
      try {
        return parseChipsValueText(text2);
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

  // ../../packages/browser-reader/dist/legalityProof.js
  var known = (value, source) => ({ value, status: "proven", confidence: "high", source, reasons: [] });
  var unknown = (reason) => ({ value: null, status: "unknown", confidence: "low", source: "insufficient evidence", reasons: [reason] });
  function unknownBettingProof(reason) {
    return {
      lastFullRaiseAmount: unknown(reason),
      fullMinimumRaiseTo: unknown(reason),
      stackCappedUnderRaiseTo: unknown(reason),
      actionReopened: unknown(reason)
    };
  }
  var valid = (n) => Number.isFinite(n) && n >= 0;
  var onGrid = (n, unit) => valid(n) && Number.isSafeInteger(Math.round(n / unit)) && Math.abs(n / unit - Math.round(n / unit)) < 1e-8;
  function proveBettingLegality(input) {
    const fail = unknownBettingProof;
    if (input.coverage !== "complete_ordered")
      return fail("Ordered street history is incomplete; hero actions or intervening raises may be missing.");
    if (!input.source.trim() || !input.rulesVerified || !input.rulesSource.trim())
      return fail("No independently verified no-limit rule profile/source.");
    if (!valid(input.chipUnit) || input.chipUnit === 0 || !onGrid(input.bigBlind, input.chipUnit) || input.bigBlind === 0)
      return fail("Blind/chip unit is unknown or invalid.");
    if (input.players.length < 2 || new Set(input.players.map((p) => p.seat)).size !== input.players.length || input.players.some((p) => !Number.isInteger(p.seat) || p.seat < 1 || !onGrid(p.contribution, input.chipUnit) || !onGrid(p.remainingStack, input.chipUnit)))
      return fail("Invalid or ambiguous starting roster/contributions/stacks.");
    const units = (n) => Math.round(n / input.chipUnit);
    const bb = units(input.bigBlind);
    const players = new Map(input.players.map((p) => [p.seat, { total: units(p.contribution), stack: units(p.remainingStack), folded: false }]));
    const hero = players.get(input.heroSeat);
    if (!hero)
      return fail("Hero is absent from the street baseline.");
    let highest = Math.max(...[...players.values()].map((p) => p.total));
    if (input.street !== "preflop" && highest !== 0 || input.street === "preflop" && highest !== bb)
      return fail("Street baseline is not verified ordinary blinds/zero postflop contributions; straddles and short blinds are unsupported.");
    let lastFull = bb;
    const acted = /* @__PURE__ */ new Map();
    const reopened = (seat) => {
      const prior = acted.get(seat);
      return !prior || highest - prior.total >= prior.increment;
    };
    let sequence = -1;
    for (const event of input.events) {
      const player2 = players.get(event.seat);
      if (!Number.isInteger(event.sequence) || event.sequence <= sequence || !player2 || player2.folded || player2.stack === 0 || !onGrid(event.raiseTo, input.chipUnit))
        return fail("Unordered/ambiguous event or invalid actor/amount.");
      sequence = event.sequence;
      const total = units(event.raiseTo);
      const addition = total - player2.total;
      if (event.action === "fold" || event.action === "check") {
        if (addition !== 0 || event.allIn || event.action === "check" && player2.total !== highest)
          return fail("Check/fold contradicts the contribution ledger.");
        if (event.action === "fold")
          player2.folded = true;
      } else {
        if (addition <= 0 || addition > player2.stack || event.allIn !== (addition === player2.stack))
          return fail("Wager/all-in contradicts independently known remaining chips.");
        if (total < highest && !event.allIn)
          return fail("Incomplete call without an all-in.");
        if (total > highest) {
          if (!reopened(event.seat))
            return fail("Raise attempted without reopened action.");
          if (![...players.entries()].some(([seat, p]) => seat !== event.seat && !p.folded && p.stack > 0))
            return fail("No opponent has chips to respond to aggression.");
          const increment = total - highest;
          if (highest === 0 && increment < bb)
            return fail("Short all-in opening bet is outside this verified rule subset.");
          if (increment < lastFull && !event.allIn)
            return fail("Subminimum raise is not all-in.");
          if (increment >= lastFull)
            lastFull = increment;
          highest = total;
        }
        player2.stack -= addition;
        player2.total = total;
      }
      acted.set(event.seat, { total: highest, increment: lastFull });
    }
    const source = `${input.source}; ${input.rulesSource}; complete ordered ${input.street} replay`;
    const rights = !hero.folded && hero.stack > 0 && reopened(input.heroSeat);
    const maximum = hero.total + hero.stack;
    const canRespond = [...players.entries()].some(([seat, p]) => seat !== input.heroSeat && !p.folded && p.stack > 0);
    return {
      lastFullRaiseAmount: known(lastFull * input.chipUnit, source),
      fullMinimumRaiseTo: highest > 0 ? known((highest + lastFull) * input.chipUnit, source) : unknown("No outstanding wager: this is a bet, not a raise."),
      stackCappedUnderRaiseTo: known(rights && canRespond && highest > 0 && maximum > highest && maximum < highest + lastFull ? maximum * input.chipUnit : null, source),
      actionReopened: known(rights, source)
    };
  }
  function unknownContestablePot(reason) {
    return { contestablePotBeforeCall: unknown(reason), contestablePotAfterCall: unknown(reason), callCost: unknown(reason), pots: [], uncalledReturns: [] };
  }

  // ../../packages/browser-reader/dist/scopedLiveVerification.js
  var CONTROLLED_LIVE_SOURCE = "PokerNow controlled live evidence supplied 2026-10-07";
  function contribution2(seat) {
    if (!seat.betReadError && seat.currentBet !== null && Number.isFinite(seat.currentBet) && seat.currentBet >= 0) {
      return known(seat.currentBet, `${CONTROLLED_LIVE_SOURCE}; seat ${seat.seatNumber} numeric current-street total`);
    }
    if (!seat.betReadError && seat.currentBet === null && seat.isChecking) {
      return known(0, `${CONTROLLED_LIVE_SOURCE}; seat ${seat.seatNumber} explicit check = zero`);
    }
    return unknown(`Seat ${seat.seatNumber}: contribution absent or unreadable; only numeric totals and explicit check are supported.`);
  }
  function assessScopedMonetary(state, pot, readErrors) {
    const seats = state?.seats.filter((s) => s.isOccupied) ?? [];
    const invalid = state === null || seats.length < 2 || new Set(seats.map((s) => s.seatNumber)).size !== seats.length || readErrors.length > 0;
    const invalidReason = `No unambiguous current table read${readErrors.length ? ": " + readErrors.join("; ") : ""}.`;
    const rows = seats.map((s) => ({
      seat: s.seatNumber,
      folded: s.isFolded,
      contribution: invalid ? unknown(invalidReason) : contribution2(s)
    }));
    const active = rows.filter((s) => !s.folded);
    const missing = active.flatMap((s) => s.contribution.reasons);
    const semantics = invalid || active.length < 2 || missing.length ? unknown(invalid ? invalidReason : missing.join(" ") || "Fewer than two active participants.") : known("total_street_contributions", `${CONTROLLED_LIVE_SOURCE}; explicit active-seat contributions`);
    const heroes = seats.filter((s) => s.isYou && !s.isFolded);
    const hero = heroes.length === 1 ? heroes[0] : void 0;
    const heroValue = rows.find((s) => s.seat === hero?.seatNumber)?.contribution.value;
    const opponentValues = active.filter((s) => s.seat !== hero?.seatNumber).map((s) => s.contribution.value);
    const highest = semantics.status === "proven" && hero && opponentValues.length ? Math.max(...opponentValues) : null;
    const callGap = highest !== null && heroValue != null ? known(Math.max(0, highest - heroValue), `${CONTROLLED_LIVE_SOURCE}; max active opposing total minus hero total, floored at zero; uncapped gap, not all-in payable cost`) : unknown(!hero ? "Hero missing, folded or ambiguous." : semantics.reasons.join(" ") || "Opposing contributions are incomplete.");
    const subtotal = !invalid && rows.every((s) => s.contribution.value !== null) ? rows.reduce((sum, s) => sum + s.contribution.value, 0) : null;
    const matches = subtotal !== null && pot.mainPot !== null && pot.displayedTotalPot !== null ? Math.abs(pot.mainPot + subtotal - pot.displayedTotalPot) < 1e-8 : null;
    const display = matches === true ? known("collected_plus_street_contributions", `${CONTROLLED_LIVE_SOURCE}; current display reconciled including folded contributions; no remaining stacks added`) : unknown(matches === false ? "Collected pot plus street contributions does not match displayed total; transition/return/accounting state is unsupported." : `Pot display reconciliation lacks readable displays or explicit contributions for all occupied seats. ${rows.flatMap((s) => s.contribution.reasons).join(" ")}`);
    return {
      contributionSemantics: semantics,
      contributions: rows,
      callGap,
      highestOpposingContribution: highest,
      potDisplay: {
        ...display,
        collectedMainPot: pot.mainPot,
        displayedTotalPot: pot.displayedTotalPot,
        currentStreetSubtotal: subtotal,
        matches,
        scope: seats.length === 2 ? "heads_up_display_only" : "multiway_display_only",
        contestablePotVerified: false
      }
    };
  }
  var bettingSnapshotSignature = (state) => JSON.stringify(state);
  function proveScopedLiveBetting(state, input, observedBigBlind) {
    const fail = (reason) => ({
      ...unknownBettingProof(reason),
      shortUnderRaise: unknown(reason),
      minimumBeforeLastAggression: unknown(reason)
    });
    if (!state || !input || input.coverage !== "complete_ordered")
      return fail("Complete ordered street evidence including hero is unavailable; polling may omit intermediate actions.");
    if (input.snapshotSignature !== bettingSnapshotSignature(state) || input.street !== state.street)
      return fail("Ordered evidence does not belong to the current snapshot/street.");
    if (observedBigBlind !== void 0 && observedBigBlind !== input.bigBlind)
      return fail("Ordered evidence big blind does not match the current blind read.");
    if (input.street !== "flop" || input.bigBlind !== 2)
      return fail("Raise rule evidence is scoped to the observed flop cases with BB=2; this context is unsupported.");
    const hero = state.seats.find((s) => s.seatNumber === input.heroSeat && s.isYou && s.isOccupied && !s.isFolded);
    if (!hero?.isCurrentToAct)
      return fail("Hero is not the current active decision maker.");
    const source = `${CONTROLLED_LIVE_SOURCE}; ${input.source}; ordered sequence, arithmetic-derived bounds`;
    const proof = proveBettingLegality({ ...input, rulesVerified: true, rulesSource: source });
    if (proof.lastFullRaiseAmount.status !== "proven")
      return fail(proof.lastFullRaiseAmount.reasons.join(" "));
    const totals = new Map(input.players.map((p) => [p.seat, { total: p.contribution, stack: p.remainingStack, folded: false, allIn: p.remainingStack === 0 }]));
    let highest = 0;
    const aggression = [];
    for (const event of input.events) {
      const p = totals.get(event.seat);
      if (event.action === "fold")
        p.folded = true;
      if (event.action === "wager") {
        p.stack -= event.raiseTo - p.total;
        p.total = event.raiseTo;
        p.allIn = event.allIn;
        if (event.raiseTo > highest) {
          highest = event.raiseTo;
          aggression.push({ total: highest, allIn: event.allIn, seat: event.seat });
        }
      }
    }
    const occupied = state.seats.filter((s) => s.isOccupied);
    if (occupied.length !== totals.size || occupied.some((s) => {
      const end = totals.get(s.seatNumber);
      const read = contribution2(s);
      return !end || read.value !== end.total || s.isFolded !== end.folded || (s.isAllIn ?? false) !== end.allIn || (end.allIn ? s.stack !== null && s.stack !== 0 : s.stack !== end.stack);
    }))
      return fail("Ordered events do not reconcile with current contributions, stacks, all-in states or roster.");
    const pattern = aggression.map((a) => `${a.total}${a.allIn ? "a" : ""}`).join(",");
    const supported = ["2", "3", "3,6", "3,6,8a"].includes(pattern);
    const allInEvents = input.events.filter((e) => e.allIn);
    if (!supported || allInEvents.length !== (pattern === "3,6,8a" ? 1 : 0)) {
      return fail("Sequence outside the observed opening-bet/3\u21926\u21928 short-all-in cases. Full all-in and cumulative reopening remain unverified.");
    }
    const short = pattern === "3,6,8a";
    const nonReopening = short && aggression[1].seat === input.heroSeat && hero.currentBet === 6 && hero.stack != null && hero.stack > 2 && proof.actionReopened.value === false;
    return {
      ...proof,
      shortUnderRaise: known(short, source),
      minimumBeforeLastAggression: pattern.startsWith("3,6") ? known(short ? 9 : 6, source) : unknown("Last aggression was an opening bet, not a raise."),
      // The capture proves a particular already-acted player's denied raise right.
      // Do not promote mathematical full-raise reopening to live verification.
      actionReopened: nonReopening ? known(false, `${source}; player raised to 6, faces Call 2 after short all-in to 8; Raise disabled`) : unknown("Reopening for this actor/sequence has not been independently observed; full all-in reopening is unverified."),
      stackCappedUnderRaiseTo: unknown("No verified permission for a new stack-capped raise; historical short-under-raise classification is separate.")
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
        "Contestable-pot eligibility, returns and rake/drop remain unverified.",
        "Full live legality is not certified: exact action controls and chip units still require evidence."
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
        verification: { monetary: assessScopedMonetary(null, pot, readErrors), betting: proveScopedLiveBetting(null) },
        confidence: { level: "low", reasons: [...readErrors, error instanceof Error ? error.message : String(error)] }
      };
    }
    const positions2 = context.dealerSeatNumber === null ? /* @__PURE__ */ new Map() : assignPositions(state.seats, context.dealerSeatNumber);
    const hero = state.seats.find((s) => s.isYou);
    const monetary = assessScopedMonetary(state, pot, readErrors);
    const betting = proveScopedLiveBetting(readErrors.length ? null : state, context.bettingEvidence, blinds.bigBlind);
    const amountToCall = monetary.callGap.value;
    legality.contributionMeaning = monetary.contributionSemantics.status === "proven" ? "verified_total_street_contributions" : "unverified";
    legality.minRaiseTo = betting.fullMinimumRaiseTo.value;
    legality.aggressionReopened = betting.actionReopened.value;
    legality.reasons.push(.../* @__PURE__ */ new Set([
      ...monetary.callGap.reasons,
      ...monetary.potDisplay.reasons,
      ...betting.fullMinimumRaiseTo.reasons,
      ...betting.actionReopened.reasons
    ]));
    const confidence = computeDataConfidence(state, {
      amountToCall,
      bigBlindWasDefaulted: blinds.bigBlind === null,
      isPositionKnown: hero !== void 0 && positions2.has(hero.seatNumber),
      potSemanticsVerified: pot.isPotSemanticsVerified,
      contributionSemanticsVerified: monetary.contributionSemantics.status === "proven"
    });
    return {
      state,
      ...blinds,
      positions: positions2,
      amountToCall,
      decisionPot: pot.decisionPot,
      pot,
      legality,
      verification: { monetary, betting },
      activeOpponents: state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded).length,
      confidence: readErrors.length > 0 ? { level: "low", reasons: [...readErrors, ...confidence.reasons] } : confidence
    };
  }

  // ../../packages/browser-reader/dist/liveLegalityEvidence.js
  var LIVE_LEGALITY_OBSERVATIONS = {
    source: CONTROLLED_LIVE_SOURCE,
    scope: "Observed situations only; no automatic matching by chip amounts",
    normalRaise: { street: "flop", openingBet: 3, minRaiseButtonResult: 6, displayedBB: "3BB" },
    normalRaise2: { street: "flop", openingBet: 2, minRaiseButtonResult: 4, displayedBB: "2BB" },
    shortUnderRaise: {
      orderedAggressionTotals: [3, 6, 8],
      lastIsAllIn: true,
      minimumBeforeShortRaise: 9,
      alreadyActedTotal: 6,
      displayedCall: 2,
      raiseEnabled: false
    },
    stackCappedRaise: { heroContribution: 2, heroRemaining: 23, opposingTotal: 20, allowedRaiseTo: 25 },
    potDisplay: { collected: 4, streetContributions: 3, displayedTotal: 7 },
    potDisplays: [
      { collected: 6, contributions: [2], total: 8 },
      { collected: 6, contributions: [4, 6, 8], total: 24 },
      { collected: 6, contributions: [36, 18, 36], total: 96 }
    ],
    callGap: { heroContribution: 2, opposingTotal: 8, displayedCall: 6 },
    observedStateBehavior: [
      "Numeric wagers are total street contributions",
      "Explicit check is zero contribution",
      "Fold and all-in markers",
      "Board counts 0/3/4/5 across streets",
      "Observed new-hand board/history reset",
      "Heads-up unequal all-in display excludes remaining stacks"
    ],
    unverified: [
      "Completeness of polling history",
      "Full all-in/cumulative reopening and other actors/sequences",
      "Whole-hand eligibility and side pots",
      "Uncalled returns and rake/drop",
      "Away/sit-out detection"
    ]
  };
  function assessLiveLegalityEvidence(raw, assessment, history) {
    const state = assessment.state;
    const seats = state?.seats.filter((s) => s.isOccupied) ?? [];
    const hero = seats.find((s) => s.isYou);
    const { monetary, betting } = assessment.verification;
    const ledgerReason = "Current street snapshots do not contain complete whole-hand contributions, all eligible/folded/departed players, returns or rake evidence.";
    return {
      observations: LIVE_LEGALITY_OBSERVATIONS,
      historyCoverage: {
        kind: "snapshot_inferred",
        complete: false,
        observedEvents: [...history.records.values()].reduce((n, records) => n + records.length, 0),
        reasons: ["Polling can omit intermediate actions; opponent history omits hero actions.", ...history.notes]
      },
      contributionSemantics: monetary.contributionSemantics,
      callGap: monetary.callGap,
      contributions: monetary.contributions,
      betting,
      contestablePot: unknownContestablePot(ledgerReason),
      displayReconciliation: {
        ...monetary.potDisplay,
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
        ...betting.fullMinimumRaiseTo.reasons,
        ...betting.actionReopened.reasons,
        "Existing pot, chip-unit, action-control and policy gates remain in force."
      ] }
    };
  }

  // ../../packages/browser-reader/dist/playerSeatMapping.js
  function parsePlayerStacks(text2) {
    if (!/^Player stacks\b/.test(text2))
      return { kind: "not_row" };
    const invalid = (reason) => ({ kind: "invalid", reason });
    if (text2.length > 4e3 || /[\r\n]/.test(text2) || !text2.startsWith("Player stacks: "))
      return invalid("Malformed Player stacks header or row bounds.");
    const parts = text2.slice("Player stacks: ".length).split(" | ");
    if (!parts.length || parts.length > 10)
      return invalid("Unsupported Player stacks entry count.");
    const entries = [];
    const seats = /* @__PURE__ */ new Set(), ids2 = /* @__PURE__ */ new Set();
    for (const part of parts) {
      const match = /^#([1-9]|10) "([^"\r\n]{1,160}) @ ([A-Za-z0-9_-]{1,160})" \((0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?\)$/.exec(part);
      if (!match || !match[2].trim())
        return invalid('Malformed Player stacks entry; expected #seat "name @ playerId" (stack).');
      const seat = Number(match[1]), playerId = match[3], stackText = match[4] + (match[5] ?? "");
      if (!Number.isFinite(Number(stackText)) || Number(stackText) > Number.MAX_SAFE_INTEGER)
        return invalid("Player stacks amount exceeds supported bounds.");
      if (seats.has(seat) || ids2.has(playerId))
        return invalid("Duplicate seat or player ID in Player stacks row.");
      seats.add(seat);
      ids2.add(playerId);
      entries.push({ seat, name: match[2], playerId, stackText });
    }
    return { kind: "valid", entries };
  }
  function emptySeatMapping() {
    return { status: "unknown", source: "pokernow_log_v3.player_stacks", entries: [], evidence: [], reasons: ["No valid Player stacks row observed for this hand."] };
  }
  function applyPlayerSeatMapping(timeline, events) {
    const mapping = timeline.seatMapping;
    const invalidate = (reason) => {
      mapping.status = "invalid";
      mapping.reasons = [reason, "Mapping invalid for the rest of this hand; actor seats cleared. Historical entries are evidence only."];
    };
    for (const event of events) {
      if (mapping.status === "invalid")
        break;
      const parsed = parsePlayerStacks(event.evidence);
      if (parsed.kind === "not_row" || mapping.evidence.some((e) => e.eventId === event.id))
        continue;
      const evidence = {
        eventId: event.id,
        text: event.evidence,
        sourceTimestamp: event.sourceTimestamp,
        sourceTimestampRaw: event.sourceTimestampRaw
      };
      if (mapping.evidence.length >= 32) {
        mapping.evidence[31] = evidence;
        invalidate("Player stacks evidence retention limit reached; mapping coverage is uncertain.");
        break;
      }
      mapping.evidence.push(evidence);
      if (parsed.kind === "invalid") {
        invalidate(parsed.reason);
        break;
      }
      const conflict = parsed.entries.find((entry) => mapping.entries.some((known2) => known2.playerId === entry.playerId && known2.seat !== entry.seat || known2.seat === entry.seat && known2.playerId !== entry.playerId));
      if (conflict) {
        invalidate(`Contradictory Player stacks assignment for player ID ${conflict.playerId} / seat ${conflict.seat}.`);
        break;
      }
      for (const entry of parsed.entries) {
        const known2 = mapping.entries.find((e) => e.playerId === entry.playerId);
        if (!known2)
          mapping.entries.push({ ...entry, evidenceEventId: event.id, fromTimestamp: event.sourceTimestamp });
        else if (event.sourceTimestamp < known2.fromTimestamp) {
          Object.assign(known2, entry, { evidenceEventId: event.id, fromTimestamp: event.sourceTimestamp });
        }
      }
      mapping.status = "source_reported";
      mapping.reasons = [];
    }
    for (const event of events) {
      if (!event.actor)
        continue;
      event.actor.seat = null;
      event.actorSeatMappingEventId = null;
      if (mapping.status !== "source_reported")
        continue;
      const entry = mapping.entries.find((e) => e.playerId === event.actor.playerId);
      if (entry && event.sourceTimestamp > entry.fromTimestamp) {
        event.actor.seat = entry.seat;
        event.actorSeatMappingEventId = entry.evidenceEventId;
      }
    }
    if (mapping.status === "invalid") {
      const reason = `Player-to-seat mapping invalid: ${mapping.reasons[0]}`;
      if (!timeline.reasons.includes(reason) && timeline.reasons.length < 50)
        timeline.reasons.push(reason);
    }
  }

  // ../../packages/browser-reader/dist/handAccounting.js
  function observedHandAccounting(handId, events, droppedEvents = 0) {
    const adjustments = [];
    const seen = /* @__PURE__ */ new Set();
    for (const e of events) {
      if (e.action !== "uncalled_return" && e.action !== "settlement" || seen.has(e.id))
        continue;
      seen.add(e.id);
      const reasons = [];
      if (e.source !== "pokernow_log_v3")
        reasons.push("Not a source-reported log adjustment.");
      if (!e.actor?.playerId || e.actor.seat === null || !e.actorSeatMappingEventId)
        reasons.push("Player ID has no valid preceding per-hand seat mapping.");
      if (e.order !== "timestamp_candidate")
        reasons.push("Timestamp order is ambiguous; duplicate/tied adjustments need independent resolution.");
      if (e.amount === null || !Number.isFinite(e.amount) || e.amount <= 0 || e.amount > Number.MAX_SAFE_INTEGER)
        reasons.push("Adjustment amount is invalid.");
      const returned = e.action === "uncalled_return";
      adjustments.push({
        eventId: e.id,
        handId,
        kind: returned ? "uncalled_return" : "pot_award",
        playerId: e.actor?.playerId ?? null,
        seat: e.actor?.seat ?? null,
        amount: e.amount,
        status: reasons.length ? "unresolved" : "mapped_observation",
        reasons,
        provenance: {
          source: e.source,
          text: e.evidence,
          sourceTimestamp: e.sourceTimestamp,
          sourceTimestampRaw: e.sourceTimestampRaw,
          seatMappingEventId: e.actorSeatMappingEventId
        },
        effectIfIndependentlyComplete: reasons.length ? null : {
          grossCommittedDelta: 0,
          returnedUncalledDelta: returned ? e.amount : 0,
          netCommittedDelta: returned ? -e.amount : 0,
          potAwardsDelta: returned ? 0 : e.amount
        }
      });
    }
    return { status: "incomplete", totals: null, adjustments, reasons: [
      "Live timeline is incomplete; gross/net commitments, total returns, awards and folded dead money cannot be certified.",
      "Log wager amount semantics/chip units are not a complete contribution ledger. Adjustment effects are conditional, not applied to live pots.",
      ...droppedEvents ? ["Timeline truncation: adjustment observations may also be missing."] : [],
      ...events.some((e) => e.action === "unparsed") ? ["Unparsed source rows may contain additional accounting events."] : []
    ] };
  }

  // ../../packages/browser-reader/dist/historyCoverage.js
  var COVERAGE_ISSUE_LIMIT = 32;
  var REJECTED_BATCH_LIMIT = 8;
  var MISSING_HISTORY_PROOF = [
    "No validated hand-scoped contiguous event IDs or equivalent authoritative complete-prefix certificate.",
    "No log watermark tied to the current table decision; a successful GET does not prove catch-up.",
    "No validated source tie-break for equal timestamps; receipt/presentation order is not poker action order.",
    "No validated full-response pagination, reset/revision or reconnect/backfill coverage contract."
  ];
  function emptyHistoryCoverage(sourceReported) {
    return {
      status: sourceReported ? "source_completeness_unproven" : "snapshot_only",
      historyComplete: false,
      reason: sourceReported ? "No accepted log response yet; source coverage and catch-up are unproven." : "DOM polling cannot prove complete action coverage or order.",
      missingProof: [...MISSING_HISTORY_PROOF],
      sourceOrderingBasis: sourceReported ? "numeric_timestamp_candidate" : "snapshot_observation_order",
      sourceSequence: null,
      sourceWatermark: null,
      caughtUpToCurrentDecision: false,
      ingestionStartedMidHand: "unknown",
      acceptedBatchCount: 0,
      firstAcceptedAt: null,
      lastAcceptedAt: null,
      firstObservedSourceEvent: null,
      latestObservedSourceEvent: null,
      firstRetainedSourceEvent: null,
      lastRetainedSourceEvent: null,
      handStartSeen: false,
      handEndSeen: false,
      initialNonemptyBatchHadStart: null,
      retainedRowCount: 0,
      unparsedRowCount: 0,
      ambiguousTimestampGroupCount: 0,
      unresolvedActorSeatCount: 0,
      counterScope: "Cumulative response observations against retained row identities, not unique whole-hand actions. Evicted rows may be recounted; retention loss is explicit. Identical signatures are not authoritative action IDs.",
      duplicateRefreshRowCount: 0,
      lateEarlierRowCount: 0,
      rejectedBatchCount: 0,
      sourceFailureCount: 0,
      omittedRowObservationCount: 0,
      retentionLossLowerBound: 0,
      issues: [],
      issueDetailsTruncated: false,
      rejectedBatches: [],
      rejectedBatchDetailsDropped: 0,
      lastBatch: null
    };
  }
  function classify(c) {
    if (c.sourceOrderingBasis === "snapshot_observation_order")
      return;
    if (c.issues.length || c.issueDetailsTruncated) {
      c.status = "incomplete_gap_detected";
      c.reason = "Coverage discontinuity or acquisition failure observed; see issues. Retained rows are not silently removed. Missing action count/cause cannot be inferred.";
    } else if (c.acceptedBatchCount && !c.handStartSeen && c.retainedRowCount) {
      c.status = "partial_missing_hand_start";
      c.reason = "No hand start has been observed. Mid-hand attachment, response lag and source omission cannot be distinguished.";
    } else {
      c.status = "source_completeness_unproven";
      c.reason = "No contiguous coverage/catch-up certificate. Start/end markers and repeated identical responses do not prove completeness.";
    }
    if (c.unparsedRowCount)
      c.reason += " Unparsed rows prevent complete action interpretation.";
    if (c.ambiguousTimestampGroupCount)
      c.reason += " Equal timestamps prevent a proven total event order.";
  }
  function recordCoverageIssue(t, code, reason, at) {
    const c = t.coverage;
    const existing = c.issues.find((issue) => issue.code === code);
    if (existing) {
      existing.lastObservedAt = at;
      existing.occurrences++;
    } else if (c.issues.length < COVERAGE_ISSUE_LIMIT)
      c.issues.push({ code, reason: reason.slice(0, 500), firstObservedAt: at, lastObservedAt: at, occurrences: 1 });
    else
      c.issueDetailsTruncated = true;
    classify(c);
  }
  function recordRejectedLogBatch(t, payload, reason, at, rowIndex = null) {
    const c = t.coverage;
    c.rejectedBatchCount++;
    const raw = Array.isArray(payload) && rowIndex !== null ? payload[rowIndex] : null;
    const row = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
    const sample = row ? {
      createdAt: typeof row.createdAt === "string" ? row.createdAt.slice(0, 160) : typeof row.createdAt === "number" && Number.isFinite(row.createdAt) ? row.createdAt : null,
      createdAtType: typeof row.createdAt,
      msg: typeof row.msg === "string" ? row.msg.slice(0, 4e3) : null,
      msgType: typeof row.msg,
      truncated: typeof row.createdAt === "string" && row.createdAt.length > 160 || typeof row.msg === "string" && row.msg.length > 4e3
    } : null;
    c.rejectedBatches.push({
      observedAt: at,
      reason: reason.slice(0, 500),
      rowIndex,
      batchRowCount: Array.isArray(payload) ? payload.length : null,
      sample
    });
    if (c.rejectedBatches.length > REJECTED_BATCH_LIMIT) {
      c.rejectedBatches.shift();
      c.rejectedBatchDetailsDropped++;
    }
    recordCoverageIssue(t, "rejected_batch", "One or more batches were rejected; accepted events/mapping/accounting remain intact. Rejected input is not silently skipped.", at);
  }
  function recordLogSourceFailure(t, reason, at) {
    t.coverage.sourceFailureCount++;
    recordCoverageIssue(t, "source_failure", reason, at);
  }
  var ref = (e) => ({
    id: e.id,
    sourceTimestamp: e.sourceTimestamp,
    sourceTimestampRaw: e.sourceTimestampRaw,
    observedAt: e.observedAt,
    action: e.action,
    evidence: e.evidence
  });
  function observeLogBatch(t, incoming, existing, at) {
    const c = t.coverage;
    c.sourceOrderingBasis = "numeric_timestamp_candidate";
    const incomingIds = new Set(incoming.map((e) => e.id));
    const overlap = incoming.filter((e) => existing.has(e.id)).length;
    const priorMax = c.latestObservedSourceEvent?.sourceTimestamp ?? null;
    const late2 = incoming.filter((e) => !existing.has(e.id) && priorMax !== null && e.sourceTimestamp < priorMax).length;
    const omitted = [...existing.keys()].filter((id) => !incomingIds.has(id)).length;
    const first = [...incoming].sort((a, b) => a.sourceTimestamp - b.sourceTimestamp)[0];
    const last = [...incoming].sort((a, b) => b.sourceTimestamp - a.sourceTimestamp)[0];
    const possibleReset = omitted > 0 && (!last || overlap === 0 && priorMax !== null && last.sourceTimestamp <= priorMax);
    let ascending = false, descending = false;
    for (let i = 1; i < incoming.length; i++) {
      ascending ||= incoming[i].sourceTimestamp > incoming[i - 1].sourceTimestamp;
      descending ||= incoming[i].sourceTimestamp < incoming[i - 1].sourceTimestamp;
    }
    c.lastBatch = {
      observedAt: at,
      rowCount: incoming.length,
      deliveryOrder: incoming.length < 2 ? "empty_or_single" : ascending && descending ? "mixed" : ascending ? "ascending" : descending ? "descending" : "all_equal",
      overlapRowCount: overlap,
      newRowCount: incoming.length - overlap,
      lateEarlierRowCount: late2,
      identicalExtraRowCount: incoming.length - new Set(incoming.map((e) => JSON.stringify([e.sourceTimestamp, e.evidence]))).size,
      omittedPreviouslyRetainedRowCount: omitted,
      possibleResetOrStaleResponse: possibleReset
    };
    c.acceptedBatchCount++;
    c.firstAcceptedAt ??= at;
    c.lastAcceptedAt = at;
    c.duplicateRefreshRowCount += overlap;
    c.lateEarlierRowCount += late2;
    c.omittedRowObservationCount += omitted;
    if (first) {
      c.firstObservedSourceEvent ??= ref(first);
      c.initialNonemptyBatchHadStart ??= incoming.some((e) => e.action === "hand_start");
    }
    if (last && (priorMax === null || last.sourceTimestamp > priorMax))
      c.latestObservedSourceEvent = ref(last);
    c.handStartSeen ||= incoming.some((e) => e.action === "hand_start");
    c.handEndSeen ||= incoming.some((e) => e.action === "hand_end");
    if (omitted)
      recordCoverageIssue(t, "response_omission", "A requested full-hand response omitted previously retained row identities. Stale, truncated, revised or reset response possible; missing rows are retained.", at);
    if (possibleReset)
      recordCoverageIssue(t, "possible_reset_or_stale_response", "An empty response or regressed response without retained overlap followed known rows; a reset cannot be distinguished from stale/partial delivery.", at);
  }
  function refreshHistoryCoverage(t, at) {
    const c = t.coverage;
    const events = t.events.filter((e) => e.source === "pokernow_log_v3");
    c.firstRetainedSourceEvent = events[0] ? ref(events[0]) : null;
    c.lastRetainedSourceEvent = events.at(-1) ? ref(events.at(-1)) : null;
    c.retainedRowCount = events.length;
    c.unparsedRowCount = events.filter((e) => e.action === "unparsed").length;
    c.ambiguousTimestampGroupCount = new Set(events.filter((e) => e.order === "ambiguous").map((e) => e.sourceTimestamp)).size;
    c.unresolvedActorSeatCount = events.filter((e) => e.actor && e.actor.seat === null).length;
    if (t.droppedEvents > c.retentionLossLowerBound)
      recordCoverageIssue(t, "retention_loss", "Local retention discarded source rows; counts/deduplication are limited to retained identities, not whole-hand coverage.", at);
    c.retentionLossLowerBound = t.droppedEvents;
    t.historyComplete = false;
    c.historyComplete = false;
    classify(c);
  }

  // ../../packages/browser-reader/dist/handTimeline.js
  var TIMELINE_LIMIT = 500;
  var LogRowValidationError = class extends Error {
    rowIndex;
    constructor(message, rowIndex) {
      super(message);
      this.rowIndex = rowIndex;
    }
  };
  function timestampKey(value) {
    if (typeof value !== "number" && !(typeof value === "string" && /^(?:0|[1-9][0-9]{0,15})$/.test(value))) {
      throw new Error("Unsupported log row schema; expected safe nonnegative integer createdAt (number or decimal string) and bounded msg.");
    }
    const key = Number(value);
    if (!Number.isSafeInteger(key) || key < 0 || Object.is(key, -0) || typeof value === "string" && String(key) !== value) {
      throw new Error("Unsupported log row schema; expected safe nonnegative integer createdAt (number or decimal string) and bounded msg.");
    }
    return key;
  }
  function parseLogRows(payload) {
    if (!Array.isArray(payload) || payload.length > 2e3)
      throw new Error("Log payload is not a bounded row array.");
    return payload.map((row, index) => {
      try {
        if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.msg !== "string" || row.msg.length === 0 || row.msg.length > 4e3)
          throw new Error("Unsupported log row schema; expected safe createdAt and bounded msg.");
        timestampKey(row.createdAt);
        return { createdAt: row.createdAt, msg: row.msg };
      } catch (error) {
        throw new LogRowValidationError(error instanceof Error ? error.message : "Invalid log row", index);
      }
    });
  }
  var snapshotActor = (s) => ({ seat: s.seatNumber, name: s.playerName, playerId: null, isHero: s.isYou });
  var identity2 = (s) => s?.isOccupied && s.playerName ? `${s.seatNumber}:${s.playerName}` : null;
  var baseReasons = [
    "No validated source watermark/contiguous event sequence; complete history is not established.",
    "A sanitized live sample supports decimal-string timestamps; full log coverage, tie ordering, units and delivery lag remain unverified."
  ];
  function newHandTimeline(handId, handNumber = null) {
    return {
      handId,
      handNumber,
      identityKind: handNumber === null ? "local_segment" : "source_reported",
      historyComplete: false,
      reasons: [...baseReasons, ...handNumber === null ? ["Local observation segment, not a PokerNow hand ID; invisible same-card hands may be missed."] : []],
      events: [],
      snapshotEvents: [],
      source: "dom_snapshot",
      droppedEvents: 0,
      seatMapping: emptySeatMapping(),
      accounting: observedHandAccounting(handId, []),
      coverage: emptyHistoryCoverage(handNumber !== null)
    };
  }
  function timelineReason(t, reason) {
    if (!t.reasons.includes(reason) && t.reasons.length < 50)
      t.reasons.push(reason);
  }
  function isSourceNonActionMetadata(event) {
    return event.source === "pokernow_log_v3" && (event.action === "player_join" || event.action === "hole_cards");
  }
  function normalizeLogRow(row, observedAt) {
    const text2 = row.msg;
    const timestamp = timestampKey(row.createdAt);
    const joined = /^The player "([^"\r\n]{1,160}) @ ([A-Za-z0-9_-]{1,160})" joined the game with a stack of ((?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,8})?)\.$/.exec(text2);
    const cards = /^Your hand is ((?:[2-9TJQKA]|10)[\u2663\u2666\u2665\u2660]), ((?:[2-9TJQKA]|10)[\u2663\u2666\u2665\u2660])$/.exec(text2);
    const returned = /^Uncalled bet of ((?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,8})?) returned to "([^"\r\n]{1,160}) @ ([A-Za-z0-9_-]{1,160})"$/.exec(text2);
    const event = {
      id: `${timestamp}:${text2}`,
      sequence: 0,
      street: null,
      actor: null,
      actorSeatMappingEventId: null,
      action: "unparsed",
      amount: null,
      amountMeaning: null,
      wagerAction: null,
      raiseTo: null,
      allIn: null,
      source: "pokernow_log_v3",
      confidence: "unknown",
      order: "timestamp_candidate",
      sourceTimestamp: timestamp,
      sourceTimestampRaw: row.createdAt,
      observation: null,
      observedAt,
      evidence: text2
    };
    if (returned && returned[0] === text2 && returned[2].trim() && Number(returned[1]) > 0 && Number.isSafeInteger(Number(returned[1].replace(".", "")))) {
      event.action = "uncalled_return";
      event.amount = Number(returned[1]);
      event.amountMeaning = "return_reported";
      event.actor = { seat: null, name: returned[2], playerId: returned[3], isHero: null };
    } else if (joined && joined[0] === text2 && joined[1].trim() && Number.isSafeInteger(Number(joined[3].replace(".", "")))) {
      event.action = "player_join";
      event.actor = { seat: null, name: joined[1], playerId: joined[2], isHero: null };
    } else if (cards && cards[0] === text2 && cards[1].replace("10", "T") !== cards[2].replace("10", "T")) {
      event.action = "hole_cards";
    } else if (/^-- starting\b/.test(text2)) {
      event.action = "hand_start";
      event.street = "preflop";
    } else if (/^-- ending\b/.test(text2))
      event.action = "hand_end";
    else if (parsePlayerStacks(text2).kind === "valid")
      event.action = "player_stacks";
    else {
      const street = /^(flop|turn|river):/i.exec(text2);
      if (street) {
        event.action = "street";
        event.street = street[1].toLowerCase();
      }
      const actor = /^"(.+) @ ([^"\r\n]+)" (.+)$/.exec(text2);
      if (actor) {
        event.actor = { seat: null, name: actor[1], playerId: actor[2], isHero: null };
        const action2 = actor[3];
        const missedBlind = /^posts a (?:missing small blind|missed big blind) of ((?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,8})?)$/.exec(action2);
        const numeric = /^(bets|raises to|calls|posts (?:a |the )?(?:small blind|big blind|ante) of) ([0-9]+(?:\.[0-9]+)?)( and go all in)?$/.exec(action2);
        if (action2 === "checks" || action2 === "folds")
          event.action = action2 === "checks" ? "check" : "fold";
        else if (missedBlind && actor[0] === text2 && missedBlind[0] === action2 && Number(missedBlind[1]) > 0 && Number.isSafeInteger(Number(missedBlind[1].replace(".", "")))) {
          event.action = "post";
          event.wagerAction = "post";
          event.amount = Number(missedBlind[1]);
          event.amountMeaning = "reported_unspecified";
        } else if (numeric && Number.isFinite(Number(numeric[2]))) {
          event.action = numeric[1] === "bets" ? "bet" : numeric[1] === "raises to" ? "raise" : numeric[1] === "calls" ? "call" : "post";
          event.amount = Number(numeric[2]);
          event.wagerAction = event.action;
          event.amountMeaning = event.action === "raise" ? "street_total" : "reported_unspecified";
          if (event.action === "raise")
            event.raiseTo = event.amount;
          if (numeric[3]) {
            event.allIn = true;
            event.action = "all-in";
          }
        } else {
          const collected = /^collected ([0-9]+(?:\.[0-9]+)?) from .+$/.exec(action2);
          if (collected && Number.isFinite(Number(collected[1]))) {
            event.action = "settlement";
            event.amount = Number(collected[1]);
            event.amountMeaning = "award_reported";
          } else if (/^shows /.test(action2))
            event.action = "showdown";
        }
      }
    }
    if (event.action !== "unparsed")
      event.confidence = "source_reported";
    return event;
  }
  function ingestHandLog(t, payload, observedAt) {
    let rows;
    try {
      rows = parseLogRows(payload);
      const conflict = rows.findIndex((row) => {
        const number = /^-- (?:starting|ending) hand #(\d+)\b/.exec(row.msg);
        return number && t.handNumber !== null && Number(number[1]) !== t.handNumber;
      });
      if (conflict !== -1)
        throw new LogRowValidationError("Log hand number contradicts the requested hand; batch rejected.", conflict);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Log validation failed";
      recordRejectedLogBatch(t, payload, reason, observedAt, error instanceof LogRowValidationError ? error.rowIndex : null);
      timelineReason(t, `Rejected log batch: ${reason}`);
      throw error;
    }
    const existing = new Map(t.source === "pokernow_log_v3" ? t.events.map((e) => [e.id, e]) : []);
    const seen = /* @__PURE__ */ new Map();
    const incoming = /* @__PURE__ */ new Set();
    const incomingEvents = [];
    for (const row of rows) {
      const event = normalizeLogRow(row, observedAt);
      const occurrence = (seen.get(event.id) ?? 0) + 1;
      seen.set(event.id, occurrence);
      event.id = `${t.handId}:log:${event.id}:${occurrence}`;
      incoming.add(event.id);
      incomingEvents.push(event);
    }
    observeLogBatch(t, incomingEvents, existing, observedAt);
    if ([...existing.keys()].some((key) => !incoming.has(key)))
      timelineReason(t, "A full-hand response omitted previously seen rows; retained history may be stale or the response truncated.");
    for (const event of incomingEvents)
      if (!existing.has(event.id))
        existing.set(event.id, event);
    const sorted = [...existing.values()].sort((a, b) => a.sourceTimestamp - b.sourceTimestamp);
    const counts = /* @__PURE__ */ new Map();
    for (const e of sorted)
      counts.set(e.sourceTimestamp, (counts.get(e.sourceTimestamp) ?? 0) + 1);
    let street = null;
    for (const [i, e] of sorted.entries()) {
      e.sequence = i + 1;
      const tied = counts.get(e.sourceTimestamp) > 1;
      e.order = tied ? "ambiguous" : "timestamp_candidate";
      if (tied) {
        street = null;
        timelineReason(t, "Repeated source timestamp: event order (and possibly street attribution) is ambiguous.");
      }
      if (!tied && (e.action === "street" || e.action === "hand_start"))
        street = normalizeLogRow({ createdAt: e.sourceTimestamp, msg: e.evidence }, observedAt).street;
      e.street = tied ? null : street;
      if (e.action === "unparsed")
        timelineReason(t, "Unrecognized log text retained; action coverage is incomplete.");
    }
    if (!sorted.some((e) => e.action === "hand_start"))
      timelineReason(t, "Hand-start row not observed in log response.");
    applyPlayerSeatMapping(t, sorted);
    t.droppedEvents = Math.max(t.droppedEvents, sorted.length - TIMELINE_LIMIT);
    if (sorted.length > TIMELINE_LIMIT)
      timelineReason(t, "Timeline retention limit reached; older events were discarded.");
    t.events = sorted.slice(-TIMELINE_LIMIT);
    t.source = "pokernow_log_v3";
    t.accounting = observedHandAccounting(t.handId, t.events, t.droppedEvents);
    t.historyComplete = false;
    refreshHistoryCoverage(t, observedAt);
  }
  function createSnapshotTimeline(sessionId) {
    let previous = null;
    let history = emptyActionHistory();
    let fingerprint = "";
    let segment = 0;
    let serial = 0;
    let timeline = newHandTimeline(`${sessionId}:segment:${segment}`);
    const archived = [];
    const archive = () => {
      if (timeline.events.length)
        archived.push(timeline);
      if (archived.length > 3)
        archived.shift();
    };
    const append = (action2, state, seat, evidence, at, amount = null) => {
      const event = {
        id: `${sessionId}:observation:${++serial}`,
        sequence: serial,
        street: state?.street ?? null,
        actor: seat ? snapshotActor(seat) : null,
        actorSeatMappingEventId: null,
        action: action2,
        amount,
        amountMeaning: amount === null ? null : "street_total",
        raiseTo: action2 === "raise" ? amount : null,
        wagerAction: action2 === "bet" || action2 === "call" || action2 === "raise" || action2 === "post" ? action2 : null,
        allIn: seat?.isAllIn ?? null,
        source: "dom_snapshot",
        confidence: "inferred",
        order: "observation_batch",
        sourceTimestamp: null,
        sourceTimestampRaw: null,
        observation: history.observation,
        observedAt: at,
        evidence
      };
      timeline.snapshotEvents.push(event);
      if (timeline.snapshotEvents.length > TIMELINE_LIMIT) {
        timeline.snapshotEvents.shift();
        timeline.droppedEvents++;
        timelineReason(timeline, "Snapshot retention limit reached.");
      }
      timeline.events = [...timeline.snapshotEvents];
      return event;
    };
    return {
      observe(state, context, errors, at) {
        const key = JSON.stringify([state, context, errors]);
        if (key === fingerprint)
          return timeline;
        fingerprint = key;
        if (!state || errors.length) {
          append("gap", null, null, errors.join("; ") || "State unavailable", at);
          timelineReason(timeline, "Read failure broke observation continuity.");
          previous = null;
          history = emptyActionHistory();
          return timeline;
        }
        const next = updateActionHistory(history, previous, state, { ...context, includeHero: true, requireExplicitContributions: true });
        if (next.handBoundary) {
          archive();
          timeline = newHandTimeline(`${sessionId}:segment:${++segment}`);
          history = next;
          append("observation_start", state, null, next.notes[0] ?? "Conservative boundary", at);
          for (const seat of state.seats.filter((s) => s.isOccupied && s.isFolded)) {
            const event = append("fold_observed", null, seat, "Already folded at this baseline; fold action, timing and street were not observed", at);
            event.confidence = "unknown";
          }
        }
        history = next;
        if (previous && !next.handBoundary) {
          if (previous.street !== state.street)
            append("street", state, null, `Board count transition ${previous.street} -> ${state.street}; spanning actions unknown`, at);
          for (const before of previous.seats.filter((s) => s.isOccupied)) {
            if (identity2(before) !== identity2(state.seats.find((s) => s.seatNumber === before.seatNumber)))
              append("departure", state, before, "Seat disappeared or changed identity; not a fold or proof of hand exit", at);
          }
          for (const seat of state.seats.filter((s) => s.isOccupied)) {
            const before = previous.seats.find((s) => s.seatNumber === seat.seatNumber);
            if (identity2(seat) === null || identity2(before) !== identity2(seat)) {
              append("arrival", state, seat, "New or unidentified occupied seat/name; hand participation unknown", at);
              continue;
            }
            const records = history.records.get(seat.seatNumber)?.filter((r) => r.observation === history.observation) ?? [];
            for (const record of records)
              append(record.action, state, seat, `Snapshot delta; ${record.wagerAction ?? record.action}; intermediate actions may be missing`, at, record.amount);
            if (before && !before.isFolded && seat.isFolded && !records.some((r) => r.action === "fold")) {
              const event = append("fold", state, seat, "Fold flag became true between observations; intermediate actions/order are unknown", at);
              if (previous.street !== state.street) {
                event.street = null;
                event.evidence += "; street transition spans the fold, so its street is unknown";
              }
            }
            if (previous.street === state.street && !records.length && seat.currentBet !== null && seat.currentBet !== before?.currentBet) {
              append("wager_observed", state, seat, "Changed contribution; post/action/return order is not proven", at, seat.currentBet);
            }
          }
        }
        for (const note of history.notes)
          timelineReason(timeline, note);
        timelineReason(timeline, "DOM polls can miss hero/opponent actions and complete same-card hands; sequence is observation order only.");
        previous = state;
        return timeline;
      },
      current: () => timeline,
      archived: () => archived,
      reset() {
        archive();
        previous = null;
        fingerprint = "";
        history = emptyActionHistory();
        timeline = newHandTimeline(`${sessionId}:segment:${++segment}`);
      }
    };
  }

  // src/firstUtgLive.ts
  function currentFirstUtg(read, assessment, timeline) {
    return currentOpeningWindow(read, assessment, timeline, "UTG");
  }
  function currentHj(read, assessment, timeline) {
    return currentOpeningWindow(read, assessment, timeline, "HJ");
  }
  function currentCo(read, assessment, timeline) {
    return currentOpeningWindow(read, assessment, timeline, "CO");
  }
  function currentBtn(read, assessment, timeline) {
    return currentOpeningWindow(read, assessment, timeline, "BTN");
  }
  function currentSb(read, assessment, timeline) {
    return currentOpeningWindow(read, assessment, timeline, "SB");
  }
  function currentFacingOpen(read, assessment, timeline) {
    return currentOpeningWindow(read, assessment, timeline, "HJ_OPEN");
  }
  function currentCoFacingOpen(read, assessment, timeline) {
    return currentOpeningWindow(read, assessment, timeline, "CO_OPEN_CALL");
  }
  function currentOpeningWindow(read, assessment, timeline, role) {
    const coFacing = role === "CO_OPEN_CALL", facing = role === "HJ_OPEN" || coFacing;
    const source = timeline?.sourceStatus, proof = coFacing ? source?.coFacingOpenProof : facing ? source?.facingOpenProof : role === "UTG" ? source?.firstUtgProof : role === "HJ" ? source?.hjProof : role === "CO" ? source?.coProof : role === "BTN" ? source?.btnProof : source?.sbProof, w = proof?.witness;
    const id = source?.identity, chain = proof?.continuity;
    const foldedPositions = role === "SB" ? ["UTG", "HJ", "CO", "BTN"] : role === "BTN" ? ["UTG", "HJ", "CO"] : role === "CO" ? ["UTG", "HJ"] : role === "HJ" ? ["UTG"] : [];
    const foldedIds = foldedPositions.map((position2) => w?.players.find((p) => p.position === position2)?.playerId);
    const state = assessment.state;
    if (!read || !timeline || !w || !source?.connected || !id || !state || id.tableId !== w.tableId || id.handId !== w.handId || id.handNumber !== w.handNumber || id.heroPlayerId !== w.heroId || (role === "UTG" ? id.frameCursor !== w.cursor : id.frameCursor !== (proof && "anchor" in proof ? proof.anchor.cursor : null)) || timeline.current.handId !== `${w.tableId}:hand:${w.handId}` || timeline.current.handNumber !== w.handNumber || proof?.scope !== (coFacing ? "co_facing_utg_open5_hj_call5" : facing ? "hj_facing_utg_open5" : role === "UTG" ? "first_utg_boundary" : role === "HJ" ? "hj_after_utg_fold" : role === "CO" ? "co_after_utg_hj_folds" : role === "BTN" ? "btn_after_utg_hj_co_folds" : "sb_after_utg_hj_co_btn_folds") || proof.version !== 1 || proof.historyComplete !== false || role !== "UTG" && (Date.now() < w.receivedAt || Date.now() >= proof.expiresAt || w.players.find((p) => p.playerId === w.heroId)?.position !== (coFacing ? "CO" : facing ? "HJ" : role)) || chain?.generation !== w.generation || chain.status !== "validated_prefix" || chain.tableId !== w.tableId || chain.handId !== w.handId || chain.cursor !== w.cursor || chain.throughSequence <= chain.baselineSequence || id.chainGap || timeline.current.coverage.issues.some((i) => i.code === "metadata_gap" || i.code === "identity_conflict") || timeline.current.seatMapping.status === "invalid" || read.context.readErrors.length || state.street !== "preflop" || state.board.length || assessment.smallBlind !== w.smallBlind || assessment.bigBlind !== w.bigBlind || read.context.dealerSeatNumber !== w.players.find((p) => p.position === "BTN")?.seat) return null;
    if (facing && (coFacing ? source.coFacingOpenProof : source.facingOpenProof)?.actor.playerId !== w.heroId) return null;
    if (timeline.current.events.some((e) => e.source === "pokernow_log_v3" && !isSourceNonActionMetadata(e) && !["hand_start", "player_stacks", "post"].includes(e.action) && !(facing && e.action === "raise" && e.actor?.playerId === w.players.find((p) => p.position === "UTG")?.playerId && e.street === "preflop" && e.amountMeaning === "street_total" && e.amount === 5 && e.order !== "ambiguous") && !(coFacing && e.action === "call" && e.actor?.playerId === w.players.find((p) => p.position === "HJ")?.playerId && // From source-proven zero, reported CALL5 matches both total and delta;
    // this does not change the generic log parser's unspecified semantics.
    e.street === "preflop" && e.amountMeaning === "reported_unspecified" && e.amount === 5 && e.order !== "ambiguous") && !(role !== "UTG" && e.action === "fold" && !!e.actor?.playerId && foldedIds.includes(e.actor.playerId) && e.street === "preflop"))) return null;
    if (facing && timeline.current.events.filter((e) => e.source === "pokernow_log_v3" && e.action === "raise").length > 1) return null;
    if (coFacing) {
      const calls = timeline.current.events.filter((e) => e.source === "pokernow_log_v3" && e.action === "call");
      const raise = timeline.current.events.find((e) => e.source === "pokernow_log_v3" && e.action === "raise");
      if (calls.length > 1 || raise && calls[0] && (raise.sourceTimestamp === null || calls[0].sourceTimestamp === null || raise.sourceTimestamp >= calls[0].sourceTimestamp)) return null;
    }
    const logFolds = timeline.current.events.filter((e) => e.source === "pokernow_log_v3" && e.action === "fold");
    if (role !== "UTG" && (logFolds.length > foldedIds.length || new Set(logFolds.map((e) => e.actor?.playerId)).size !== logFolds.length)) return null;
    if ((role === "CO" || role === "BTN" || role === "SB") && logFolds.length > 1 && (logFolds.some((e) => e.order === "ambiguous") || logFolds.some((e, i) => i > 0 && foldedIds.indexOf(e.actor?.playerId ?? void 0) <= foldedIds.indexOf(logFolds[i - 1].actor?.playerId ?? void 0)))) return null;
    if (role !== "UTG") {
      const posts = timeline.current.events.filter((e) => e.source === "pokernow_log_v3" && e.action === "post");
      if (posts.length > 2 || new Set(posts.map((e) => e.actor?.playerId)).size !== posts.length || posts.some((e) => {
        const player2 = w.players.find((p) => p.playerId === e.actor?.playerId);
        const blind = player2?.position === "SB" ? "small" : player2?.position === "BB" ? "big" : null;
        return !blind || e.street !== "preflop" || e.amount !== player2.contribution || !new RegExp(` posts a ${blind} blind of ${player2.contribution}$`).test(e.evidence);
      })) return null;
    }
    if (timeline.current.seatMapping.entries.some((e) => !w.players.some((p) => p.playerId === e.playerId && p.seat === e.seat))) return null;
    const seats = state.seats.filter((s) => s.isOccupied);
    if (seats.length !== 6 || new Set(seats.map((s) => s.seatNumber)).size !== 6 || seats.filter((s) => s.isYou).length !== 1 || seats.filter((s) => s.isCurrentToAct).length !== 1) return null;
    for (const p of w.players) {
      const s = seats.find((s2) => s2.seatNumber === p.seat);
      if (!s || s.isFolded !== foldedPositions.includes(p.position) || s.isAllIn || s.isOffline || s.isSettling || s.betReadError || s.stack === null || s.stack < 100 * w.bigBlind || s.stack !== p.sourceStack && s.stack !== p.sourceStack - p.contribution || facing && (p.position === "UTG" || coFacing && p.position === "HJ") && s.stack !== p.sourceStack - p.contribution || assessment.positions.get(p.seat) !== p.position || (s.currentBet === null ? p.contribution !== 0 : s.currentBet !== p.contribution) || s.isYou !== (p.playerId === w.heroId) || s.isCurrentToAct !== (p.playerId === w.heroId)) return null;
    }
    const hero = seats.find((s) => s.isYou);
    const ranks = "23456789TJQKA";
    const cards = hero.holeCards.map((c) => `${ranks[c.rank - 2]}${c.suit}`).sort();
    if (cards.length !== 2 || JSON.stringify(cards) !== JSON.stringify([...w.heroCards].sort()) || assessment.amountToCall !== null && assessment.amountToCall !== (facing ? 5 : w.bigBlind - w.players.find((p) => p.playerId === w.heroId).contribution)) return null;
    return w;
  }

  // src/preflop.ts
  function buildLivePreflopExecution(read, assessment, sourceWindowKey, exactOpeningSize) {
    const hero = assessment.state?.seats.find((s) => s.isYou && s.isOccupied);
    const control = read.raiseControl;
    return {
      heroIsCurrentToAct: hero?.isCurrentToAct === true && !hero.isFolded && !hero.isSettling,
      ...exactOpeningSize ? { exactOpeningSize } : {},
      sourceWindowKey,
      controls: {
        source: control.selectedRaiseToSource ?? "PokerNow raise control unavailable",
        formVisible: control.formVisible,
        raiseSubmitVisible: control.raiseSubmitVisible,
        raiseSubmitEnabled: control.raiseSubmitEnabled,
        issues: [...control.issues],
        selectedRaiseToBB: assessment.bigBlind !== null && assessment.bigBlind > 0 && control.selectedRaiseToChips !== null ? control.selectedRaiseToChips / assessment.bigBlind : null
      }
    };
  }
  function buildLivePreflopContext(assessment, actionHistory2, timeline, read) {
    const { state, bigBlind, positions: positions2, decisionPot, amountToCall } = assessment;
    if (bigBlind === null || !Number.isFinite(bigBlind) || bigBlind <= 0) return null;
    const hero = state?.seats.find((s) => s.isYou);
    try {
      const coResponse = currentCoFacingOpen(read, assessment, timeline);
      const response = currentFacingOpen(read, assessment, timeline) ?? coResponse;
      if (response) {
        const proof = coResponse ? timeline.sourceStatus.coFacingOpenProof : timeline.sourceStatus.facingOpenProof;
        return buildPreflopContext({
          heroSeat: response.heroSeat,
          playersDealtIn: 6,
          players: response.players.map((p) => ({
            seat: p.seat,
            position: p.position,
            remainingStackBB: state.seats.find((s) => s.seatNumber === p.seat).stack / bigBlind,
            contributionBB: p.contribution / bigBlind,
            folded: false,
            allIn: false
          })),
          potBB: decisionPot === null ? null : decisionPot / bigBlind,
          amountToCallBB: 5 / bigBlind,
          contributionMeaning: "street_total",
          historyCoverage: "complete",
          actionWindowEvidence: proof.scope,
          actions: proof.transitions.map((action2) => ({
            seat: action2.actor.seat,
            action: action2.action,
            totalContributionBB: action2.newContributionChips / bigBlind,
            observation: action2.sequence,
            wagerAction: action2.action
          })),
          historyNotes: [
            `Complete only for the closed ${proof.scope} decision prefix. Global historyComplete=false.`,
            "Response strategy, re-raise legality/grid/reopening and contestable pot remain unproven."
          ],
          tournamentContext: "chip_ev_only"
        });
      }
      const hj = currentHj(read, assessment, timeline);
      const co = currentCo(read, assessment, timeline);
      const btn = currentBtn(read, assessment, timeline);
      const sb = currentSb(read, assessment, timeline);
      const first = currentFirstUtg(read, assessment, timeline) ?? hj ?? co ?? btn ?? sb;
      const folds = sb ? timeline.sourceStatus.sbProof.folds : btn ? timeline.sourceStatus.btnProof.folds : co ? timeline.sourceStatus.coProof.folds : hj ? [timeline.sourceStatus.hjProof.fold] : [];
      if (first) return buildPreflopContext({
        heroSeat: first.heroSeat,
        playersDealtIn: 6,
        players: first.players.map((p) => ({
          seat: p.seat,
          position: p.position,
          remainingStackBB: state.seats.find((s) => s.seatNumber === p.seat).stack / bigBlind,
          contributionBB: p.contribution / bigBlind,
          folded: folds.some((f) => f.playerId === p.playerId),
          allIn: false
        })),
        potBB: decisionPot === null ? null : decisionPot / bigBlind,
        amountToCallBB: (first.bigBlind - first.players.find((p) => p.playerId === first.heroId).contribution) / bigBlind,
        contributionMeaning: "street_total",
        historyCoverage: "complete",
        openingEvidence: sb ? "sb_after_utg_hj_co_btn_folds" : btn ? "btn_after_utg_hj_co_folds" : co ? "co_after_utg_hj_folds" : hj ? "hj_after_utg_fold" : "first_utg_hand_start",
        actions: folds.map((f) => ({
          seat: f.seat,
          action: "fold",
          totalContributionBB: 0,
          observation: f.sequence,
          wagerAction: null
        })),
        historyNotes: [],
        tournamentContext: "chip_ev_only"
      });
      const preflop = state?.street === "preflop" && hero?.isOccupied && bigBlind !== null && state.seats.filter((s) => s.isOccupied).length >= 2 ? buildPreflopContext({
        heroSeat: hero.seatNumber,
        players: state.seats.filter((s) => s.isOccupied).map((s) => ({
          seat: s.seatNumber,
          position: positions2.get(s.seatNumber) ?? null,
          remainingStackBB: s.stack === null ? null : s.stack / bigBlind,
          contributionBB: s.betReadError || s.currentBet === null ? null : s.currentBet / bigBlind,
          folded: s.isFolded,
          allIn: s.isAllIn ?? false
        })),
        playersDealtIn: null,
        potBB: decisionPot === null ? null : decisionPot / bigBlind,
        amountToCallBB: amountToCall === null ? null : amountToCall / bigBlind,
        contributionMeaning: assessment.verification.monetary.contributionSemantics.status === "proven" ? "street_total" : "unknown",
        historyCoverage: "partial",
        tournamentContext: "unknown",
        historyNotes: timeline ? ["Source rows do not certify coverage/catch-up of the current decision window."] : actionHistory2.notes,
        actions: timeline ? timeline.current.events.flatMap((e) => {
          if (e.source !== "pokernow_log_v3" || e.street !== "preflop" || e.actor?.seat == null || !["post", "check", "call", "bet", "raise", "fold", "all-in"].includes(e.action)) return [];
          return [{
            seat: e.actor.seat,
            action: e.action === "post" ? "post_blind" : e.action,
            // Only raise-to is verified as a total in the server parser. No call increment conversion.
            totalContributionBB: e.amountMeaning === "street_total" && e.amount !== null ? e.amount / bigBlind : null,
            observation: e.sourceTimestamp,
            wagerAction: e.wagerAction === "post" ? null : e.wagerAction
          }];
        }) : [...actionHistory2.records.values()].flat().filter((a) => a.street === "preflop").map((a) => ({
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
    const containers2 = form ? [...form.querySelectorAll(RAISE_SELECTORS.amount)].filter(isVisible) : [];
    const container = containers2.length === 1 ? containers2[0] : null;
    if (form && containers2.length === 0) issues.push("Visible raise form has no visible amount container");
    if (containers2.length > 1) issues.push("Multiple visible raise amount containers");
    const inputs = container ? [...container.querySelectorAll(RAISE_SELECTORS.input)].filter(isVisible) : [];
    const input = inputs.length === 1 ? inputs[0] : null;
    if (input && (input.disabled || input.readOnly || input.hasAttribute("disabled") || input.hasAttribute("readonly") || input.closest('fieldset[disabled], [inert], [aria-disabled="true"]'))) issues.push("Selected raise-to input is disabled or read-only");
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
      amountControlVisible: containers2.length > 0,
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

  // src/callControlRead.ts
  var CALL_OBSERVATION_SOURCE = "visible native CALL label; observation only";
  function readCallControl(root = document, isVisible = isControlVisible) {
    const observedAt = Date.now();
    const candidates = [...root.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]')].filter((el2) => isVisible(el2) && /^call\b/i.test((el2.tagName === "INPUT" ? el2.value : el2.textContent ?? "").trim()));
    const issues = [];
    const contradictions = [];
    if (candidates.length > 1) contradictions.push("Multiple visible CALL-labeled controls; no unique readiness observation.");
    const el = candidates.length === 1 ? candidates[0] : null;
    const rawText = el ? el.tagName === "INPUT" ? el.value : el.textContent : null;
    const supported = el?.tagName === "BUTTON" && el.getAttribute("type") === "button";
    if (el && !supported) issues.push("CALL control structure is outside the observed native button/type=button shape.");
    const match = rawText?.trim().match(/^call\s+(\d+(?:\.\d+)?)$/i);
    const amount = match ? Number(match[1]) : null;
    const amountChips = supported && amount !== null && Number.isFinite(amount) && amount <= Number.MAX_SAFE_INTEGER ? amount : null;
    if (el && amountChips === null) issues.push("CALL label does not provide one supported chip amount.");
    const aria = el?.getAttribute("aria-label");
    if (aria && aria.trim().replace(/\s+/g, " ").toLowerCase() !== rawText?.trim().replace(/\s+/g, " ").toLowerCase())
      contradictions.push("CALL accessibility label contradicts or differs from its visible text.");
    return {
      source: CALL_OBSERVATION_SOURCE,
      observedAt,
      serverAuthorization: "unproven",
      visibleCount: candidates.length,
      tag: el?.tagName ?? null,
      type: el?.getAttribute("type") ?? null,
      rawText,
      amountChips,
      enabled: el ? !el.disabled && !el.hasAttribute("disabled") && !el.closest('fieldset[disabled], [inert], [aria-disabled="true"]') : null,
      issues: [...contradictions, ...issues],
      contradictions
    };
  }

  // src/stackRead.ts
  function readStackDisplay(container, winner) {
    const values = [...container?.querySelectorAll(".normal-value") ?? []];
    const prizes = [...container?.querySelectorAll(".table-player-stack-prize") ?? []];
    const isSettling = winner || prizes.length > 0;
    let stackText = null;
    let awardText = null;
    let awardChips = null;
    let reason = null;
    const numeric = (text2) => {
      try {
        return text2 === null ? null : parseChipsValueText(text2);
      } catch {
        return null;
      }
    };
    const residual = (element) => {
      const copy = element.cloneNode(true);
      copy.querySelectorAll(".normal-value, .bb-value").forEach((node) => node.remove());
      return copy.textContent?.trim() ?? "";
    };
    const chipValue = (element) => {
      if (!element?.classList.contains("chips-value")) return null;
      const normal = element.querySelectorAll(".normal-value");
      if (normal.length !== 1 || normal[0].parentElement !== element || [...element.children].some((child) => !child.classList.contains("normal-value") && !child.classList.contains("bb-value")) || residual(element) !== "") return null;
      return normal[0];
    };
    if (!container) {
      reason = "stack container missing or ambiguous";
    } else if (prizes.length > 0) {
      const children = [...container.children];
      const base = chipValue(children[0]);
      const prize = prizes[0];
      const award = prize.children.length === 1 ? chipValue(prize.children[0]) : null;
      const outside = container.cloneNode(true);
      [...outside.children].forEach((child) => child.remove());
      const amount = numeric(award?.textContent ?? null);
      if (prizes.length === 1 && children.length === 2 && children[1] === prize && values.length === 2 && base && award && numeric(base.textContent) !== null && amount !== null && amount > 0 && !prize.classList.contains("red") && residual(prize) === "+" && (outside.textContent?.trim() ?? "") === "") {
        stackText = base.textContent;
        awardText = prize.textContent;
        awardChips = amount;
      } else {
        reason = "settlement stack/award structure is ambiguous or unsupported";
      }
    } else if (values.length === 1) {
      const value = values[0];
      const children = [...container.children];
      const structurallyKnown = children.length === 1 && (children[0] === value || chipValue(children[0]) === value);
      if (structurallyKnown && residual(container) === "" && (numeric(value.textContent) !== null || isAllInStackText(value.textContent))) {
        stackText = value.textContent;
      } else {
        reason = "stack value has unsupported structure or non-numeric text";
      }
    } else if (values.length > 1) {
      reason = `ambiguous stack values (${values.length}); no verified prize separation`;
    } else if (!isAllInStackText(container.textContent)) {
      reason = "stack has no supported numeric value or explicit All In label";
    }
    return {
      stackText,
      isSettling,
      evidence: {
        status: reason ? "unknown" : isSettling ? "settlement_display" : "ordinary_display",
        reason,
        displayedBaseText: stackText,
        displayedBaseChips: numeric(stackText),
        awardText,
        awardChips,
        normalValueCount: values.length,
        prizeCount: prizes.length,
        winnerClass: winner,
        remainingStackReason: isSettling ? "Settlement base/award display is transient; wait for a stable remaining stack." : reason,
        source: "PokerNow stack DOM; prize is display evidence only, never a ledger adjustment"
      }
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
    stack: ".table-player-stack > .chips-value > .normal-value, .table-player-stack > .normal-value",
    stackPrize: ".table-player-stack > .table-player-stack-prize",
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
      const stackContainer = seat ? unique(seat, TABLE_SELECTORS.stackContainer, `seat ${seatNumber} stack container`, false) : null;
      const stack = readStackDisplay(stackContainer, classes.includes("winner"));
      if (seat && [...seat.querySelectorAll(".table-player-stack-prize")].some((prize) => !stackContainer?.contains(prize))) {
        stack.stackText = null;
        stack.isSettling = true;
        stack.evidence.status = "unknown";
        stack.evidence.displayedBaseText = null;
        stack.evidence.displayedBaseChips = null;
        stack.evidence.reason = "prize marker outside the unique stack container";
        stack.evidence.remainingStackReason = stack.evidence.reason;
      }
      if (name && stackContainer && stack.evidence.reason) readErrors.push(`seat ${seatNumber} stack: ${stack.evidence.reason}`);
      const bet = seat ? unique(seat, TABLE_SELECTORS.bet, `seat ${seatNumber} bet`, false) : null;
      const holeCards = [...seat?.querySelectorAll(TABLE_SELECTORS.holeCard) ?? []];
      const isOccupied = name !== null;
      if (!name && (stackContainer || classes.includes("you-player") || classes.includes("decision-current"))) {
        readErrors.push(`seat ${seatNumber}: player markers present but name element missing`);
      }
      seats.push({
        seatNumber,
        isOccupied,
        isYou: classes.includes("you-player"),
        playerNameText: name?.textContent ?? null,
        stackText: stack.stackText,
        stackIsSettlement: stack.isSettling,
        stackContainerText: stackContainer?.textContent ?? null,
        statusClasses: classes,
        holeCardClassLists: holeCards.map((card) => [...card.classList]),
        betValueText: bet?.textContent ?? null
      });
      seatEvidence.push({
        seatNumber,
        seatMatches: document.querySelectorAll(`.table-player-${seatNumber}`).length,
        nameFound: name !== null,
        stackValueFound: stack.stackText !== null,
        betFound: bet !== null,
        stackDisplay: stack.evidence,
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
    const token5 = dealerTokens.length === 1 ? dealerTokens[0] : void 0;
    const dealerSeatNumber = token5 && /^dealer-position-(?:[1-9]|10)$/.test(token5) ? Number(token5.slice("dealer-position-".length)) : null;
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
      callControl: readCallControl(),
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

  // src/unopenedEvidence.ts
  function inspectLiveUnopenedEvidence(read, assessment, timeline) {
    const hand = timeline?.current, source = timeline?.sourceStatus;
    const utg = currentFirstUtg(read, assessment, timeline);
    const hj = currentHj(read, assessment, timeline);
    const co = currentCo(read, assessment, timeline);
    const btn = currentBtn(read, assessment, timeline);
    const sb = currentSb(read, assessment, timeline);
    const first = utg ?? hj ?? co ?? btn ?? sb;
    const mapping = hand?.seatMapping;
    const events = hand?.events.filter((e) => e.source === "pokernow_log_v3") ?? [];
    const starts = events.filter((e) => e.action === "hand_start");
    const hero = assessment.state?.seats.find((s) => s.isOccupied && s.isYou);
    const heroId = source?.identity?.heroPlayerId;
    const entry = mapping?.status === "source_reported" && heroId ? mapping.entries.find((e) => e.playerId === heroId) : void 0;
    const matchingIdentity = !!source?.identity && hand?.handId === `${source.identity.tableId}:hand:${source.identity.handId}` && hand.handNumber === source.identity.handNumber;
    const heroSeatVerified = matchingIdentity && !!entry && entry.seat === hero?.seatNumber;
    const occupied = assessment.state?.seats.filter((s) => s.isOccupied) ?? [];
    const rosterReasons = ["Player stacks proves ID/seat/stack entries, not which players received cards. Six listed players is not a certified six-player dealt-in roster."];
    const rows = events.filter((e) => e.action === "player_stacks").map((e) => ({ event: e, parsed: parsePlayerStacks(e.evidence) }));
    const sixPlayerRow = rows.find((r) => r.parsed.kind === "valid" && r.parsed.entries.length === 6);
    const membershipChanged = rows.some((r) => {
      const parsed = r.parsed;
      return parsed.kind === "valid" && mapping?.entries.some((entry2) => !parsed.entries.some((p) => p.playerId === entry2.playerId && p.seat === entry2.seat));
    }) || !!mapping?.entries.length && (mapping.entries.length !== occupied.length || mapping.entries.some((e) => !occupied.some((s) => s.seatNumber === e.seat))) || (timeline?.snapshotFallback.events.some((e) => e.action === "arrival" || e.action === "departure") ?? false);
    const identityConflict = mapping?.status === "invalid" || !!entry && !!hero && entry.seat !== hero.seatNumber || !matchingIdentity && !!source?.identity;
    if (!sixPlayerRow) rosterReasons.push("No single six-player source row for this hand; mappings merged across rows are not a dealt-in list.");
    if (membershipChanged) rosterReasons.push("Player arrival/departure or changed membership observed; hand roster cannot be certified.");
    if (identityConflict) rosterReasons.push("Contradictory/degraded hand or player-ID-to-seat mapping.");
    if (!heroSeatVerified) rosterReasons.push("Registered hero ID is not independently mapped to the current DOM hero seat.");
    const actionReasons = [];
    if (starts.length !== 1) actionReasons.push("Exactly one source hand_start is required.");
    const actionEvents = events.filter((e) => !isSourceNonActionMetadata(e));
    const disallowed = actionEvents.filter((e) => !["hand_start", "player_stacks", "post", "fold"].includes(e.action));
    if (disallowed.length) actionReasons.push(`Observed source action(s) exclude a proven unopened window: ${disallowed.map((e) => e.action).join(", ")}.`);
    if (actionEvents.some((e) => e.order === "ambiguous" || e.action !== "hand_start" && e.street !== "preflop")) actionReasons.push("Timestamp ties or unknown street prevent ordered preflop attribution.");
    if (actionEvents.some((e) => e.actor && (e.actor.seat === null || !e.actorSeatMappingEventId))) actionReasons.push("A source actor has no verified hand-local seat mapping.");
    if (events.some((e) => e.action === "fold" && e.actor?.playerId === heroId)) actionReasons.push("Hero has already folded in the source window.");
    if (hand?.coverage.issues.length || hand?.droppedEvents) actionReasons.push("Source rejection, omission, gap or retention loss affects this hand.");
    actionReasons.push("No authoritative source prefix/watermark proves all preflop actions through the current hero decision. Timestamp ordering and socket continuity do not establish absence of a delayed/missing action.");
    const proof = (scope, reasons, contradicted = false) => ({
      scope,
      status: contradicted ? "contradicted" : "insufficient",
      confidence: "low",
      provenance: ["log_v3 events/Player stacks + registered.currentPlayer.id; DOM is a cross-check only"],
      reasons
    });
    return {
      socketStateEvidence: source?.sourceMetadata.socketStateEvidence ?? null,
      candidate: !!first || assessment.state?.street === "preflop" && disallowed.length === 0,
      firstUtgBoundary: utg,
      hjWindow: hj,
      coWindow: co,
      btnWindow: btn,
      sbWindow: sb,
      heroSeat: {
        status: first || heroSeatVerified ? "proven" : identityConflict ? "contradicted" : "insufficient",
        seat: first?.heroSeat ?? (heroSeatVerified ? entry.seat : null),
        playerId: heroId ?? null,
        evidenceEventId: entry?.evidenceEventId ?? null
      },
      listedPlayerCount: first ? 6 : sixPlayerRow?.parsed.kind === "valid" ? sixPlayerRow.parsed.entries.length : null,
      dealerSeat: {
        status: first ? "proven" : "insufficient",
        sourceSeat: first?.players.find((p) => p.position === "BTN")?.seat ?? null,
        domSeatCrossCheck: read.context.dealerSeatNumber,
        reason: first ? first.provenance : "Player stacks has no dealer field; captured source has no validated dealer/clockwise seating contract."
      },
      observedSourceEvents: events.map((e) => ({
        id: e.id,
        action: e.action,
        actor: e.actor,
        order: e.order,
        timestamp: e.sourceTimestampRaw,
        evidence: e.evidence
      })),
      proofs: first ? ["roster", "position", "actionWindow"].map((scope) => ({
        scope,
        status: "proven",
        confidence: "high",
        provenance: [first.provenance, `Six explicit dealt-card entries/iHPI IDs; frozen seats cross-checked against dealer/SB/BB and current DOM; ${sb ? "explicit UTG/HJ/CO/BTN folds and intervening turns then first SB turn" : btn ? "explicit UTG/HJ/CO folds and intervening turns then first BTN turn" : co ? "explicit UTG/HJ folds with intervening HJ turn then first CO turn" : hj ? "one explicit UTG fold then first HJ turn" : "first UTG only"}.`],
        reasons: []
      })) : [
        proof("roster", rosterReasons, identityConflict || membershipChanged),
        proof("position", ["Player stacks supplies seat assignments only. Dealt-in membership, source dealer and clockwise seat order are unproven."], identityConflict),
        proof("actionWindow", actionReasons, identityConflict || disallowed.length > 0)
      ],
      raiseControl: {
        selectedRaiseToChips: read.raiseControl?.selectedRaiseToChips ?? null,
        raiseSubmitEnabled: read.raiseControl?.raiseSubmitEnabled ?? null,
        status: "insufficient",
        reason: "Selected text input and enabled submit are observations, not an independently verified minimum/step or validation acknowledgment for 2.5BB. Slider min/max/value is not authoritative."
      }
    };
  }

  // src/openingSizeEvidence.ts
  function openingSizeEvidence(read, assessment, timeline, epoch) {
    const fail = (reason, contradicted = false) => ({
      size: null,
      proof: {
        scope: "raiseLegality",
        status: contradicted ? "contradicted" : "insufficient",
        confidence: "low",
        provenance: ["Dependent UTG/HJ/CO/BTN/SB exact five-chip opening rule"],
        reasons: [reason]
      }
    });
    const utg = currentFirstUtg(read, assessment, timeline);
    const hj = currentHj(read, assessment, timeline);
    const co = currentCo(read, assessment, timeline);
    const btn = currentBtn(read, assessment, timeline);
    const sb = currentSb(read, assessment, timeline);
    const first = utg ?? hj ?? co ?? btn ?? sb;
    const role = utg ? "UTG" : hj ? "HJ" : co ? "CO" : btn ? "BTN" : "SB";
    const proof = utg ? timeline?.sourceStatus.firstUtgProof : hj ? timeline?.sourceStatus.hjProof : co ? timeline?.sourceStatus.coProof : btn ? timeline?.sourceStatus.btnProof : timeline?.sourceStatus.sbProof;
    if (!first || !proof || Date.now() < first.receivedAt || Date.now() >= proof.expiresAt || proof.expiresAt !== first.receivedAt + 1e4)
      return fail("No fresh cross-checked UTG/HJ/CO/BTN/SB decision proof; sizing cannot renew source evidence.");
    if (first.openingSizeProfile !== "pokernow-0.1.72-th-4fun-1-2-exact5-v1")
      return fail("Unknown or changed PokerNow exact-five-chip rule profile/version.");
    const hero = assessment.state.seats.find((s) => s.isYou);
    const sourceHero = first.players.find((p) => p.playerId === first.heroId);
    const contribution3 = sb ? 1 : 0;
    const investment = sb ? 4 : 5;
    if (!epoch || first.bigBlind !== 2 || sourceHero.position !== role || sourceHero.contribution !== contribution3 || hero.stack === null || hero.stack < 200 || hero.stack <= investment)
      return fail("Exact five-chip rule requires a supported first opening turn, its proven contribution and deep remaining capacity.");
    const c = read.raiseControl;
    if (c.issues.length) return fail(`Contradictory Raise controls: ${c.issues.join("; ")}`, true);
    if (c.formVisible && (!c.amountControlVisible || !c.raiseSubmitVisible || c.raiseSubmitEnabled !== true))
      return fail("Open Raise panel lacks a usable selected input or enabled Raise submit.");
    const bbMatch = c.displayedBBText?.trim().match(/^(\d+(?:\.\d+)?)\s*BB$/);
    if (c.formVisible && (c.selectedRaiseToChips === null || c.selectedRaiseToChips < contribution3 || c.selectedRaiseToChips - contribution3 > hero.stack || !bbMatch || Number(bbMatch[1]) * 2 !== c.selectedRaiseToChips))
      return fail("Visible selected amount/BB display/capacity observations contradict each other.", true);
    if (!c.formVisible && (c.amountControlVisible || c.raiseSubmitVisible || c.selectedRaiseToChips !== null))
      return fail("Raise-control visibility/amount observations contradict a closed panel.", true);
    const provenance = sb ? "Exact-size empirical SB rule: paired hand224 screenshot shows input5/2.5BB with SB1; matching cards/stacks/table and user pairing link frame11 accepted tB[hero]=5/cHB=5 to frame12 BB turn. Total5 minus posted1 means additional4. Same 0.1.72 normal no-ante 1/2 play-money profile; not live server preflight or general min/max/grid. Historical acceptance was after expiry; original fresh sbProof deadline applies." : "Exact-size empirical rule: hand169 first-UTG server acceptance (frame66 tB[hero]=5, cHB=5, frame67 next actor), matching 0.1.72 normal no-ante 1/2 play-money Hold'em profile. Not a live server acknowledgment, generic minimum, maximum or chip grid. " + (utg ? "Original firstUtgProof deadline applies." : `${role} equivalence: explicit zero-contribution ${hj ? "UTG fold then first HJ turn" : co ? "UTG fold, HJ turn/fold then first CO turn" : "UTG fold, HJ turn/fold, CO turn/fold then first BTN turn"}; unchanged forced-blind wagers/profile, no prior hero action or reopening restriction. Original ${hj ? "hjProof" : co ? "coProof" : "btnProof"} activation deadline applies, not the anchor's time.`);
    const size = {
      rule: sb ? "pokernow-0.1.72-th-4fun-1-2-sb-exact5-v1" : first.openingSizeProfile,
      provenance,
      decisionWindow: proof.scope,
      tableId: first.tableId,
      handId: first.handId,
      heroId: first.heroId,
      heroSeat: first.heroSeat,
      generation: first.generation,
      sourceCursor: first.cursor,
      decisionEpoch: epoch,
      receivedAt: first.receivedAt,
      expiresAt: proof.expiresAt,
      units: "chips",
      bigBlindChips: 2,
      contributionChips: contribution3,
      raiseToChips: 5,
      investmentChips: investment,
      remainingStackChips: hero.stack,
      controls: !c.formVisible ? "panel_closed_unchecked" : c.selectedRaiseToChips === 5 ? "selected_amount_matches" : "selected_amount_differs"
    };
    return { size, proof: {
      scope: "raiseLegality",
      status: "proven",
      confidence: "high",
      provenance: [provenance, `Table ${first.tableId}, hand ${first.handId}, actor ${first.heroId}, generation ${first.generation}, cursor ${first.cursor}, epoch ${epoch}, expiry ${proof.expiresAt}.`],
      reasons: []
    } };
  }

  // src/hjWindow.ts
  var object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var integer = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var token = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
  var common = ["now", "pre", "eventsData", "mEV", "fV", "sN"];
  function hjPatchKind(raw) {
    if (!object(raw) || !integer(raw.now) || !integer(raw.pre) || raw.now <= raw.pre || !integer(raw.sN) || raw.mEV !== 0 || raw.fV !== "0.1.72" || !Array.isArray(raw.eventsData) || raw.eventsData.length) return null;
    const exact = (fields) => Object.keys(raw).length === fields.length && fields.every((k) => Object.hasOwn(raw, k));
    if (exact([...common, "pGS", "sNA", "pITT", "sNAA", "wBACPI"]) && object(raw.pGS) && Object.keys(raw.pGS).length === 1 && token(Object.keys(raw.pGS)[0]) && Object.values(raw.pGS)[0] === "fold" && raw.sNA === "NSAF" && raw.pITT === null && integer(raw.sNAA) && Array.isArray(raw.wBACPI) && raw.wBACPI.length === 1 && token(raw.wBACPI[0])) return "fold";
    if (exact([...common, "cPI", "pITT", "sNA", "pASA", "sNAA", "mAVTB"]) && token(raw.cPI) && raw.pITT === raw.cPI && raw.sNA === null && raw.sNAA === null && raw.pASA === raw.now && integer(raw.mAVTB)) return "turn";
    return null;
  }
  function validatedOpeningPatch(data, heroId) {
    const raw = data.hjPatch, kind2 = hjPatchKind(raw);
    const projectedKeys = ["now", "pre", "eventsData", "fV", "pITT", kind2 === "fold" ? "pGS" : "cPI"];
    if (!raw || !kind2 || data.event !== "gC" || data.heroId !== heroId || Object.keys(data.frame).length !== projectedKeys.length || !projectedKeys.every((k) => Object.hasOwn(data.frame, k)) || Object.entries(data.frame).some(([k, v]) => JSON.stringify(raw[k]) !== JSON.stringify(v))) return null;
    return { raw, kind: kind2 };
  }
  function advanceHjWindow(pending, data, sequence, at) {
    const w = pending.witness, patch = validatedOpeningPatch(data, w.heroId);
    if (!patch) return null;
    const { raw, kind: kind2 } = patch;
    const utg = w.players.find((p) => p.position === "UTG"), bb = w.players.find((p) => p.position === "BB");
    if (!pending.fold) {
      if (kind2 !== "fold" || sequence !== pending.anchor.sequence + 1 || raw.pre !== pending.anchor.cursor || Object.keys(raw.pGS)[0] !== utg.playerId || raw.wBACPI[0] !== bb.playerId) return null;
      return { pending: { ...pending, fold: {
        sequence,
        cursor: raw.now,
        previousCursor: raw.pre,
        receivedAt: at,
        playerId: utg.playerId,
        seat: utg.seat,
        sourcePatch: structuredClone(raw)
      } } };
    }
    if (kind2 !== "turn" || sequence !== pending.fold.sequence + 1 || raw.pre !== pending.fold.cursor || raw.cPI !== w.heroId) return null;
    const witness = {
      ...w,
      cursor: raw.now,
      previousCursor: raw.pre,
      receivedAt: at,
      provenance: `${w.provenance} Explicit UTG fold at ${pending.fold.cursor}; immediately linked first HJ activation at ${raw.now}. Closed hands-150/168 patch contract; no generic action coverage.`
    };
    return { pending, proof: {
      version: 1,
      scope: "hj_after_utg_fold",
      historyComplete: false,
      expiresAt: at + 1e4,
      witness,
      anchor: structuredClone(pending.anchor),
      fold: structuredClone(pending.fold),
      activation: { sequence, sourcePatch: structuredClone(raw) }
    } };
  }

  // src/bettingWindow.ts
  var object2 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var integer2 = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  var HJ_CALL_RULE = "pokernow-0.1.72-th-4fun-1-2-hj-call5-hand238-v1";
  var HAND238_CAPACITIES = { UTG: 265, HJ: 253, CO: 240, BTN: 244, SB: 254, BB: 246 };
  function matchesHjCallContract(w) {
    return w.openingSizeProfile === "pokernow-0.1.72-th-4fun-1-2-exact5-v1" && w.players.length === 6 && w.players.every((p) => p.sourceStack === HAND238_CAPACITIES[p.position]);
  }
  function isObservedHjCallPatch(raw) {
    if (!object2(raw)) return false;
    const keys = ["tB", "now", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI", "eventsData", "pre", "mEV", "fV", "sN"];
    return Object.keys(raw).length === keys.length && keys.every((k) => Object.hasOwn(raw, k)) && integer2(raw.now) && integer2(raw.pre) && raw.now > raw.pre && integer2(raw.sNAA) && integer2(raw.sN) && raw.mEV === 0 && raw.fV === "0.1.72" && raw.sNA === "NSAA" && raw.pITT === null && same(raw.pGS, {}) && same(raw.wBACPI, []) && same(raw.eventsData, []) && object2(raw.tB) && Object.keys(raw.tB).length === 1 && Object.values(raw.tB)[0] === 5 && Array.isArray(raw.cRPI) && raw.cRPI.length === 2 && raw.cRPI[0] !== raw.cRPI[1] && raw.cRPI[1] === Object.keys(raw.tB)[0];
  }
  function isObservedUtgOpenPatch(raw) {
    if (!object2(raw)) return false;
    const keys = [
      "mR",
      "tB",
      "cHB",
      "now",
      "pGS",
      "sNA",
      "cRPI",
      "pITT",
      "sNAA",
      "wBACPI",
      "eventsData",
      "pre",
      "mEV",
      "fV",
      "sN"
    ];
    return Object.keys(raw).length === keys.length && keys.every((k) => Object.hasOwn(raw, k)) && integer2(raw.now) && integer2(raw.pre) && raw.now > raw.pre && integer2(raw.sNAA) && integer2(raw.sN) && raw.mR === 8 && raw.cHB === 5 && raw.mEV === 0 && raw.fV === "0.1.72" && raw.sNA === "NSAA" && raw.pITT === null && same(raw.pGS, {}) && same(raw.wBACPI, []) && same(raw.eventsData, []) && object2(raw.tB) && Object.keys(raw.tB).length === 1 && Object.values(raw.tB)[0] === 5 && same(raw.cRPI, Object.keys(raw.tB));
  }
  function advanceFacingOpenWindow(pending, data, previous, next, sequence, at) {
    const w = pending.witness, utg = w.players.find((p) => p.position === "UTG"), hj = w.players.find((p) => p.position === "HJ");
    if (!w.openingSizeProfile || data.heroId !== w.heroId || data.event !== "gC" || previous.hI !== w.handId || next.hI !== w.handId || next.gN !== w.handNumber || !same(next.gT, [1, 0])) return null;
    if (pending.hjActivation) {
      if (!matchesHjCallContract(w) || previous.cPI !== hj.playerId) return null;
      const t2 = pending.transition, activation = pending.hjActivation;
      const totalsMatch = (state, called) => w.players.every((p) => (state.tB[p.playerId] ?? 0) === (p.playerId === utg.playerId || called && p.playerId === hj.playerId ? 5 : p.contribution));
      if (!pending.call) {
        const raw = data.bettingPatch;
        const fields = ["tB", "now", "pGS", "cRPI", "pITT", "eventsData", "pre", "fV"];
        if (!isObservedHjCallPatch(raw) || Object.keys(data.frame).length !== fields.length || !fields.every((k) => Object.hasOwn(data.frame, k) && same(data.frame[k], raw[k])) || sequence !== activation.sequence + 1 || raw.pre !== activation.sourcePatch.now || previous.pITT !== hj.playerId || hj.contribution !== 0 || Object.keys(raw.tB)[0] !== hj.playerId || !same(raw.cRPI, [utg.playerId, hj.playerId]) || !totalsMatch(previous, false) || !totalsMatch(next, true) || next.pITT !== null || next.cPI !== hj.playerId) return null;
        const call2 = {
          id: `${w.tableId}:${w.handId}:${w.generation}:${raw.now}:call`,
          tableId: w.tableId,
          handId: w.handId,
          handNumber: w.handNumber,
          generation: w.generation,
          sequence,
          cursor: raw.now,
          previousCursor: raw.pre,
          receivedAt: at,
          street: "preflop",
          action: "call",
          actor: { playerId: hj.playerId, seat: hj.seat, position: "HJ" },
          priorContributionChips: 0,
          newContributionChips: 5,
          investmentChips: 5,
          previousHighestContributionChips: 5,
          observedRaiseIncrementChips: 0,
          originalRoster: structuredClone(w.players),
          evidence: { source: "pokernow_gC", contract: HJ_CALL_RULE, raw: structuredClone(raw) }
        };
        return { pending: { ...pending, call: call2 } };
      }
      const patch2 = validatedOpeningPatch(data, w.heroId), call = pending.call;
      const co = w.players.find((p) => p.position === "CO");
      if (!patch2 || patch2.kind !== "turn" || sequence !== call.sequence + 1 || patch2.raw.pre !== call.cursor || previous.pITT !== null || next.cPI !== co.playerId || next.pITT !== co.playerId || !totalsMatch(previous, true) || !totalsMatch(next, true)) return null;
      const players = w.players.map((p) => ({
        ...p,
        contribution: p.playerId === utg.playerId || p.playerId === hj.playerId ? 5 : p.contribution
      }));
      const contributions = players.map((p) => ({
        playerId: p.playerId,
        seat: p.seat,
        position: p.position,
        forcedChips: w.players.find((original) => original.playerId === p.playerId).contribution,
        voluntaryInvestmentChips: p.position === "UTG" || p.position === "HJ" ? 5 : 0,
        streetTotalChips: p.contribution,
        remainingCapacityChips: p.sourceStack - p.contribution
      }));
      return { pending, coProof: {
        version: 1,
        scope: "co_facing_utg_open5_hj_call5",
        historyComplete: false,
        expiresAt: at + 1e4,
        witness: {
          ...w,
          players,
          cursor: next.now,
          previousCursor: previous.now,
          receivedAt: at,
          provenance: `${w.provenance} Closed hand238 prefix: UTG raise0->5, HJ turn, HJ call0->5 matching highest5, then CO activation. Historical facts only; no CO action permission or whole-hand coverage.`
        },
        anchor: structuredClone(pending.anchor),
        transitions: [structuredClone(t2), structuredClone(call)],
        hjActivation: structuredClone(activation),
        activation: { sequence, sourcePatch: structuredClone(patch2.raw) },
        actor: { playerId: co.playerId, seat: co.seat, position: "CO" },
        facts: {
          amountToCallChips: 5,
          acceptedRaiseToChips: 5,
          nextMinimumRaiseToChips: null,
          aggressionReopened: null,
          contestablePotChips: null
        },
        accounting: {
          units: "chips",
          contributions,
          streetContributionSumChips: contributions.reduce((sum, p) => sum + p.streetTotalChips, 0),
          contestablePotChips: null,
          provenance: "Original forced posts plus two distinct accepted additional investments, cross-checked against source street totals. Remaining capacity is arithmetic, not an observed stack decrement; no pot/returns/rake/settlement proof."
        }
      } };
    }
    if (previous.cPI !== utg.playerId) return null;
    if (!pending.transition) {
      const raw = data.bettingPatch;
      const fields = ["tB", "now", "pGS", "cRPI", "pITT", "eventsData", "pre", "fV"];
      if (!isObservedUtgOpenPatch(raw) || Object.keys(data.frame).length !== fields.length || !fields.every((k) => Object.hasOwn(data.frame, k) && same(data.frame[k], raw[k])) || sequence !== pending.anchor.sequence + 1 || raw.pre !== pending.anchor.cursor || previous.pITT !== utg.playerId || Object.keys(raw.tB)[0] !== utg.playerId || !w.players.every((p) => (previous.tB[p.playerId] ?? 0) === p.contribution) || utg.contribution !== 0 || next.tB[utg.playerId] !== 5 || next.pITT !== null || next.cPI !== utg.playerId) return null;
      const transition = {
        id: `${w.tableId}:${w.handId}:${w.generation}:${raw.now}:raise`,
        tableId: w.tableId,
        handId: w.handId,
        handNumber: w.handNumber,
        generation: w.generation,
        sequence,
        cursor: raw.now,
        previousCursor: raw.pre,
        receivedAt: at,
        street: "preflop",
        action: "raise",
        actor: { playerId: utg.playerId, seat: utg.seat, position: "UTG" },
        priorContributionChips: 0,
        newContributionChips: 5,
        investmentChips: 5,
        previousHighestContributionChips: 2,
        observedRaiseIncrementChips: 3,
        originalRoster: structuredClone(w.players),
        evidence: { source: "pokernow_gC", contract: "hand169_utg_open5_v1", raw: structuredClone(raw) }
      };
      return { pending: { ...pending, transition } };
    }
    const patch = validatedOpeningPatch(data, w.heroId), t = pending.transition;
    if (!patch || patch.kind !== "turn" || sequence !== t.sequence + 1 || patch.raw.pre !== t.cursor || previous.pITT !== null || next.cPI !== hj.playerId || next.pITT !== hj.playerId || !w.players.every((p) => (next.tB[p.playerId] ?? 0) === (p.playerId === utg.playerId ? 5 : p.contribution))) return null;
    return { pending: { ...pending, hjActivation: { sequence, sourcePatch: structuredClone(patch.raw), receivedAt: at } }, proof: {
      version: 1,
      scope: "hj_facing_utg_open5",
      historyComplete: false,
      expiresAt: at + 1e4,
      witness: {
        ...w,
        cursor: next.now,
        previousCursor: previous.now,
        receivedAt: at,
        players: w.players.map((p) => ({ ...p, contribution: p.playerId === utg.playerId ? 5 : p.contribution })),
        provenance: `${w.provenance} Hand169 closed acceptance: UTG total0->5, then separate HJ activation. Decision-local action context only; no response strategy, general legality or whole-hand coverage.`
      },
      anchor: structuredClone(pending.anchor),
      transitions: [structuredClone(t)],
      actor: { playerId: hj.playerId, seat: hj.seat, position: "HJ" },
      activation: { sequence, sourcePatch: structuredClone(patch.raw) },
      facts: {
        amountToCallChips: 5,
        acceptedRaiseToChips: 5,
        nextMinimumRaiseToChips: null,
        aggressionReopened: null,
        contestablePotChips: null
      }
    } };
  }

  // src/callLegalityEvidence.ts
  var CALL_PROVENANCE = "Empirical hand238 paired evidence: frame13 UTG total0->5; frame14 HJ actor/total0; screenshot CALL5 and HJ 7h/Kd/253; frame15 HJ total0->5 with opposing highest unchanged at5; frame16 CO actor. Matching the highest contribution is CALL, not RAISE; cRPI is not an action classifier. Only the observed starting stack vector is covered. Historical acceptance at activation+14806ms cannot renew a live proof.";
  function callLegalityEvidence(read, assessment, timeline, epoch) {
    const source = currentFacingOpen(read, assessment, timeline);
    const proof = timeline?.sourceStatus.facingOpenProof;
    const now = Date.now();
    if (!source || !proof || !epoch || source.openingSizeProfile !== "pokernow-0.1.72-th-4fun-1-2-exact5-v1" || proof.expiresAt !== source.receivedAt + 1e4 || now < source.receivedAt || now >= proof.expiresAt) return null;
    const hero = source.players.find((p) => p.playerId === source.heroId);
    const utg = source.players.find((p) => p.position === "UTG");
    const remaining = assessment.state.seats.find((s) => s.isYou).stack;
    const gap = Math.max(...source.players.filter((p) => p.playerId !== source.heroId).map((p) => p.contribution)) - hero.contribution;
    if (hero.position !== "HJ" || hero.contribution !== 0 || utg.contribution !== 5 || gap !== 5 || !Number.isFinite(remaining) || remaining < gap) return null;
    const provenance = `Phase 4A ${proof.scope}; accepted UTG total ${utg.contribution}, HJ total ${hero.contribution}; original six-player source/DOM cross-check, numeric HJ remaining ${remaining}. No server CALL authorization inferred.`;
    const costProof = {
      scope: "callCost",
      status: "proven",
      confidence: "high",
      provenance: [provenance],
      reasons: []
    };
    const control = read.callControl ?? null;
    let readiness = "unobserved";
    const reasons = [];
    if (!control) reasons.push("No CALL-control observation in this read.");
    else if (!Number.isSafeInteger(control.observedAt) || control.observedAt < source.receivedAt || control.observedAt > now || now - control.observedAt >= 1e4) {
      readiness = "unusable";
      reasons.push("CALL observation is stale, pre-activation or from a future clock; it cannot refresh source proof.");
    } else if (control.issues.length) {
      readiness = control.contradictions.length ? "contradicted" : "unusable";
      reasons.push(...control.issues);
    } else if (control.visibleCount === 0) reasons.push("No visible CALL control; absence does not prove an action is illegal.");
    else if (control.amountChips !== gap) {
      readiness = "contradicted";
      reasons.push("Observed CALL amount disagrees with the certified five-chip source gap.");
    } else if (control.enabled !== true) {
      readiness = "unusable";
      reasons.push("CALL control is not enabled; readiness is unavailable.");
    } else {
      readiness = "observed_matching";
      reasons.push("One enabled native CALL label agrees with the source gap; UI readiness is not server authorization.");
    }
    const binding = {
      decisionEpoch: epoch,
      profile: source.openingSizeProfile,
      tableId: source.tableId,
      handId: source.handId,
      handNumber: source.handNumber,
      heroId: source.heroId,
      heroSeat: source.heroSeat,
      heroCards: [...source.heroCards],
      generation: source.generation,
      cursor: source.cursor,
      activationSequence: proof.activation.sequence,
      receivedAt: source.receivedAt,
      expiresAt: proof.expiresAt
    };
    const covered = matchesHjCallContract(source);
    const permission = covered && readiness === "observed_matching" ? {
      version: 1,
      rule: HJ_CALL_RULE,
      action: "CALL",
      status: "proven",
      confidence: "high",
      authority: "scoped_empirical_acceptance",
      binding,
      decisionWindow: proof.scope,
      street: "preflop",
      actor: structuredClone(proof.actor),
      units: "chips",
      callCostChips: 5,
      priorContributionChips: 0,
      resultingContributionChips: 5,
      remainingStackChips: remaining,
      remainingStackAfterCallChips: remaining - gap,
      players: structuredClone(source.players),
      continuity: structuredClone(proof.continuity),
      control: structuredClone(control),
      provenance: CALL_PROVENANCE,
      fullActionSetCertified: false,
      recommendationAuthorized: false
    } : null;
    return {
      version: 1,
      scope: "hj_facing_utg_open5_call",
      binding,
      facts: {
        units: "chips",
        bigBlindChips: source.bigBlind,
        utgContributionChips: utg.contribution,
        heroContributionChips: hero.contribution,
        contributionGapChips: gap,
        remainingStackChips: remaining,
        capacitySufficient: true,
        payableIfCallAuthorizedChips: Math.min(gap, remaining),
        resultingContributionIfCalledChips: hero.contribution + gap,
        provenance
      },
      costProof,
      ui: { status: readiness, observation: control, reasons },
      serverLegality: covered ? {
        status: "proven",
        confidence: "high",
        rule: HJ_CALL_RULE,
        authority: "scoped_empirical_acceptance",
        provenance: CALL_PROVENANCE,
        reasons: []
      } : {
        status: "unproven",
        confidence: "low",
        rule: null,
        authority: null,
        provenance: CALL_PROVENANCE,
        reasons: ["Starting stacks are outside the exact hand238 empirical CALL contract; sufficient capacity alone does not extend coverage."]
      },
      permission,
      legalActionsProof: {
        scope: "legalActions",
        status: readiness === "contradicted" ? "contradicted" : "insufficient",
        confidence: "low",
        provenance: [provenance],
        reasons: readiness === "contradicted" ? reasons : [permission ? "Scoped CALL legality is certified; the full action set and response strategy remain unproven." : "No ready scoped CALL permission; the full action set remains unproven. Matching UI/cost/capacity alone cannot authorize advice."]
      },
      authorized: false,
      historyComplete: false
    };
  }

  // src/decisionProofs.ts
  function buildLiveDecisionProofs(read, assessment, timeline, preflop, epoch, packet = null) {
    const proofs = PROOF_SCOPES.map((scope) => ({
      scope,
      status: "insufficient",
      confidence: "low",
      provenance: [],
      reasons: [`${scope}: independent evidence is unavailable for this decision.`]
    }));
    const set = (scope, status, source2, reasons = []) => {
      proofs[PROOF_SCOPES.indexOf(scope)] = { scope, status, confidence: status === "proven" ? "high" : "low", provenance: [source2], reasons };
    };
    const state = assessment.state;
    const seats = state?.seats.filter((s) => s.isOccupied) ?? [];
    const active = seats.filter((s) => !s.isFolded);
    const hero = active.find((s) => s.isYou);
    const settling = seats.some((s) => s.isSettling);
    const allIn = seats.some((s) => s.isAllIn);
    const cards = [...state?.board ?? [], ...hero?.holeCards ?? []];
    const duplicates = new Set(cards.map((c) => `${c.rank}${c.suit}`)).size !== cards.length;
    const ambiguousActors = seats.filter((s) => s.isYou).length > 1 || seats.filter((s) => s.isCurrentToAct).length > 1;
    const stateReasons = [
      ...read.context.readErrors,
      ...!state ? ["Table cannot be parsed."] : [],
      ...!hero?.isCurrentToAct ? ["Waiting for an active hero turn."] : [],
      ...hero?.holeCards.length !== 2 ? ["Hero cards are incomplete."] : [],
      ...active.some((s) => s.isOffline) ? ["An active seat is offline; participation is uncertain."] : [],
      ...settling ? ["Settlement display: wait for stable ordinary stacks; prize is not spendable stack."] : [],
      ...duplicates || ambiguousActors ? ["Contradictory visible cards or decision actors."] : []
    ];
    set("decisionState", settling || duplicates || ambiguousActors ? "contradicted" : stateReasons.length ? "insufficient" : "proven", "Current synchronous DOM read", stateReasons);
    const stacksKnown = !!hero && active.length >= 2 && active.every((s) => s.stack !== null && Number.isFinite(s.stack) && s.stack > 0 && !s.isAllIn && !s.isSettling);
    set(
      "stack",
      settling ? "contradicted" : stacksKnown ? "proven" : "insufficient",
      "Current ordinary numeric stack nodes",
      stacksKnown && !settling ? [] : ["Usable numeric remaining stacks/capacity are missing, all-in or settling."]
    );
    const blindsKnown = assessment.smallBlind !== null && assessment.bigBlind !== null && assessment.smallBlind > 0 && assessment.smallBlind <= assessment.bigBlind;
    set("blinds", blindsKnown ? "proven" : "insufficient", "Explicit parsed PokerNow blind nodes", blindsKnown ? [] : ["Blinds are missing or inconsistent; no fallback BB."]);
    const gap = assessment.verification.monetary.callGap;
    set(
      "callCost",
      gap.status === "proven" && hero?.stack != null && gap.value !== null && gap.value <= hero.stack ? "proven" : "insufficient",
      gap.source,
      gap.status === "proven" && hero?.stack != null && gap.value !== null && gap.value <= hero.stack ? [] : [...gap.reasons, "Exact payable call cost is not proven within remaining capacity."]
    );
    const pot = assessment.pot;
    const reconciled = assessment.verification.monetary.potDisplay;
    set(
      "pot",
      reconciled.matches === false ? "contradicted" : pot.isPotSemanticsVerified && pot.decisionPot !== null && pot.decisionPotSource ? "proven" : "insufficient",
      pot.decisionPotSource ?? "Existing contestable-pot proof",
      reconciled.matches === false ? ["Pot displays contradict collected pot plus current contributions."] : pot.isPotSemanticsVerified && pot.decisionPot !== null && pot.decisionPotSource ? [] : ["Reconciled display arithmetic does not prove hero contestability, returns or rake/drop."]
    );
    set("position", "insufficient", "Existing dealer/ascending-seat position map", ["Position labels are derived; clockwise/dealt-in roster evidence is not independently certified for this decision."]);
    set("roster", "insufficient", "Occupied DOM seats", ["Occupied/non-folded does not prove the dealt-in roster; away/sit-out remains unresolved."]);
    set("eligibility", "insufficient", "Current seats and existing pot proof", [allIn ? "All-in/side-pot eligibility remains outside the supported simple-pot subset." : "Eligibility of all remaining players and absence of hidden side pots are unproven."]);
    if (timeline?.current.seatMapping.status === "invalid") set(
      "eligibility",
      "contradicted",
      timeline.current.seatMapping.source,
      timeline.current.seatMapping.reasons
    );
    const returns = timeline?.current.events.filter((e) => e.action === "uncalled_return") ?? [];
    set("accounting", "insufficient", "Existing return/award accounting; unchanged", [returns.length ? `Observed uncalled return(s) ${returns.map((e) => e.id).join(", ")}; their net effect on this decision pot is not independently resolved.` : "No decision-local evidence excludes/resolves returns and rake/drop; no return row is not proof of absence."]);
    const source = timeline?.sourceStatus;
    const chain = source?.sourceMetadata.socketContinuity;
    const connectionGap = source?.identity?.chainGap || chain?.chainGap || timeline?.current.coverage.issues.some((i) => i.code === "metadata_gap" || i.code === "identity_conflict");
    set(
      "connection",
      connectionGap ? "contradicted" : source?.connected && source.identity && chain?.status === "observed_continuous" ? "proven" : "insufficient",
      "Current source identity + connection-generation continuity (not log completeness)",
      connectionGap ? ["Unresolved connection/metadata gap may affect the decision window; a later linked segment does not prove recovery."] : source?.connected && source.identity && chain?.status === "observed_continuous" ? [] : ["Waiting for a source identity and observed continuous connection segment; reconnect resets evidence."]
    );
    const betting = assessment.verification.betting;
    const windowProven = betting.lastFullRaiseAmount.status === "proven";
    set(
      "actionWindow",
      windowProven ? "proven" : "insufficient",
      betting.lastFullRaiseAmount.source,
      windowProven ? [] : ["No independently complete ordered current-street action window. Polling, log timestamps and cursor links cannot supply it."]
    );
    set("reopening", betting.actionReopened.status === "proven" ? "proven" : "insufficient", betting.actionReopened.source, betting.actionReopened.reasons);
    set("raiseLegality", "insufficient", "Existing bounds and current raise form", ["Selected raise-to/submit visibility is not a minimum or reopened-action certificate; exact chip unit and legal sizing remain required."]);
    set("legalActions", "insufficient", "Existing action-control reader", ["The captured Raise submit proves its own visibility/enabled state only; exact current CHECK/CALL/BET action set is not certified."]);
    set("rangeInput", "insufficient", "Existing range estimator", ["Live snapshot-inferred range inputs are partial; independently supported range/uncertainty inputs are unavailable."]);
    set("equity", "insufficient", "Existing equity engine", ["A valid range-based point estimate plus independently supplied sensitivity bounds is required."]);
    set("terminal", "insufficient", "Existing terminal postflop policy", [state?.street === "river" ? "A complete decision-local window must establish that call/check ends betting." : "Future betting/equity realization is not modeled; raw flop/turn equity is not realized action EV."]);
    const unopened = state?.street === "preflop" ? inspectLiveUnopenedEvidence(read, assessment, timeline) : null;
    if (unopened) {
      for (const p of unopened.proofs) proofs[PROOF_SCOPES.indexOf(p.scope)] = p;
      set("raiseLegality", "insufficient", "Current raise control; no independent sizing contract", [unopened.raiseControl.reason]);
      const deepEnough = stacksKnown && assessment.bigBlind !== null && active.every((s) => s.currentBet !== null && s.stack + s.currentBet >= 100 * assessment.bigBlind);
      set(
        "stack",
        settling ? "contradicted" : deepEnough ? "proven" : "insufficient",
        "Numeric remaining stacks + explicit current street contributions; 100BB+ RFI scope",
        deepEnough && !settling ? [] : ["Hero and every active opponent must have proven 100BB+ hand-start effective capacity."]
      );
      const hj = currentHj(read, assessment, timeline);
      const co = currentCo(read, assessment, timeline);
      const btn = currentBtn(read, assessment, timeline);
      const sb = currentSb(read, assessment, timeline);
      const first = currentFirstUtg(read, assessment, timeline) ?? hj ?? co ?? btn ?? sb;
      if (first) {
        const continuity = (sb ? source.sbProof : btn ? source.btnProof : co ? source.coProof : hj ? source.hjProof : source.firstUtgProof).continuity;
        set("connection", "proven", `Validated ${sb ? "SB" : btn ? "BTN" : co ? "CO" : hj ? "HJ" : "first-UTG"} source prefix: generation ${continuity.generation}, registration ${continuity.baselineSequence} through ${continuity.throughSequence}, cursor ${continuity.cursor}. ${first.provenance} Not whole-hand/log coverage.`);
        set("stack", "proven", `${first.provenance} Numeric remaining DOM stacks independently >=100BB for all six players.`);
        set("callCost", "proven", `${first.provenance} Normal SB=1/BB=2 source totals; hero contribution ${sb ? 1 : 0}, no intervening wagers. Call gap=${sb ? 1 : 2} chips.`);
      }
    }
    const opening = openingSizeEvidence(read, assessment, timeline, epoch);
    if (unopened?.firstUtgBoundary || unopened?.hjWindow || unopened?.coWindow || unopened?.btnWindow || unopened?.sbWindow) proofs[PROOF_SCOPES.indexOf("raiseLegality")] = opening.proof;
    if (packet?.preflopExecution?.exactOpeningSize && JSON.stringify(packet.preflopExecution.exactOpeningSize) !== JSON.stringify(opening.size)) {
      set("raiseLegality", "contradicted", "Dependent sizing/packet cross-check", ["Sizing belongs to a different source, control or epoch."]);
    }
    const facing = currentFacingOpen(read, assessment, timeline);
    const coFacing = currentCoFacingOpen(read, assessment, timeline);
    const callLegality = callLegalityEvidence(read, assessment, timeline, epoch);
    const responseStrategy = facing ? {
      ...inspectLiveHjResponseStrategy({ preflop, holeCards: hero?.holeCards }),
      binding: {
        decisionEpoch: epoch,
        tableId: facing.tableId,
        handId: facing.handId,
        heroId: facing.heroId,
        generation: facing.generation,
        cursor: facing.cursor,
        receivedAt: facing.receivedAt,
        expiresAt: source.facingOpenProof.expiresAt
      },
      call: {
        contributionGapChips: callLegality?.facts.contributionGapChips ?? null,
        payableIfCallAuthorizedChips: callLegality?.facts.payableIfCallAuthorizedChips ?? null,
        authorization: callLegality?.permission ? "proven" : "unproven",
        reason: "See dependent callLegality: scoped empirical permission, current control readiness and strategy authorization are separate."
      },
      threeBet: {
        stackCapacityChips: hero.stack,
        fullMinimumRaiseToChips: null,
        permittedMaximumRaiseToChips: null,
        chipUnit: null,
        raiseRights: "unproven",
        reason: "Observed UTG acceptance and mR=8 do not authorize a future HJ 3-bet or establish its size/grid."
      },
      // Requirements still missing in THIS valid context; not another proof gate.
      remainingRequirements: {
        FOLD: ["reviewed_response_strategy"],
        CALL: ["reviewed_response_strategy", ...callLegality?.permission ? [] : ["current_call_authorization"]],
        THREE_BET: ["reviewed_response_strategy_and_size", "raise_rights", "minimum_and_maximum_totals", "chip_grid"]
      }
    } : null;
    const response = facing ?? coFacing;
    const responseWindow = facing ? source.facingOpenProof : coFacing ? source.coFacingOpenProof : null;
    if (response && responseWindow) {
      const continuity = responseWindow.continuity;
      set("connection", "proven", `Same source authority: generation ${continuity.generation}, baseline ${continuity.baselineSequence}, through ${continuity.throughSequence}, cursor ${continuity.cursor}.`);
      set("actionWindow", "proven", response.provenance);
      set("position", "proven", `${response.provenance} Frozen ${coFacing ? "CO" : "HJ"} seat ${response.heroSeat}.`);
      set("roster", "proven", `${response.provenance} Original six dealt-in IDs; no departures/folds.`);
      set("stack", "proven", "Source starting capacities + current numeric DOM stacks; accepted voluntary wagers deducted from the actors' starting capacities.");
      if (coFacing) set("callCost", "proven", `${coFacing.provenance} Highest total5 minus CO total0 is five chips, covered by numeric CO capacity; no CO CALL permission.`);
      if (callLegality) {
        proofs[PROOF_SCOPES.indexOf("callCost")] = callLegality.costProof;
        proofs[PROOF_SCOPES.indexOf("legalActions")] = callLegality.legalActionsProof;
      }
    }
    const envelope = {
      version: 1,
      decisionEpoch: epoch,
      binding: "diagnostic-only: no packet",
      handId: source?.identity ? timeline.current.handId : null,
      connectionGeneration: source?.firstUtgProof?.continuity.generation ?? source?.hjProof?.continuity.generation ?? source?.coProof?.continuity.generation ?? source?.btnProof?.continuity.generation ?? source?.sbProof?.continuity.generation ?? chain?.generation ?? null,
      proofs
    };
    if (packet) envelope.binding = decisionProofBinding({ ...packet, decisionProofs: envelope }, epoch);
    const chartAction = packet ? unopenedChartAction(packet) : state?.street === "preflop" && hero?.holeCards.length === 2 && preflop ? unopenedChartAction({ table: { street: "preflop" }, hero: { holeCards: hero.holeCards }, preflop }) : null;
    const activation = packet ? assessPacketDecisionProofs({ ...packet, decisionProofs: envelope }, true) : assessDecisionProofs({
      street: state?.street ?? null,
      opponents: assessment.activeOpponents,
      amountToCall: assessment.amountToCall,
      preflopSituation: preflop?.situation ?? null,
      preflopRfiCandidate: unopened?.candidate ?? false,
      preflopAction: chartAction,
      aggressionPossible: assessment.legality.aggressionReopened
    }, proofs);
    if (facing && callLegality?.ui.status === "contradicted") {
      activation.allowed = false;
      activation.state = "unsafe";
      activation.reasons.push(...callLegality.ui.reasons);
    } else if (facing && activation.state !== "unsafe") {
      activation.allowed = false;
      activation.state = "unsupported";
      activation.reasons.push(...responseStrategy.reasons);
      activation.reasons.push("HJ response activation remains disabled; missing CALL/3-BET legality must never substitute FOLD.");
    } else if (coFacing && activation.state !== "unsafe") {
      activation.allowed = false;
      activation.state = "unsupported";
      activation.reasons.push("CO facing UTG open plus HJ caller: no reviewed response strategy or independent CO action permission. Unsupported CALL/3-BET must never substitute FOLD.");
    }
    return {
      evidence: envelope,
      activation,
      unopened,
      openingSize: opening.size,
      responseWindow,
      responseStrategy,
      callLegality,
      coResponse: coFacing && responseWindow ? {
        binding: {
          decisionEpoch: epoch,
          tableId: coFacing.tableId,
          handId: coFacing.handId,
          heroId: coFacing.heroId,
          heroCards: coFacing.heroCards,
          generation: coFacing.generation,
          cursor: coFacing.cursor,
          receivedAt: coFacing.receivedAt,
          expiresAt: responseWindow.expiresAt
        },
        chosenAction: null,
        liveAuthorized: false,
        strategy: "missing",
        legality: "unproven",
        accounting: source.coFacingOpenProof.accounting
      } : null
    };
  }
  function liveProofRevision(timeline) {
    const s = timeline.sourceStatus;
    return JSON.stringify({
      connected: s.connected,
      identity: s.identity,
      handId: timeline.current.handId,
      firstUtg: s.firstUtgProof ?? null,
      ...s.hjProof ? { hj: s.hjProof } : {},
      ...s.coProof ? { co: s.coProof } : {},
      ...s.btnProof ? { btn: s.btnProof } : {},
      ...s.sbProof ? { sb: s.sbProof } : {},
      ...s.facingOpenProof ? { facingOpen: s.facingOpenProof } : {},
      ...s.coFacingOpenProof ? { coFacingOpen: s.coFacingOpenProof } : {},
      generation: s.sourceMetadata.socketContinuity.generation,
      continuity: s.sourceMetadata.socketContinuity.status,
      gap: s.sourceMetadata.socketContinuity.chainGap,
      lastCursor: s.sourceMetadata.socket.at(-1)?.metadata.frame,
      events: timeline.current.events.map((e) => [e.id, e.order, e.actor?.seat]),
      coverage: timeline.current.coverage.status,
      rejected: timeline.current.coverage.rejectedBatchCount,
      mapping: timeline.current.seatMapping
    });
  }
  function activationLabel(state) {
    return {
      proof_ready: "Inputs proven; evaluating supported policy",
      waiting_for_proof: "Waiting for decision proof",
      unsupported: "Unsupported situation",
      unsafe: "Contradictory / unsafe state"
    }[state];
  }

  // src/diagnostics.ts
  var DIAGNOSTICS_KEY = "poker-ai:diagnostics";
  var lastSnapshot = null;
  function buildLiveDiagnosticSnapshot(read, assessment, history, preflop = null, packet = null, unclassifiedControls = [], handTimeline2 = null) {
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
        isSettling: seat.isSettling ?? false,
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
        contributionSemantics: assessment.verification.monetary.contributionSemantics,
        callGap: assessment.verification.monetary.callGap,
        potDisplayReconciliation: assessment.verification.monetary.potDisplay,
        amountToCallMeaning: "uncapped gap from explicit total street contributions/check; absent labels remain unknown; see callGap provenance",
        highestActiveOpposingContribution: assessment.verification.monetary.highestOpposingContribution,
        knownNumericBetSubtotalIncludingFolded: assessment.state ? occupied.reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null,
        betSubtotalHasUnknowns: !assessment.state || assessment.verification.monetary.contributions.some((s) => s.contribution.value === null),
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
        callControl: read.callControl ?? null,
        unclassifiedControls,
        controlsMeaning: "Selected raise-to is input evidence, not a legal minimum. Slider attributes and unclassified controls do not verify legality."
      },
      decision: {
        scopedProofs: buildLiveDecisionProofs(read, assessment, handTimeline2, preflop, packet?.decisionProofs?.decisionEpoch ?? "diagnostic", packet),
        packetBuilt: packet !== null,
        decisionPotActuallyUsedBB: packet?.table.potBB ?? null,
        packetAmountToCallBB: packet?.facingAction.amountBB ?? null,
        policyPotActuallyUsedBB: packet?.policyContext?.potVerified && policy && policy.actionEVs.some((row) => row.action !== "FOLD" && row.evBB !== null) ? packet.table.potBB : null,
        candidateActionSizes: packet ? generatePolicyCandidates(packet) : [],
        candidateSizeStatus: packet?.policyContext ? "see policy reasons and verified bounds" : "withheld: no verified policy legality/pot inputs",
        policy,
        preflopExecution: assessment.state?.street === "preflop" ? buildLivePreflopExecution(read, assessment, handTimeline2 ? liveProofRevision(handTimeline2) : "source unavailable") : null,
        preflopStrategyScope: "Conditional six-max 100BB+ RFI reference, 2.5BB fixed opening convention. Facing-open response unsupported. Cards/turn/window/connection/roster/position/blinds/stacks need independent proofs; RAISE also needs size legality. Contestable pot, EV, rake and postflop eligibility are not chart prerequisites.",
        potEvidence: packet?.potEvidence ?? null,
        engineCalculations: packet?.engineCalculations ?? null
      },
      confidence: assessment.confidence,
      preflop,
      raw: read.raw,
      evidence: read.evidence,
      context: read.context,
      actionHistory: { records: Object.fromEntries(history.records), observation: history.observation, notes: history.notes },
      handTimeline: handTimeline2,
      assumptions: {
        pot: "Total = collected + street contributions was observed live; hero eligibility, returns and side pots still require proof before EV use.",
        positions: "Ascending seat numbers assumed clockwise; verify against dealer and screen.",
        bets: "Numeric labels are street totals and explicit check is zero in supported reads. Absence/other action words remain unknown.",
        street: "Board counts 0/3/4/5 and an observed new-hand reset were confirmed live; this is not a stable hand identifier.",
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
  function logLiveDiagnostics(read, assessment, history, preflop = null, packet = null, handTimeline2 = null) {
    let mode = null;
    try {
      mode = localStorage.getItem(DIAGNOSTICS_KEY);
    } catch {
    }
    if (mode !== "1" && mode !== "once") {
      lastSnapshot = null;
      return;
    }
    const snapshot = buildLiveDiagnosticSnapshot(read, assessment, history, preflop, packet, readUnclassifiedControls(), handTimeline2);
    const serialized = JSON.stringify(snapshot);
    const comparison = JSON.stringify(snapshot, (_key, value) => value?.source === CALL_OBSERVATION_SOURCE ? { ...value, observedAt: void 0 } : value);
    if (mode !== "once" && comparison === lastSnapshot) return;
    lastSnapshot = comparison;
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

  // src/pokerNowTransport.ts
  var TIMELINE_CHANNEL = "poker-ai:hand-source:v1";
  var object3 = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  var token2 = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
  function tableIdFromPath(path) {
    return /^\/games\/([A-Za-z0-9_-]{1,160})\/?$/.exec(path)?.[1] ?? null;
  }
  function validHandIdentity(value, tableId) {
    return object3(value) && value.tableId === tableId && token2(value.handId) && Number.isSafeInteger(value.handNumber) && Number(value.handNumber) > 0 && (value.heroPlayerId === null || token2(value.heroPlayerId)) && (value.frameCursor === null || typeof value.frameCursor === "string" && value.frameCursor.length < 160 || typeof value.frameCursor === "number" && Number.isSafeInteger(value.frameCursor)) && typeof value.chainGap === "boolean" && ["registered.gameState", "rup", "gC"].includes(String(value.source));
  }

  // src/sourceMetadata.ts
  var FIELD_LIMIT = 64;
  var VALUE_LIMIT = 160;
  var SOCKET_METADATA_LIMIT = 32;
  var LOG_METADATA_LIMIT = 4;
  var LOG_METADATA_ROW_LIMIT = 32;
  var valueNames = /* @__PURE__ */ new Set([
    "id",
    "hI",
    "gN",
    "now",
    "pre",
    "r",
    "createdAt",
    "seq",
    "sequence",
    "index",
    "offset",
    "cursor",
    "watermark",
    "version",
    "revision",
    "eventId",
    "messageId",
    "batchId",
    "snapshotId",
    "snapshotVersion",
    "nextCursor",
    "previousCursor",
    "lastEventId",
    "firstEventId",
    "total",
    "count",
    "hasMore",
    "complete"
  ]);
  var containers = /* @__PURE__ */ new Set(["meta", "metadata", "pagination", "coverage"]);
  var object4 = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  var kind = (x) => x === null ? "null" : Array.isArray(x) ? "array" : typeof x;
  var scalar = (x) => x === null || typeof x === "boolean" || typeof x === "number" && Number.isFinite(x) || typeof x === "string" && x.length <= VALUE_LIMIT;
  var allowedPath = (path) => {
    const parts = path.split(".");
    return parts.length <= 3 && parts.slice(0, -1).every((p) => containers.has(p)) && valueNames.has(parts.at(-1));
  };
  function inspectMetadataFields(input) {
    const result = { fields: [], truncated: false };
    const visit = (value, prefix, depth2) => {
      if (!object4(value)) return;
      for (const [key, field] of Object.entries(value)) {
        if (result.fields.length === FIELD_LIMIT) {
          result.truncated = true;
          break;
        }
        const path = prefix + (/^[A-Za-z0-9_-]{1,64}$/.test(key) ? key : "<unsupported-key>");
        const entry = { path, type: kind(field) };
        if (allowedPath(path) && scalar(field)) entry.value = field;
        result.fields.push(entry);
        if (containers.has(key) && object4(field)) {
          if (depth2 < 2) visit(field, path + ".", depth2 + 1);
          else result.truncated = true;
        }
      }
    };
    visit(input, "", 0);
    return result;
  }
  function validateSocketMetadata(value) {
    if (!object4(value) || typeof value.event !== "string" || !["registered", "rup", "gC"].includes(value.event) || !Number.isSafeInteger(value.wrapperLength) || Number(value.wrapperLength) < 2 || !Array.isArray(value.extraWrapperItems) || value.extraWrapperItems.length > 2) return null;
    const inventory = (raw) => {
      if (!object4(raw) || !Array.isArray(raw.fields) || raw.fields.length > FIELD_LIMIT || typeof raw.truncated !== "boolean") return null;
      const fields = [];
      for (const entry of raw.fields) {
        if (!object4(entry) || typeof entry.path !== "string" || entry.path.length > 200 || typeof entry.type !== "string" || !["null", "array", "string", "number", "boolean", "object", "undefined"].includes(entry.type)) return null;
        const field = { path: entry.path, type: entry.type };
        if (Object.hasOwn(entry, "value")) {
          if (!allowedPath(entry.path) || !scalar(entry.value) || kind(entry.value) !== entry.type) return null;
          field.value = entry.value;
        }
        fields.push(field);
      }
      return { fields, truncated: raw.truncated };
    };
    const envelope = inventory(value.envelope), frame = inventory(value.frame);
    const extras = value.extraWrapperItems.map(inventory);
    return envelope && frame && extras.every((x) => x !== null) ? {
      event: value.event,
      wrapperLength: Number(value.wrapperLength),
      envelope,
      frame,
      extraWrapperItems: extras
    } : null;
  }
  function getField(inventory, name) {
    return inventory.fields.find((f) => f.path === name)?.value;
  }
  function integerKey(x) {
    return typeof x === "number" && Number.isSafeInteger(x) && x >= 0 ? BigInt(x) : typeof x === "string" && /^(?:0|[1-9][0-9]{0,159})$/.test(x) ? BigInt(x) : null;
  }
  function numericRelation(before, after) {
    const a = integerKey(before), b = integerKey(after);
    return a === null || b === null ? "not_comparable" : b === a ? "equal" : b > a ? "increased" : "decreased";
  }
  var headerValues = /* @__PURE__ */ new Set(["date", "etag", "last-modified", "content-range", "content-length", "x-total-count", "x-request-id", "x-cursor", "x-watermark", "x-revision"]);
  var SOCKET_STATE_CANDIDATES = [
    "players",
    "seats",
    "dealerSeat",
    "dealerID",
    "eventsData",
    "gT",
    "cPI",
    "pITT",
    "pASA",
    "sPI",
    "iHPI",
    "cRPI"
  ];
  function summarizeSocketStateEvidence(observations) {
    return {
      authority: "observational_only",
      provesRoster: false,
      provesPositions: false,
      provesActionWindow: false,
      provesRaiseLegality: false,
      scope: "This inventory retains field names/types only. The separate sourceStatus.firstUtgEvidence contains bounded production proof projections; sourceStatus.firstUtg is the validated witness. rawValueRetained=false here does not describe that separate bridge.",
      fields: [...SOCKET_STATE_CANDIDATES, "currentPlayer"].map((name) => {
        const samples = observations.flatMap((observation) => {
          const inventories = name === "currentPlayer" ? [{ boundary: "envelope", inventory: observation.metadata.envelope }] : [
            { boundary: "frame", inventory: observation.metadata.frame },
            ...observation.metadata.event === "registered" ? [{ boundary: "envelope", inventory: observation.metadata.envelope }] : []
          ];
          return inventories.flatMap(({ boundary, inventory }) => inventory.fields.filter((field) => field.path === name).map((field) => ({
            event: observation.metadata.event,
            localSequence: observation.localSequence,
            generation: observation.localConnectionGeneration,
            type: field.type,
            boundary
          })));
        });
        return {
          name,
          availability: samples.length ? "name_and_type_only" : "not_in_retained_inventory",
          rawValueRetained: false,
          semanticStatus: "unverified",
          samples
        };
      }),
      requiredCapture: "Inspect sourceStatus.firstUtgEvidence first. Older inventory-only exports cannot recover discarded values; a missing production projection requires source values, never reconstruction from names/types or DOM occupancy."
    };
  }
  function createSourceMetadataAudit() {
    const socket = [];
    const logs = [];
    let firstSocket = null;
    let socketObservations = 0, logResponses = 0, lastSequence = -1;
    const newContinuity = (generation) => ({
      generation,
      status: "unknown",
      chainGap: false,
      reasons: [],
      linkedUpdates: 0,
      duplicateCandidates: 0,
      scope: "Observed socket metadata within one connection generation only. Not full-hand, reconnect/backfill or log coverage proof."
    });
    let continuity = newContinuity(null);
    const issue = (reason, gap = false) => {
      if (!continuity.reasons.includes(reason)) continuity.reasons.push(reason);
      continuity.chainGap ||= gap;
      continuity.status = "incomplete";
    };
    return {
      socket(raw, localSequence, generation, at, bootstrap) {
        if (!Number.isSafeInteger(localSequence) || Number(localSequence) <= lastSequence || !Number.isSafeInteger(generation) || Number(generation) < 1) return;
        const metadata = validateSocketMetadata(raw);
        if (!metadata) return;
        if (continuity.generation !== null && Number(generation) < continuity.generation) {
          issue("Stale connection-generation observation rejected.", true);
          return;
        }
        const oldSequence = lastSequence;
        lastSequence = Number(localSequence);
        const previous = socket.at(-1);
        const before = previous && previous.localConnectionGeneration === generation ? getField(previous.metadata.frame, "now") : void 0;
        const now = getField(metadata.frame, "now"), pre = getField(metadata.frame, "pre");
        const validatedBootstrap = bootstrap && bootstrap.sequence === localSequence && bootstrap.generation === generation;
        if (validatedBootstrap && bootstrap.kind === "registration" && metadata.event === "registered") {
          continuity = newContinuity(Number(generation));
          continuity.baselineSequence = Number(localSequence);
        } else if (validatedBootstrap && bootstrap.kind === "equivalent_refresh" && metadata.event === "rup" && continuity.generation === generation && !continuity.reasons.length && Number(localSequence) === oldSequence + 1 && previous?.metadata.event === "registered" && now === before) {
        } else if (continuity.generation !== generation) {
          continuity = newContinuity(Number(generation));
          if (metadata.event !== "registered" || integerKey(now) === null) {
            issue("No valid registration baseline observed in this connection generation.");
          }
        } else {
          if (Number(localSequence) !== oldSequence + 1) issue("Local metadata observations skipped; the observed socket chain cannot be certified.", true);
          if (metadata.event !== "gC") {
            issue("Mid-generation full/registration frame has no validated continuity/backfill contract.");
          } else if (now === before && pre === getField(previous.metadata.frame, "pre")) {
            continuity.duplicateCandidates++;
            issue("Repeated pre/now pair; duplicate candidate, not proven identical event payload.");
          } else {
            if (before == null || pre == null || integerKey(now) === null || integerKey(before) === null) {
              issue("Missing or unsupported cursor/predecessor; continuity is unknown.");
            } else if (pre !== before || numericRelation(before, now) !== "increased") {
              issue("Predecessor mismatch or non-increasing cursor; possible gap, replay or out-of-order frame.", true);
            } else {
              continuity.linkedUpdates++;
              if (!continuity.reasons.length) continuity.status = "observed_continuous";
            }
          }
        }
        const entry = {
          localSequence: Number(localSequence),
          localConnectionGeneration: Number(generation),
          receivedAt: at,
          metadata,
          nowComparedWithPreviousObservation: numericRelation(before, now),
          preExactlyMatchesPreviousNow: before == null || pre == null ? null : before === pre
        };
        firstSocket ??= entry;
        socket.push(entry);
        socketObservations++;
        if (socket.length > SOCKET_METADATA_LIMIT) socket.shift();
      },
      response(headers, httpStatus, handId, handNumber, at) {
        const fields = [];
        let truncated = false;
        headers.forEach((value, name) => {
          if (fields.length === FIELD_LIMIT) {
            truncated = true;
            return;
          }
          const field = { path: name, type: "string" };
          if (headerValues.has(name) && value.length <= VALUE_LIMIT) field.value = value;
          fields.push(field);
        });
        const entry = {
          requestedHandId: handId,
          requestedHandNumber: handNumber,
          observedAt: at,
          httpStatus,
          headers: fields,
          headersTruncated: truncated,
          payloadKind: "not_inspected",
          envelope: { fields: [], truncated: false },
          rowCount: null,
          rows: [],
          rowSamplesTruncated: false,
          socketHeadAtResponse: socket.length ? {
            localSequence: socket.at(-1).localSequence,
            generation: socket.at(-1).localConnectionGeneration,
            now: getField(socket.at(-1).metadata.frame, "now") ?? null
          } : null,
          timestampLinks: [],
          headTimestampObserved: false,
          provesCurrentDecisionCatchUp: false,
          timestampLinkScope: "Exact integer createdAt = socket now * 100 candidate only; units, unique event identity, hand association and complete log coverage are unproven. Compared with retained frames in the response-head generation, at/before that head. Non-match may be a non-log update, lag, truncation or missing evidence. Head match is not a catch-up certificate."
        };
        logs.push(entry);
        logResponses++;
        if (logs.length > LOG_METADATA_LIMIT) logs.shift();
        return entry;
      },
      payload(entry, payload) {
        entry.payloadKind = kind(payload);
        entry.envelope = inspectMetadataFields(payload);
        entry.rowCount = Array.isArray(payload) ? payload.length : null;
        if (Array.isArray(payload)) {
          entry.rows = payload.slice(0, LOG_METADATA_ROW_LIMIT).map((row, responseIndex) => ({ responseIndex, metadata: inspectMetadataFields(row) }));
          entry.rowSamplesTruncated = payload.length > LOG_METADATA_ROW_LIMIT;
          const head = entry.socketHeadAtResponse;
          const samples = entry.rows.map((row) => ({ row, raw: getField(row.metadata, "createdAt") }));
          entry.timestampLinks = samples.flatMap(({ row, raw }) => {
            const timestamp = integerKey(raw);
            if (timestamp === null || raw == null) return [];
            const candidates = socket.filter((frame) => head && frame.localConnectionGeneration === head.generation && frame.localSequence <= head.localSequence && integerKey(getField(frame.metadata.frame, "now")) !== null && integerKey(getField(frame.metadata.frame, "now")) * 100n === timestamp).map((frame) => ({
              localSequence: frame.localSequence,
              generation: frame.localConnectionGeneration,
              socketNowRaw: getField(frame.metadata.frame, "now")
            }));
            return [{
              responseIndex: row.responseIndex,
              sourceTimestampRaw: raw,
              candidates,
              sampledRowsWithSameTimestamp: samples.filter((s) => integerKey(s.raw) === timestamp).length
            }];
          });
          entry.headTimestampObserved = entry.timestampLinks.some((link) => link.candidates.some((frame) => frame.localSequence === head?.localSequence));
        }
      },
      snapshot() {
        return {
          authority: "observational_only",
          provesCompletePrefix: false,
          scope: "Known socket envelope/frame and log response boundaries. Search-name scalar values are hypotheses, not semantic proof. Unknown object interiors/values are omitted; absence here does not prove absence upstream.",
          localFields: "localSequence, localConnectionGeneration, receivedAt, observedAt and responseIndex are generated by this reader, not server action IDs.",
          comparisonScope: "Numeric magnitude and exact pre/previous-now equality between retained observations only; no units, contiguity, causal order or catch-up guarantee.",
          socketContinuity: { ...continuity, reasons: [...continuity.reasons] },
          socketStateEvidence: summarizeSocketStateEvidence(firstSocket && socket[0] !== firstSocket ? [firstSocket, ...socket] : socket),
          firstSocket,
          socketObservations,
          socketSamplesDropped: Math.max(0, socketObservations - socket.length),
          socket,
          logResponses,
          logSamplesDropped: Math.max(0, logResponses - logs.length),
          logs
        };
      }
    };
  }

  // src/firstUtgState.ts
  var object5 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var token3 = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v) && !["__proto__", "prototype", "constructor"].includes(v);
  var integer3 = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var chips3 = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER;
  var dictionary = (v) => object5(v) && Object.keys(v).length <= 10 && Object.keys(v).every(token3);
  var ids = (v) => Array.isArray(v) && v.length <= 10 && v.every(token3) && new Set(v).size === v.length;
  var allowed = new Set("id hI gN now pre r gT seats iHPI dealerID dealerSeat sBPI bBPI tB pGS cPI pITT smallBlind bigBlind ante deadButton gM mode aD aS cM cR players pC cRPI eventsData rHP rHC oTC gameResult version fV nR mTB rIT sPM".split(" "));
  function validateFrame(frame) {
    if (!object5(frame) || JSON.stringify(frame).length > 4e4) throw new Error("Malformed or oversized source projection.");
    for (const [k, v] of Object.entries(frame)) {
      if (!allowed.has(k)) throw new Error(`Unsupported projected field ${k}.`);
      let valid2 = true;
      if (["id", "hI", "dealerID", "sBPI", "bBPI"].includes(k)) valid2 = token3(v);
      if (["cPI", "pITT"].includes(k)) valid2 = v === null || token3(v);
      if (["gN", "now", "pre"].includes(k)) valid2 = integer3(v);
      if (k === "dealerSeat") valid2 = integer3(v) && v >= 1 && v <= 10;
      if (["smallBlind", "bigBlind"].includes(k)) valid2 = chips3(v) && v > 0;
      if (k === "ante") valid2 = v === null || chips3(v);
      if (["r", "deadButton", "aD", "aS", "cM", "cR"].includes(k)) valid2 = typeof v === "boolean";
      if (["gM", "mode"].includes(k)) valid2 = typeof v === "string" && v.length <= 32;
      if (["version", "fV", "rIT"].includes(k)) valid2 = typeof v === "string" && v.length <= 32;
      if (k === "sPM") valid2 = typeof v === "boolean";
      if (k === "mTB") valid2 = v === null || chips3(v);
      if (k === "nR") valid2 = Array.isArray(v) && v.length <= 10 && v.every(integer3);
      if (k === "gT") valid2 = Array.isArray(v) && v.length === 2 && v.every(integer3);
      if (["iHPI", "cRPI", "rHP"].includes(k)) valid2 = ids(v);
      if (k === "rHC") valid2 = v === null;
      if (k === "eventsData") valid2 = Array.isArray(v) && v.length === 0;
      if (k === "gameResult") valid2 = v === "<D>";
      if (k === "seats") valid2 = Array.isArray(v) && v.length <= 10 && v.every((s, i) => Array.isArray(s) && s.length === 2 && integer3(s[0]) && s[0] >= 1 && s[0] <= 10 && token3(s[1]) && (i === 0 || v[i - 1][0] < s[0])) && new Set(v.map((s) => s[1])).size === v.length;
      if (k === "oTC") valid2 = object5(v) && Object.keys(v).length === 1 && Array.isArray(v["1"]) && v["1"].length <= 5 && v["1"].every((c) => typeof c === "string" && /^[2-9TJQKA][shdc]$/.test(c));
      if (k === "tB") valid2 = dictionary(v) && Object.values(v).every((x) => x === "<D>" || chips3(x));
      if (k === "pGS") valid2 = dictionary(v) && Object.values(v).every((x) => typeof x === "string" && ["inGame", "fold", "allIn", "<D>"].includes(x));
      if (k === "players") valid2 = dictionary(v) && Object.entries(v).every(([id, p]) => p === "<D>" || object5(p) && Object.entries(p).every(([field, value]) => field === "id" ? value === id : field === "stack" ? chips3(value) : field === "status" ? typeof value === "string" && value.length <= 32 : field === "disconnectedSince" ? integer3(value) || value === "<D>" : false));
      if (k === "pC") valid2 = dictionary(v) && Object.values(v).every((h) => object5(h) && Object.keys(h).length === 1 && Array.isArray(h.cards) && h.cards.length === 2 && h.cards.every((c) => object5(c) && Object.keys(c).every((f) => ["value", "showing"].includes(f)) && typeof c.showing === "boolean" && (c.value === null || typeof c.value === "string" && /^[2-9TJQKA][shdc]$/.test(c.value))));
      if (!valid2) throw new Error(`Malformed or unsupported source ${k}.`);
    }
  }
  function validateState(state, tableId, heroId) {
    validateFrame(state);
    if (state.id !== tableId || !token3(state.hI) || !integer3(state.gN) || state.gN < 1 || !integer3(state.now) || !Array.isArray(state.seats) || !dictionary(state.players) || !object5(state.pGS) || !Array.isArray(state.gT) || !ids(state.iHPI) || !object5(state.pC) || !Object.hasOwn(state.players, heroId)) throw new Error("Incomplete registered/carried source identity or player state.");
    for (const [id, p] of Object.entries(state.players)) if (!object5(p) || p.id !== id || !chips3(p.stack) || typeof p.status !== "string") {
      throw new Error("Incomplete or contradictory source player identity/stack.");
    }
    if (state.seats.some((s) => !Object.hasOwn(state.players, s[1]))) throw new Error("Seat references an unavailable source player.");
    for (const key of ["pGS", "tB", "pC"]) {
      const missing = object5(state[key]) && Object.keys(state[key]).find((id) => !Object.hasOwn(state.players, id));
      if (missing) throw new Error(`Player-keyed source ${key}.${missing} references an unavailable player.`);
    }
    if (state.dealerID !== void 0 && state.dealerSeat !== void 0 && !state.seats.some((s) => s[0] === state.dealerSeat && s[1] === state.dealerID)) {
      throw new Error("Contradictory source dealer/seat assignment.");
    }
  }
  function initializeUtgState(frame, tableId, heroId) {
    validateFrame(frame);
    const state = structuredClone(frame);
    validateState(state, tableId, heroId);
    return state;
  }
  function advanceUtgState(previous, patch, tableId, heroId) {
    validateFrame(patch);
    if (patch.r === true) throw new Error("Full-refresh/backfill continuity is not supported by the carried proof.");
    if (!integer3(patch.now) || patch.now <= previous.now || patch.pre !== previous.now) throw new Error("Source predecessor mismatch, stale or replayed update.");
    if (Object.hasOwn(patch, "id") && patch.id !== tableId) throw new Error("Conflicting source table identity.");
    const changedHand = Object.hasOwn(patch, "hI") && patch.hI !== previous.hI || Object.hasOwn(patch, "gN") && patch.gN !== previous.gN;
    if (changedHand && (!token3(patch.hI) || patch.hI === previous.hI || patch.gN !== previous.gN + 1 || !Array.isArray(patch.iHPI) || !object5(patch.pC) || !object5(patch.tB) || JSON.stringify(patch.gT) !== "[1,0]")) {
      throw new Error("Conflicting or incomplete new-hand transition.");
    }
    const next = structuredClone(previous);
    const removed = Object.entries(patch.players ?? {}).filter(([, p]) => p === "<D>").map(([id]) => id);
    if (removed.length) {
      const roster = patch.iHPI;
      if (!Array.isArray(roster) || !Array.isArray(patch.seats) || !object5(patch.pC) || Object.keys(patch.pC).length !== roster.length || patch.seats.length !== roster.length || !roster.every((id) => Object.hasOwn(patch.pC, id) && patch.seats.some((s) => s[1] === id)) || removed.some((id) => id === heroId || !Object.hasOwn(previous.players, id) || roster.includes(id) || patch.pGS?.[id] !== "<D>" || Object.hasOwn(patch.pC, id))) {
        throw new Error("Player deletion lacks a consistent explicit roster/card snapshot and status deletion.");
      }
      next.pC = {};
    }
    for (const [key, value] of Object.entries(patch)) {
      if (["players", "pGS", "tB", "pC"].includes(key)) {
        if (changedHand && ["tB", "pC"].includes(key)) next[key] = {};
        next[key] ??= {};
        for (const [id, entry] of Object.entries(value)) {
          if (entry === "<D>") {
            delete next[key][id];
            continue;
          }
          if (key === "players") {
            next.players[id] = { ...next.players[id], ...structuredClone(entry) };
            if (next.players[id].disconnectedSince === "<D>") delete next.players[id].disconnectedSince;
          } else next[key][id] = structuredClone(entry);
        }
      } else next[key] = structuredClone(value);
    }
    validateState(next, tableId, heroId);
    if (removed.some((id) => ["dealerID", "sBPI", "bBPI", "cPI", "pITT"].some((key) => next[key] === id) || ["cRPI", "rHP"].some((key) => next[key]?.includes(id)))) {
      throw new Error("Deleted player remains referenced by source roles or actors.");
    }
    if (changedHand && (Object.keys(next.pC).length !== next.iHPI.length || !next.iHPI.every((id) => Object.hasOwn(next.pC, id)))) {
      throw new Error("Dealt-card membership contradicts the new-hand roster.");
    }
    if (changedHand && next.iHPI.length === 6 && next.seats.length === 6) {
      const dealer = next.seats.findIndex((s) => s[0] === next.dealerSeat && s[1] === next.dealerID);
      if (dealer < 0 || next.seats[(dealer + 1) % 6][1] !== next.sBPI || next.seats[(dealer + 2) % 6][1] !== next.bBPI) {
        throw new Error("Contradictory six-player dealer/blind traversal.");
      }
    }
    return next;
  }

  // src/coWindow.ts
  function advanceCoWindow(pending, data, sequence, at) {
    const result = advanceFoldPrefix(pending, data, sequence, at, "CO");
    if (!result) return null;
    return { pending: result.pending, ...result.proof ? { proof: {
      ...result.proof,
      scope: "co_after_utg_hj_folds",
      folds: result.proof.folds
    } } : {} };
  }
  function advanceBtnWindow(pending, data, sequence, at) {
    const result = advanceFoldPrefix(pending, data, sequence, at, "BTN");
    if (!result) return null;
    return { pending: result.pending, ...result.proof ? { proof: {
      ...result.proof,
      scope: "btn_after_utg_hj_co_folds",
      folds: result.proof.folds,
      coActivation: structuredClone(pending.coActivation)
    } } : {} };
  }
  function advanceSbWindow(pending, data, sequence, at) {
    const result = advanceFoldPrefix(pending, data, sequence, at, "SB");
    if (!result) return null;
    return { pending: result.pending, ...result.proof ? { proof: {
      ...result.proof,
      scope: "sb_after_utg_hj_co_btn_folds",
      folds: result.proof.folds,
      coActivation: structuredClone(pending.coActivation),
      btnActivation: structuredClone(pending.btnActivation)
    } } : {} };
  }
  function advanceFoldPrefix(pending, data, sequence, at, target) {
    const w = pending.witness, patch = validatedOpeningPatch(data, w.heroId);
    const length = target === "CO" ? 2 : target === "BTN" ? 3 : 4;
    if (!patch || pending.folds.length > length || w.players.find((p) => p.playerId === w.heroId)?.position !== target) return null;
    const { raw, kind: kind2 } = patch;
    const actors = ["UTG", "HJ", "CO", "BTN", "SB"].map((position2) => w.players.find((p) => p.position === position2));
    const bb = w.players.find((p) => p.position === "BB");
    const turns = [pending.hjActivation, pending.coActivation, pending.btnActivation].filter((v) => v !== void 0);
    const step = pending.folds.length + turns.length;
    const previousCursor = step === 0 ? pending.anchor.cursor : step % 2 === 0 ? turns.at(-1).sourcePatch.now : pending.folds.at(-1).cursor;
    if (step >= length * 2 || sequence !== pending.anchor.sequence + step + 1 || raw.pre !== previousCursor) return null;
    if (step % 2 === 0) {
      const actor = actors[step / 2];
      if (kind2 !== "fold" || Object.keys(raw.pGS)[0] !== actor.playerId || raw.wBACPI[0] !== bb.playerId) return null;
      return { pending: { ...pending, folds: [...pending.folds, {
        sequence,
        cursor: raw.now,
        previousCursor: raw.pre,
        receivedAt: at,
        playerId: actor.playerId,
        seat: actor.seat,
        sourcePatch: structuredClone(raw)
      }] } };
    }
    if (kind2 !== "turn" || raw.cPI !== actors[(step + 1) / 2].playerId) return null;
    if (step < length * 2 - 1) return { pending: {
      ...pending,
      [step === 1 ? "hjActivation" : step === 3 ? "coActivation" : "btnActivation"]: { sequence, sourcePatch: structuredClone(raw) }
    } };
    const witness = {
      ...w,
      cursor: raw.now,
      previousCursor: raw.pre,
      receivedAt: at,
      provenance: `${w.provenance} Explicit UTG fold -> HJ turn -> HJ fold -> ${target === "CO" ? "first CO" : target === "BTN" ? "CO turn -> CO fold -> first BTN" : "CO turn -> CO fold -> BTN turn -> BTN fold -> first SB"} activation at ${raw.now}. Closed ${target === "CO" ? "hands-143/149/167" : target === "BTN" ? "hands-148/166" : "hands-147/165"} patch contract; no generic action coverage.`
    };
    return { pending, proof: {
      version: 1,
      historyComplete: false,
      expiresAt: at + 1e4,
      witness,
      anchor: structuredClone(pending.anchor),
      folds: structuredClone(pending.folds),
      hjActivation: structuredClone(pending.hjActivation),
      activation: { sequence, sourcePatch: structuredClone(raw) }
    } };
  }

  // src/firstUtgSource.ts
  var object6 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  var token4 = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
  var integer4 = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  var same2 = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  var equivalent = (a, b) => {
    if (a === b) return true;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => equivalent(v, b[i]));
    return object6(a) && object6(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => Object.hasOwn(b, k) && equivalent(a[k], b[k]));
  };
  function firstUtg(reg, next, tableId, generation, at, role = "UTG") {
    const a = reg.frame, b = next.frame, hero = reg.heroId;
    const firstActor = role === "UTG" ? hero : b.cPI;
    if (role !== "UTG" && (a.version !== "0.1.72" || (b.version ?? a.version) !== "0.1.72" || b.fV !== "0.1.72")) return null;
    if (!hero || next.event !== "gC" || a.id !== tableId || Object.hasOwn(b, "id") && b.id !== tableId || b.r === true || next.heroId !== hero || !integer4(a.now) || !integer4(b.now) || b.pre !== a.now || b.now <= a.now || !integer4(a.gN) || b.gN !== a.gN + 1 || !token4(a.hI) || !token4(b.hI) || a.hI === b.hI || !same2(a.gT, [1, 5]) || !same2(b.gT, [1, 0]) || !same2(b.oTC, { "1": [] }) || b.gameResult !== "<D>" || b.cPI !== firstActor || b.pITT !== firstActor || !same2(b.cRPI, []) || !same2(b.eventsData, []) || !same2(b.players, {}) || !same2(b.rHP, []) || b.rHC !== null) return null;
    const profile = { smallBlind: 1, bigBlind: 2, ante: null, deadButton: false, gM: "th", mode: "4fun", aD: false, aS: false, cM: false, cR: false };
    for (const [k, value] of Object.entries(profile)) if (!same2(a[k], value) || Object.hasOwn(b, k) && !same2(b[k], value)) return null;
    if (!Array.isArray(a.seats) || a.seats.length !== 6 || Object.hasOwn(b, "seats") && !same2(a.seats, b.seats) || !Array.isArray(b.iHPI) || b.iHPI.length !== 6 || !object6(a.players) || !object6(b.pC) || !object6(b.tB) || !object6(a.pGS) || !object6(b.pGS)) return null;
    const seats = a.seats;
    if (!seats.every((s, i) => Array.isArray(s) && s.length === 2 && integer4(s[0]) && s[0] >= 1 && s[0] <= 10 && token4(s[1]) && (i === 0 || seats[i - 1][0] < s[0]))) return null;
    const rows = seats;
    const ids2 = rows.map((s) => s[1]);
    if (new Set(ids2).size !== 6 || new Set(b.iHPI).size !== 6 || Object.keys(b.pC).length !== 6 || !ids2.every((id) => b.iHPI.includes(id) && Object.hasOwn(b.pC, id)) || Object.keys(a.players).length !== 6 || Object.keys(b.pGS).some((id) => !ids2.includes(id))) return null;
    const dealer = rows.findIndex(([seat, id]) => seat === b.dealerSeat && id === b.dealerID);
    if (dealer < 0) return null;
    const cycle = [...rows.slice(dealer), ...rows.slice(0, dealer)];
    const heroIndex = role === "UTG" ? 3 : role === "HJ" ? 4 : role === "CO" ? 5 : role === "BTN" ? 0 : 1;
    if (cycle[1][1] !== b.sBPI || cycle[2][1] !== b.bBPI || cycle[3][1] !== firstActor || cycle[heroIndex][1] !== hero || Object.keys(b.tB).length !== 2 || b.tB[b.sBPI] !== 1 || b.tB[b.bBPI] !== 2) return null;
    const roles = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];
    const players = [];
    for (let i = 0; i < cycle.length; i++) {
      const [seat, playerId] = cycle[i], p = a.players[playerId], cards = b.pC[playerId]?.cards;
      if (!object6(p) || p.id !== playerId || !integer4(p.stack) || p.stack < 202 || p.status !== "inGame" || Object.hasOwn(p, "disconnectedSince") || (b.pGS[playerId] ?? a.pGS[playerId]) !== "inGame" || !Array.isArray(cards) || cards.length !== 2 || cards.some((c) => !object6(c) || c.showing !== false || (playerId === hero ? typeof c.value !== "string" || !/^[2-9TJQKA][shdc]$/.test(c.value) : c.value !== null))) return null;
      players.push({ seat, playerId, position: roles[i], sourceStack: p.stack, contribution: i === 1 ? 1 : i === 2 ? 2 : 0 });
    }
    const heroCards2 = b.pC[hero].cards.map((c) => c.value);
    if (new Set(heroCards2).size !== 2) return null;
    return {
      tableId,
      handId: b.hI,
      handNumber: b.gN,
      generation,
      cursor: b.now,
      previousCursor: a.now,
      receivedAt: at,
      heroId: hero,
      heroSeat: cycle[heroIndex][0],
      heroCards: heroCards2,
      smallBlind: 1,
      bigBlind: 2,
      players,
      ...a.version === "0.1.72" && b.fV === "0.1.72" && (b.version ?? a.version) === "0.1.72" && same2(b.nR, [1]) && (Object.hasOwn(b, "mTB") ? b.mTB : a.mTB) === null && (Object.hasOwn(b, "rIT") ? b.rIT : a.rIT) === "no" && (Object.hasOwn(b, "sPM") ? b.sPM : a.sPM) === false ? { openingSizeProfile: "pokernow-0.1.72-th-4fun-1-2-exact5-v1" } : {},
      provenance: `PokerNow validated hand-start ${a.hI}/${a.gN} -> ${b.hI}/${b.gN}, pre=${b.pre}, now=${b.now}; first UTG turn has no preceding voluntary turn; forced blinds only. Hand-53 observed source profile; bounded consecutive source state.${role !== "UTG" ? ` Frozen ${role} anchor only; not yet an actionable decision.` : ""}`
    };
  }
  function createFirstUtgSource(tableId, now) {
    let baseline = null;
    let witness = null;
    let facingPending = null;
    let facingProof = null;
    let coFacingProof = null;
    let hjPending = null;
    let hjProof = null;
    let hjReason = "No supported HJ boundary/fold/turn sequence observed.";
    let coPending = null;
    let coProof = null;
    let coReason = "No supported CO boundary/two-fold/turn sequence observed.";
    let btnPending = null;
    let btnProof = null;
    let btnReason = "No supported BTN boundary/three-fold/turn sequence observed.";
    let sbPending = null;
    let sbProof = null;
    let sbReason = "No supported SB boundary/four-fold/turn sequence observed.";
    let lastCertificate = null;
    const invalidateWitness = (reason2, sequence) => {
      witness = null;
      hjProof = null;
      coProof = null;
      btnProof = null;
      sbProof = null;
      facingProof = null;
      coFacingProof = null;
      if (lastCertificate && (!lastCertificate.invalidation || sequence !== null && lastCertificate.invalidation.sequence === sequence && lastCertificate.invalidation.at === now())) {
        lastCertificate.invalidation = { at: now(), sequence, reason: reason2 };
      }
    };
    let lastSequence = -1;
    let lastGeneration = 0;
    let rejectedGeneration = null;
    let lastObservedAt = -1;
    let registrationSeen = false;
    const observations = [];
    let retainedCharacters = 0, droppedObservations = 0;
    let reason = "No bounded first-UTG source projection received.";
    const currentProof = () => {
      if (!witness || !baseline || now() < witness.receivedAt || now() - witness.receivedAt > 1e4 || baseline.generation !== witness.generation || baseline.data.frame.hI !== witness.handId || baseline.data.frame.now !== witness.cursor) return null;
      return {
        version: 1,
        scope: "first_utg_boundary",
        historyComplete: false,
        expiresAt: witness.receivedAt + 1e4,
        continuity: {
          status: "validated_prefix",
          baselineSequence: baseline.baselineSequence,
          throughSequence: baseline.sequence,
          generation: baseline.generation,
          tableId,
          handId: witness.handId,
          cursor: witness.cursor
        },
        witness: structuredClone(witness)
      };
    };
    return {
      accept(raw, sequence, generation, observedAt) {
        const reject = (message) => {
          invalidateWitness(message, integer4(sequence) ? sequence : null);
          facingPending = null;
          hjPending = null;
          hjReason = message;
          coPending = null;
          coReason = message;
          btnPending = null;
          btnReason = message;
          sbPending = null;
          sbReason = message;
          baseline = null;
          rejectedGeneration = lastGeneration;
          reason = message;
        };
        if (!integer4(sequence) || !integer4(generation) || generation < 1) {
          reject("Invalid local source sequence/generation.");
          return;
        }
        if (sequence <= lastSequence || generation < lastGeneration) {
          reject("Stale/replayed local source delivery invalidated carried state.");
          return;
        }
        invalidateWitness("Subsequent source update requires a new certificate; no same-decision renewal contract is verified.", sequence);
        const previous = baseline;
        baseline = null;
        const newGeneration = generation !== lastGeneration;
        if (newGeneration) facingPending = null;
        const contiguous = sequence === lastSequence + 1 && !newGeneration;
        lastSequence = sequence;
        lastGeneration = generation;
        if (newGeneration) {
          hjPending = null;
          coPending = null;
          coReason = "New generation; CO evidence reset.";
          btnPending = null;
          btnReason = "New generation; BTN evidence reset.";
          sbPending = null;
          sbReason = "New generation; SB evidence reset.";
          rejectedGeneration = null;
          lastObservedAt = -1;
          registrationSeen = false;
        }
        if (!integer4(observedAt) || observedAt > now() || observedAt < lastObservedAt) {
          reject("Invalid or regressing local receive time.");
          return;
        }
        lastObservedAt = observedAt;
        const valid2 = object6(raw) && object6(raw.frame) && JSON.stringify(raw).length <= 4e4 && ["registered", "gC", "rup"].includes(raw.event);
        const observation = { sequence, generation, observedAt, projection: valid2 ? structuredClone(raw) : null };
        observations.push(observation);
        retainedCharacters += JSON.stringify(observation).length;
        while (observations.length > 96 || retainedCharacters > 3e5) {
          retainedCharacters -= JSON.stringify(observations.shift()).length;
          droppedObservations++;
        }
        if (!valid2) {
          reject("Missing, malformed or unbound first-UTG source projection; inventory fields cannot replace source values.");
          return;
        }
        const data = raw;
        const receipt = (kind2, frame) => ({ kind: kind2, sequence, generation, tableId, handId: frame.hI, handNumber: frame.gN, now: frame.now, pre: frame.pre });
        if (!registrationSeen && data.event !== "registered") {
          reason = "Discarded pre-registration update; waiting for a validated full registration in this generation.";
          return;
        }
        if (registrationSeen && rejectedGeneration === generation) {
          baseline = null;
          return;
        }
        try {
          if (data.event === "registered" && !registrationSeen) {
            registrationSeen = true;
            if (!token4(data.heroId)) throw new Error("Registration has no validated hero ID.");
            const frame2 = initializeUtgState(data.frame, tableId, data.heroId);
            rejectedGeneration = null;
            baseline = { data: { ...data, frame: frame2 }, generation, sequence, baselineSequence: sequence };
            reason = "Validated registration retained; waiting for a supported fresh first-UTG boundary.";
            return receipt("registration", frame2);
          }
          if (!previous || !contiguous) throw new Error("No valid registered baseline or consecutive local sequence in this generation.");
          if (data.heroId !== previous.data.heroId) throw new Error("Conflicting source hero identity.");
          if (data.event === "rup" && previous.data.event === "registered") {
            const frame2 = initializeUtgState(data.frame, tableId, data.heroId);
            if (!equivalent(frame2, previous.data.frame)) throw new Error("Bootstrap rup differs from the registered projection; no refresh/backfill proof.");
            baseline = { data: { ...data, frame: frame2 }, generation, sequence, baselineSequence: previous.baselineSequence };
            reason = "Equivalent immediate bootstrap rup validated; waiting for linked updates and a fresh hand boundary.";
            return receipt("equivalent_refresh", frame2);
          }
          if (data.event !== "gC") throw new Error("Full rup/registration refresh invalidates carried continuity; no backfill proof.");
          const frame = advanceUtgState(previous.data.frame, data.frame, tableId, data.heroId);
          const anchor = firstUtg(previous.data, data, tableId, generation, observedAt, "HJ");
          const facingAnchor = anchor ?? firstUtg(previous.data, data, tableId, generation, observedAt) ?? firstUtg(previous.data, data, tableId, generation, observedAt, "CO");
          const facingAdvanced = facingPending ? advanceFacingOpenWindow(facingPending, data, previous.data.frame, frame, sequence, observedAt) : null;
          facingPending = facingAnchor ? { witness: facingAnchor, anchor: {
            sequence,
            cursor: facingAnchor.cursor,
            receivedAt: observedAt,
            firstActorId: facingAnchor.players.find((p) => p.position === "UTG").playerId
          } } : facingAdvanced?.pending ?? null;
          facingProof = facingAdvanced?.proof ? {
            ...facingAdvanced.proof,
            continuity: {
              status: "validated_prefix",
              baselineSequence: previous.baselineSequence,
              throughSequence: sequence,
              generation,
              tableId,
              handId: frame.hI,
              cursor: frame.now
            }
          } : null;
          coFacingProof = facingAdvanced?.coProof ? {
            ...facingAdvanced.coProof,
            continuity: {
              status: "validated_prefix",
              baselineSequence: previous.baselineSequence,
              throughSequence: sequence,
              generation,
              tableId,
              handId: frame.hI,
              cursor: frame.now
            }
          } : null;
          if (coFacingProof) facingPending = null;
          const advanced = hjPending ? advanceHjWindow(hjPending, data, sequence, observedAt) : null;
          hjPending = anchor ? { witness: anchor, anchor: {
            sequence,
            cursor: anchor.cursor,
            receivedAt: observedAt,
            firstActorId: anchor.players.find((p) => p.position === "UTG").playerId
          } } : advanced?.pending ?? null;
          hjProof = advanced?.proof ? {
            ...advanced.proof,
            continuity: {
              status: "validated_prefix",
              baselineSequence: previous.baselineSequence,
              throughSequence: sequence,
              generation,
              tableId,
              handId: frame.hI,
              cursor: frame.now
            }
          } : null;
          if (hjProof) hjPending = null;
          hjReason = hjProof ? "Explicit UTG fold and immediately linked HJ first turn proven; live cross-checks still required." : anchor ? "Frozen six-player HJ hand anchor; waiting for the next explicit UTG fold." : advanced ? "Explicit UTG fold accepted; waiting for the immediately linked HJ activation." : "No supported consecutive boundary -> UTG fold -> HJ turn; unsupported updates invalidate this window.";
          const coAnchor = firstUtg(previous.data, data, tableId, generation, observedAt, "CO");
          const coAdvanced = coPending ? advanceCoWindow(coPending, data, sequence, observedAt) : null;
          coPending = coAnchor ? { witness: coAnchor, folds: [], anchor: {
            sequence,
            cursor: coAnchor.cursor,
            receivedAt: observedAt,
            firstActorId: coAnchor.players.find((p) => p.position === "UTG").playerId
          } } : coAdvanced?.pending ?? null;
          coProof = coAdvanced?.proof ? {
            ...coAdvanced.proof,
            continuity: {
              status: "validated_prefix",
              baselineSequence: previous.baselineSequence,
              throughSequence: sequence,
              generation,
              tableId,
              handId: frame.hI,
              cursor: frame.now
            }
          } : null;
          if (coProof) coPending = null;
          coReason = coProof ? "Explicit UTG/HJ folds and linked first CO turn proven; live cross-checks still required." : coAnchor ? "Frozen CO anchor; waiting for explicit UTG fold, HJ turn/fold and CO turn." : coAdvanced ? "Supported CO prefix retained; waiting for the next exact fold/turn transition." : "No consecutive boundary -> UTG fold -> HJ turn -> HJ fold -> CO turn; unsupported updates invalidate this window.";
          const btnAnchor = firstUtg(previous.data, data, tableId, generation, observedAt, "BTN");
          const btnAdvanced = btnPending ? advanceBtnWindow(btnPending, data, sequence, observedAt) : null;
          btnPending = btnAnchor ? { witness: btnAnchor, folds: [], anchor: {
            sequence,
            cursor: btnAnchor.cursor,
            receivedAt: observedAt,
            firstActorId: btnAnchor.players.find((p) => p.position === "UTG").playerId
          } } : btnAdvanced?.pending ?? null;
          btnProof = btnAdvanced?.proof ? {
            ...btnAdvanced.proof,
            continuity: {
              status: "validated_prefix",
              baselineSequence: previous.baselineSequence,
              throughSequence: sequence,
              generation,
              tableId,
              handId: frame.hI,
              cursor: frame.now
            }
          } : null;
          if (btnProof) btnPending = null;
          btnReason = btnProof ? "Explicit UTG/HJ/CO folds and linked first BTN turn proven; live cross-checks still required." : btnAnchor ? "Frozen BTN anchor; waiting for explicit UTG fold, HJ turn/fold, CO turn/fold and BTN turn." : btnAdvanced ? "Supported BTN prefix retained; waiting for the next exact fold/turn transition." : "No consecutive boundary -> UTG fold -> HJ turn -> HJ fold -> CO turn -> CO fold -> BTN turn; unsupported updates invalidate this window.";
          const sbAnchor = firstUtg(previous.data, data, tableId, generation, observedAt, "SB");
          const sbAdvanced = sbPending ? advanceSbWindow(sbPending, data, sequence, observedAt) : null;
          sbPending = sbAnchor ? { witness: sbAnchor, folds: [], anchor: {
            sequence,
            cursor: sbAnchor.cursor,
            receivedAt: observedAt,
            firstActorId: sbAnchor.players.find((p) => p.position === "UTG").playerId
          } } : sbAdvanced?.pending ?? null;
          sbProof = sbAdvanced?.proof ? {
            ...sbAdvanced.proof,
            continuity: {
              status: "validated_prefix",
              baselineSequence: previous.baselineSequence,
              throughSequence: sequence,
              generation,
              tableId,
              handId: frame.hI,
              cursor: frame.now
            }
          } : null;
          if (sbProof) sbPending = null;
          sbReason = sbProof ? "Explicit UTG/HJ/CO/BTN folds and linked first SB turn proven; live cross-checks still required." : sbAnchor ? "Frozen SB anchor; waiting for explicit UTG fold, HJ/CO/BTN turns and folds, then SB turn." : sbAdvanced ? "Supported SB prefix retained; waiting for the next exact fold/turn transition." : "No consecutive boundary -> UTG fold -> HJ turn -> HJ fold -> CO turn -> CO fold -> BTN turn -> BTN fold -> SB turn; unsupported updates invalidate this window.";
          witness = firstUtg(previous.data, data, tableId, generation, observedAt);
          if (witness) lastCertificate = {
            handId: witness.handId,
            generation,
            issuedBySequence: sequence,
            receivedAt: witness.receivedAt,
            expiresAt: witness.receivedAt + 1e4,
            invalidation: null
          };
          baseline = { data: { ...data, frame }, generation, sequence, baselineSequence: previous.baselineSequence };
          reason = witness ? "First-UTG boundary proven from consecutive bounded source state; synchronous DOM and freshness checks still required." : "Validated source state carried forward; this update is not a supported first-UTG boundary.";
        } catch (error) {
          reject(error instanceof Error ? error.message : "Unsupported source mutation.");
        }
      },
      reset() {
        invalidateWitness("Source disconnect, reader gap or reset invalidated first-UTG evidence.", null);
        facingPending = null;
        hjPending = null;
        hjReason = "Source disconnected/reset.";
        coPending = null;
        coReason = "Source disconnected/reset.";
        btnPending = null;
        btnReason = "Source disconnected/reset.";
        sbPending = null;
        sbReason = "Source disconnected/reset.";
        baseline = null;
        rejectedGeneration = lastGeneration;
        reason = "Source disconnect, reader gap or reset invalidated first-UTG evidence.";
      },
      snapshot() {
        return currentProof()?.witness ?? null;
      },
      proof: currentProof,
      facingOpenProof() {
        return facingProof && baseline && now() >= facingProof.witness.receivedAt && now() < facingProof.expiresAt && baseline.generation === facingProof.witness.generation && baseline.data.frame.hI === facingProof.witness.handId && baseline.data.frame.now === facingProof.witness.cursor ? structuredClone(facingProof) : null;
      },
      coFacingOpenProof() {
        return coFacingProof && baseline && now() >= coFacingProof.witness.receivedAt && now() < coFacingProof.expiresAt && baseline.generation === coFacingProof.witness.generation && baseline.data.frame.hI === coFacingProof.witness.handId && baseline.data.frame.now === coFacingProof.witness.cursor ? structuredClone(coFacingProof) : null;
      },
      hjProof() {
        return hjProof && baseline && now() >= hjProof.witness.receivedAt && now() < hjProof.expiresAt && baseline.generation === hjProof.witness.generation && baseline.data.frame.hI === hjProof.witness.handId && baseline.data.frame.now === hjProof.witness.cursor ? structuredClone(hjProof) : null;
      },
      coProof() {
        return coProof && baseline && now() >= coProof.witness.receivedAt && now() < coProof.expiresAt && baseline.generation === coProof.witness.generation && baseline.data.frame.hI === coProof.witness.handId && baseline.data.frame.now === coProof.witness.cursor ? structuredClone(coProof) : null;
      },
      btnProof() {
        return btnProof && baseline && now() >= btnProof.witness.receivedAt && now() < btnProof.expiresAt && baseline.generation === btnProof.witness.generation && baseline.data.frame.hI === btnProof.witness.handId && baseline.data.frame.now === btnProof.witness.cursor ? structuredClone(btnProof) : null;
      },
      sbProof() {
        return sbProof && baseline && now() >= sbProof.witness.receivedAt && now() < sbProof.expiresAt && baseline.generation === sbProof.witness.generation && baseline.data.frame.hI === sbProof.witness.handId && baseline.data.frame.now === sbProof.witness.cursor ? structuredClone(sbProof) : null;
      },
      diagnostic() {
        const currentTime = now();
        const certificate = lastCertificate ? structuredClone(lastCertificate) : null;
        const status = !certificate ? "not_issued" : currentTime < certificate.receivedAt ? "clock_regression" : certificate.invalidation && certificate.invalidation.at <= certificate.expiresAt ? "invalidated" : currentTime > certificate.expiresAt ? "expired" : certificate.invalidation ? "invalidated" : "fresh";
        return {
          scope: "Bounded production projection and validated state reducer. Never proves whole-hand history.",
          coFacingOpenWindow: {
            scope: "Closed hand238 historical prefix; no CO action authorization",
            transitions: structuredClone(coFacingProof?.transitions ?? (facingPending?.call ? [facingPending.transition, facingPending.call] : facingPending?.transition ? [facingPending.transition] : [])),
            hjActivation: structuredClone(coFacingProof?.hjActivation ?? facingPending?.hjActivation ?? null),
            expiresAt: coFacingProof?.expiresAt ?? null
          },
          facingOpenWindow: {
            scope: "Context only; no CALL/FOLD/3-BET authorization",
            reason: facingProof ? now() >= facingProof.expiresAt ? "HJ-facing-open proof expired." : "Accepted UTG open5 then explicit HJ activation; live cross-check required." : facingPending?.call ? "Accepted HJ call5; awaiting the immediately linked CO activation." : facingPending?.hjActivation ? "Historical HJ activation retained; awaiting the immediately next accepted CALL. No advice renewal." : facingPending?.transition ? "Accepted UTG open5; awaiting the immediately linked HJ activation." : facingPending ? "Frozen anchor; awaiting exact hand169 opening transition." : "No supported consecutive boundary -> UTG open5 -> HJ turn.",
            transition: facingPending?.transition ?? facingProof?.transitions[0] ?? null,
            expiresAt: facingProof?.expiresAt ?? null
          },
          freshness: {
            scope: "Latest issued source certificate only; diagnostic history is not actionable proof. Other live gates still apply.",
            status,
            certificate,
            ageMs: certificate ? currentTime - certificate.receivedAt : null,
            remainingMs: certificate && status === "fresh" ? Math.max(0, certificate.expiresAt - currentTime) : 0,
            sameDecisionRenewalSupported: false,
            missingRenewalEvidence: "No verified fresh server decision snapshot/acknowledgment binds this hand, first-action window and actor to a current request or authoritative decision version. Cached state, cursor continuity and receive time are insufficient."
          },
          hjWindow: {
            reason: hjProof && now() >= hjProof.expiresAt ? "HJ proof expired at its original activation deadline." : hjReason,
            anchor: hjPending?.anchor ?? hjProof?.anchor ?? null,
            expiresAt: hjProof?.expiresAt ?? null
          },
          coWindow: {
            reason: coProof && now() >= coProof.expiresAt ? "CO proof expired at its original activation deadline." : coReason,
            anchor: coPending?.anchor ?? coProof?.anchor ?? null,
            expiresAt: coProof?.expiresAt ?? null
          },
          btnWindow: {
            reason: btnProof && now() >= btnProof.expiresAt ? "BTN proof expired at its original activation deadline." : btnReason,
            anchor: btnPending?.anchor ?? btnProof?.anchor ?? null,
            expiresAt: btnProof?.expiresAt ?? null
          },
          sbWindow: {
            reason: sbProof && now() >= sbProof.expiresAt ? "SB proof expired at its original activation deadline." : sbReason,
            anchor: sbPending?.anchor ?? sbProof?.anchor ?? null,
            expiresAt: sbProof?.expiresAt ?? null
          },
          reason: witness && now() - witness.receivedAt > 1e4 ? "First-UTG witness expired after 10 seconds; original receive time is not renewed." : reason,
          observations: structuredClone(observations),
          droppedObservations,
          retainedCharacters,
          carriedState: baseline ? { generation: baseline.generation, sequence: baseline.sequence, projection: structuredClone(baseline.data) } : null,
          limits: { observations: 96, characters: 3e5 },
          historyComplete: false
        };
      }
    };
  }

  // src/liveTimeline.ts
  function createTimelineRuntime(options) {
    const fallback = createSnapshotTimeline(options.sessionId);
    const hands = /* @__PURE__ */ new Map();
    const heroIds = /* @__PURE__ */ new Map();
    const pendingFinal = /* @__PURE__ */ new Set();
    const sourceMetadata = createSourceMetadataAudit();
    const firstUtgSource = createFirstUtgSource(options.tableId, options.now);
    let identity3 = null;
    let current = null;
    let connected = false, busy = false, nextFetch = 0, failures = 0, sequence = -1;
    let status = "Waiting for sanitized hand metadata; refresh the tab after loading the extension.";
    let lastSuccess = null;
    const keyOf = (id) => `${options.tableId}:hand:${id.handId}`;
    return {
      accept(message) {
        if (!message || typeof message !== "object") return;
        const m = message;
        if (m.channel === TIMELINE_CHANNEL && m.type === "source_metadata" && m.tableId === options.tableId) {
          let bootstrap;
          try {
            bootstrap = firstUtgSource.accept(m.utgSource, m.sequence, m.generation, m.observedAt);
          } catch {
            firstUtgSource.reset();
          }
          sourceMetadata.socket(m.metadata, m.sequence, m.generation, options.now(), bootstrap);
          return;
        }
        if (m.channel !== TIMELINE_CHANNEL || m.type !== "identity" || m.tableId !== options.tableId || !Number.isSafeInteger(m.sequence) || Number(m.sequence) <= sequence || typeof m.connected !== "boolean" || m.identity !== null && !validHandIdentity(m.identity, options.tableId)) return;
        sequence = Number(m.sequence);
        connected = m.connected;
        if (!connected || !m.identity) {
          firstUtgSource.reset();
          status = "Source disconnected or no validated hand metadata; no new log requests.";
          if (current) {
            timelineReason(current, "Socket observation gap; reconnect/full-history coverage remains unverified.");
            recordCoverageIssue(current, "metadata_gap", "Socket observation gap; no validated backfill/catch-up certificate. This does not identify missing log actions.", options.now());
          }
          return;
        }
        const next = m.identity;
        if (identity3 && next.handNumber < identity3.handNumber) {
          connected = false;
          status = "Regressing hand metadata rejected; reload/capture required.";
          if (current) recordCoverageIssue(current, "identity_conflict", status, options.now());
          return;
        }
        if (current && identity3 && keyOf(next) === current.handId && next.handNumber !== identity3.handNumber) {
          connected = false;
          status = "Conflicting hand ID/number rejected.";
          timelineReason(current, status);
          recordCoverageIssue(current, "identity_conflict", status, options.now());
          return;
        }
        const retainedHand = hands.get(keyOf(next));
        if (retainedHand && retainedHand.handNumber !== next.handNumber) {
          connected = false;
          status = "Reused retained hand ID with a different hand number rejected.";
          if (current) {
            timelineReason(current, status);
            recordCoverageIssue(current, "identity_conflict", status, options.now());
          }
          return;
        }
        if (!current || current.handId !== keyOf(next)) {
          if (current) pendingFinal.add(current.handId);
          const key = keyOf(next);
          current = hands.get(key) ?? newHandTimeline(key, next.handNumber);
          hands.set(key, current);
          fallback.reset();
          if (identity3 && next.handNumber === identity3.handNumber && next.handId !== identity3.handId) {
            recordCoverageIssue(current, "identity_conflict", "Hand ID changed without a hand-number advance; reset/replacement semantics are unproven. Timelines remain separate.", options.now());
          }
          if (identity3 && next.handNumber > identity3.handNumber + 1) timelineReason(current, "Hand number jumped; intervening hands were not captured.");
          timelineReason(current, "Hand identity reported by page socket; snapshot segment is separate and not proof of hand start.");
          while (hands.size > 4) {
            const oldest = hands.keys().next().value;
            hands.delete(oldest);
            heroIds.delete(oldest);
            pendingFinal.delete(oldest);
          }
        }
        identity3 = next;
        heroIds.set(current.handId, next.heroPlayerId);
        if (next.chainGap) {
          timelineReason(current, "Socket frame predecessor mismatch; metadata is not an ordered action stream.");
          recordCoverageIssue(current, "metadata_gap", "Socket frame predecessor mismatch. It is not a log-row sequence and cannot locate/count missing actions.", options.now());
        }
        status = "Source metadata available; server log coverage remains unverified.";
      },
      observe(read, assessment) {
        fallback.observe(assessment.state, { bigBlind: assessment.bigBlind, dealerSeatNumber: read.context.dealerSeatNumber }, read.context.readErrors, options.now());
      },
      gap(reason) {
        firstUtgSource.reset();
        fallback.observe(null, {}, [reason], options.now());
        if (current) timelineReason(current, reason);
      },
      stop(reason) {
        connected = false;
        firstUtgSource.reset();
        status = reason;
        if (current) timelineReason(current, reason);
      },
      async tick() {
        if (busy || !connected || !current || options.now() < nextFetch) return;
        const finalKey = pendingFinal.values().next().value;
        const target = finalKey ? hands.get(finalKey) : current;
        const heroPlayerId = heroIds.get(target.handId) ?? null;
        if (finalKey) pendingFinal.delete(finalKey);
        busy = true;
        nextFetch = options.now() + 3e3;
        let submittedToIngestion = false;
        try {
          const url = `/api/games/${encodeURIComponent(options.tableId)}/log_v3?hand_number=${target.handNumber}`;
          const response = await options.fetchLog(url, { method: "GET", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(1e4) });
          let metadata = null;
          try {
            metadata = sourceMetadata.response(response.headers, response.status, target.handId, target.handNumber, options.now());
          } catch {
          }
          if (!response.ok) throw new Error(`Log request HTTP ${response.status}`);
          if (Number(response.headers.get("content-length") ?? 0) > 2e6) throw new Error("Log response exceeds capture limit");
          const text2 = await response.text();
          if (text2.length > 2e6) throw new Error("Log response exceeds capture limit");
          if (hands.get(target.handId) !== target) return;
          const payload = JSON.parse(text2);
          try {
            if (metadata) sourceMetadata.payload(metadata, payload);
          } catch {
          }
          submittedToIngestion = true;
          ingestHandLog(target, payload, options.now());
          for (const event of target.events) if (event.actor && heroPlayerId) event.actor.isHero = event.actor.playerId === heroPlayerId;
          lastSuccess = options.now();
          failures = 0;
          status = "Server log received; historyComplete=false pending validated coverage/order contract.";
        } catch (error) {
          failures++;
          nextFetch = options.now() + Math.min(6e4, 3e3 * 2 ** Math.min(failures, 5));
          status = error instanceof Error ? error.message : "Log capture failed";
          if (!submittedToIngestion) recordLogSourceFailure(target, status, options.now());
          timelineReason(target, `Log source failure: ${status}`);
        } finally {
          busy = false;
        }
      },
      snapshot() {
        const firstUtgProof = connected ? firstUtgSource.proof() : null;
        return {
          current: current ?? fallback.current(),
          snapshotFallback: fallback.current(),
          archivedSnapshotSegments: fallback.archived(),
          archivedHands: [...hands.values()].filter((h) => h !== current),
          sourceStatus: {
            status,
            connected,
            busy,
            lastSuccess,
            identity: identity3,
            sourceMetadata: sourceMetadata.snapshot(),
            firstUtgProof,
            hjProof: connected ? firstUtgSource.hjProof() : null,
            coProof: connected ? firstUtgSource.coProof() : null,
            btnProof: connected ? firstUtgSource.btnProof() : null,
            sbProof: connected ? firstUtgSource.sbProof() : null,
            facingOpenProof: connected ? firstUtgSource.facingOpenProof() : null,
            coFacingOpenProof: connected ? firstUtgSource.coFacingOpenProof() : null,
            // Compatibility/display view of the same contract, not another validator.
            firstUtg: firstUtgProof?.witness ?? null,
            firstUtgEvidence: firstUtgSource.diagnostic(),
            historyCoverage: (current ?? fallback.current()).coverage,
            coverageScope: "Diagnostic only. Socket frame cursors, timestamp filters and local presentation sequences cannot certify contiguous log coverage or current-decision catch-up.",
            actorSeatMapping: {
              ...(current ?? fallback.current()).seatMapping,
              scope: "Hand-local Player stacks evidence, matched by player ID only. Actor seats require a later timestamp; ties/earlier actions stay unknown. DOM names are only a manual cross-check. Hero identity comes from the registered current-player ID."
            },
            timestampUnits: "Unknown. sourceTimestampRaw preserves the original JSON value; sourceTimestamp is an exact integer candidate ordering key, not a wall-clock time. Equal keys remain ambiguous.",
            amountUnits: "Log amounts are source-reported; chip/BB and call-versus-total semantics still require cross-checking.",
            snapshotAssociation: "Unverified temporal cross-check; DOM snapshots have no server hand ID.",
            logContractVerified: false,
            settlementComplete: false
          }
        };
      }
    };
  }
  function startLiveTimeline() {
    const tableId = typeof location !== "undefined" ? tableIdFromPath(location.pathname) : null;
    const runtime = createTimelineRuntime({
      tableId: tableId ?? "unavailable",
      sessionId: crypto.randomUUID(),
      now: () => Date.now(),
      fetchLog: (url, init) => fetch(url, init)
    });
    if (tableId && typeof window.addEventListener === "function") {
      window.addEventListener("message", (event) => {
        if (event.source === window && event.origin === location.origin && tableIdFromPath(location.pathname) === tableId) runtime.accept(event.data);
      });
      window.postMessage({ channel: TIMELINE_CHANNEL, type: "ready" }, location.origin);
      window.addEventListener("pagehide", () => runtime.stop("Page hidden/unloaded; source stopped."));
    }
    return { ...runtime, tick: async () => {
      if (!tableId || tableIdFromPath(location.pathname) !== tableId) {
        runtime.stop("Table route changed or unavailable; reload to attach a new source.");
        return;
      }
      await runtime.tick();
    } };
  }

  // src/rawSocketCapture.ts
  var MAX_CHARACTERS = 4 * 1024 * 1024;

  // src/raiseEvidenceCapture.ts
  var RAISE_CAPTURE_KEY = "poker-ai:raise-evidence-capture";
  var CHANNEL = "poker-ai:raise-evidence-diagnostics:v1";
  var LIMITS = { checkpoints: 8, bytes: 128 * 1024 };
  var bytes = (text2) => new TextEncoder().encode(text2).byteLength;
  var enabled = (target) => {
    try {
      return target.sessionStorage.getItem(RAISE_CAPTURE_KEY) === "1";
    } catch {
      return false;
    }
  };
  function raiseSourceObservation(snapshot, at) {
    const s = snapshot.sourceStatus, carried = s.firstUtgEvidence.carriedState;
    const frame = carried?.projection.frame;
    return {
      origin: "isolated-world existing liveTimeline.snapshot; observational copy, not a new proof",
      capturedAt: at,
      connected: s.connected,
      identity: s.identity,
      currentHand: { handId: snapshot.current.handId, handNumber: snapshot.current.handNumber },
      sourceState: carried ? {
        generation: carried.generation,
        localBridgeSequence: carried.sequence,
        // Only present fields are copied: missing differs from explicit null.
        fields: Object.fromEntries(["id", "hI", "gN", "now", "pre", "cPI", "pITT"].filter((k) => Object.hasOwn(frame, k)).map((k) => [k, frame[k]]))
      } : null,
      firstUtgProof: s.firstUtgProof,
      freshness: s.firstUtgEvidence.freshness,
      reason: s.firstUtgEvidence.reason,
      historyComplete: false
    };
  }
  function installRaiseEvidenceResponder(target, snapshot) {
    if (!enabled(target)) return;
    let remainingRequests = 8;
    target.addEventListener("message", (event) => {
      if (!enabled(target) || remainingRequests <= 0 || event.source !== target || event.origin !== target.location.origin || event.data?.channel !== CHANNEL || event.data.type !== "checkpoint_source" || typeof event.data.requestId !== "string" || event.data.requestId.length > 100) return;
      remainingRequests--;
      let source = null, error = null;
      try {
        source = raiseSourceObservation(snapshot(), Date.now());
        if (bytes(JSON.stringify(source)) > 32 * 1024) {
          source = null;
          error = "Source observation exceeds 32KiB; rejected without truncation.";
        }
      } catch {
        error = "Source observation unavailable.";
      }
      target.postMessage({ channel: CHANNEL, type: "checkpoint_source_result", requestId: event.data.requestId, source, error }, target.location.origin);
    });
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
  function escapeHtml(text2) {
    return text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var AI_STATUS_COLORS = {
    idle: "#888888",
    waiting: "#e0a030",
    received: "#4caf50",
    blocked: "#e05050",
    error: "#e05050",
    waiting_for_proof: "#e0a030",
    unsupported: "#888888",
    unsafe: "#e05050",
    evidence_expired: "#999999"
  };
  function renderOverlay() {
    refreshDisplayLifetime();
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
      `<div style="color:${AI_STATUS_COLORS[s.aiStatus]}; font-weight:600;">${escapeHtml(s.aiStatus === "received" ? "RECOMMENDATION AVAILABLE" : s.aiStatus.replaceAll("_", " ").toUpperCase())}</div>`
    );
    if (s.policyLine) parts.push(`<div>${escapeHtml(s.policyLine)}</div>`);
    if (s.aiResult && displayLifetime) parts.push(`<div data-proof-countdown>Evidence expires in ${Math.max(0, (displayLifetime.expiresAt - Date.now()) / 1e3).toFixed(1)}s</div>`);
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
  function openingControlNote(packet) {
    const state = packet.preflopExecution?.exactOpeningSize?.controls;
    return state === "panel_closed_unchecked" ? "; Raise panel closed: controls not checked" : state === "selected_amount_differs" ? "; Selected amount differs: manually set 5 chips before acting" : state === "selected_amount_matches" ? "; Selected total matches 5 chips; manual action only" : "";
  }
  async function requestRecommendation(packet, stateDescription, requestKey) {
    let policy = null;
    let locked = null;
    try {
      policy = evaluateDecisionPolicy(packet);
      locked = lockedEngineRecommendation(policy);
      if (locked && requestKey === lastRecommendationRequestKey) {
        bindDisplayLifetime(requestKey);
        overlayState.aiResult = {
          ...locked,
          action: locked.action === "RAISE" && packet.preflopExecution?.exactOpeningSize ? "RAISE TO 5 CHIPS (2.5 BB)" : locked.action === "RAISE" && policy.raiseToBB !== null ? `RAISE TO ${policy.raiseToBB} BB` : locked.action + (locked.sizingBB === void 0 ? "" : ` ${locked.sizingBB}BB additional`)
        };
        overlayState.aiStatus = "received";
        overlayState.policyLine = `Engine decision (${policy.confidence} confidence); explanation pending` + (locked.action === "RAISE" ? openingControlNote(packet) : "");
        overlayState.aiWarnings = policy.reasons;
        renderOverlay();
      }
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
      const latestFingerprint = JSON.stringify([decisionFingerprint(location.origin + location.pathname, latest.raw, latest.context, latest.raiseControl), liveProofRevision(handTimeline.snapshot())]);
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
      if (locked) {
        if (!response.ok || !data.ok || data.blocked || data.activation?.allowed === false || Array.isArray(data.result)) {
          throw new Error("Explanation unavailable or relay rejected the response");
        }
        const explanation = RecommendationSchema.parse(data.result);
        if (data.decisionSource !== "engine_policy" || explanation.action !== locked.action || explanation.sizingBB !== locked.sizingBB || !validateReasoningConsistency(explanation, packet).isConsistent) {
          throw new Error("Explanation does not match the locked engine action");
        }
        if (overlayState.aiResult) overlayState.aiResult.reasoning = explanation.reasoning;
        overlayState.aiStatus = "received";
        overlayState.policyLine = `Engine decision (${policy.confidence} confidence)` + (locked.action === "RAISE" ? openingControlNote(packet) : "");
        overlayState.aiWarnings = [...policy.reasons, ...data.consistencyWarnings ?? []];
        renderOverlay();
        return;
      }
      overlayState.policyLine = data.policy ? `Decision: ${data.decisionSource}; policy ${data.policy.status} (${data.policy.confidence} confidence)` : null;
      if (data.policy) console.log("[Poker AI Reader] Engine policy evidence:", data.policy);
      if (data.ok && data.result === null && data.blocked) {
        overlayState.aiResult = null;
        overlayState.aiStatus = data.activation?.state === "unsafe" ? "unsafe" : data.activation?.state === "unsupported" ? "unsupported" : "waiting_for_proof";
        overlayState.aiWarnings = data.uncertainty ?? [data.originalReason ?? data.blockedReason];
      } else if (data.ok) {
        if (!response.ok || Array.isArray(data.result)) throw new Error("Invalid live relay response");
        data.result = RecommendationSchema.parse(data.result);
        console.log(`[Poker AI Reader] AI recommendation (for: ${stateDescription}):`, data.result);
        overlayState.aiResult = {
          action: packet.table.street === "preflop" && data.decisionSource === "engine_policy" && data.result.action === "RAISE" && data.policy?.raiseToBB != null ? `RAISE TO ${data.policy.raiseToBB} BB` : data.result.action + (data.result.sizingBB === void 0 ? "" : ` ${data.result.sizingBB}BB${data.decisionSource === "engine_policy" ? " additional" : ""}`) + (data.policy?.raiseToBB == null ? "" : ` (to ${data.policy.raiseToBB}BB)`),
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
        let fresh = false;
        try {
          const latest = readLiveTable();
          const fingerprint = JSON.stringify([decisionFingerprint(location.origin + location.pathname, latest.raw, latest.context, latest.raiseControl), liveProofRevision(handTimeline.snapshot())]);
          fresh = requestKey === decisionRequestKey(requestSequence, fingerprint);
        } catch {
        }
        if (locked && policy && fresh) {
          overlayState.aiStatus = "received";
          overlayState.policyLine = `Engine decision (${policy.confidence} confidence); explanation unavailable` + (locked.action === "RAISE" ? openingControlNote(packet) : "");
          overlayState.aiWarnings = [...policy.reasons, "Relay explanation failed, timed out, or returned an invalid response. Engine action retained."];
          renderOverlay();
          return;
        }
        if (!fresh) lastRecommendationRequestKey = null;
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
  var lastDomStateJson = null;
  var lastRecommendationRequestKey = null;
  var previousGameState = null;
  var actionHistory = emptyActionHistory();
  var currentDiagnosticPacket = null;
  var handTimeline = startLiveTimeline();
  try {
    installRaiseEvidenceResponder(window, () => handTimeline.snapshot());
  } catch {
  }
  var displayLifetime = null;
  var expiryTimer;
  function displaySourceBinding() {
    const revision = JSON.parse(liveProofRevision(handTimeline.snapshot()));
    delete revision.firstUtg;
    delete revision.hj;
    delete revision.co;
    delete revision.btn;
    delete revision.sb;
    return JSON.stringify(revision);
  }
  function clearDisplayLifetime() {
    displayLifetime = null;
    if (expiryTimer !== void 0) window.clearTimeout(expiryTimer);
    expiryTimer = void 0;
  }
  function bindDisplayLifetime(requestKey) {
    clearDisplayLifetime();
    const source = handTimeline.snapshot().sourceStatus;
    const proof = source.firstUtgProof ?? source.hjProof ?? source.coProof ?? source.btnProof ?? source.sbProof;
    if (!proof || lastDomStateJson === null) return;
    displayLifetime = {
      requestKey,
      receivedAt: proof.witness.receivedAt,
      expiresAt: proof.expiresAt,
      dom: lastDomStateJson,
      source: displaySourceBinding()
    };
    expiryTimer = window.setTimeout(refreshFreshnessDisplay, Math.max(0, displayLifetime.expiresAt - Date.now()));
  }
  function refreshDisplayLifetime() {
    if (!displayLifetime) return;
    if (displayLifetime.dom !== lastDomStateJson || displayLifetime.source !== displaySourceBinding() || Date.now() < displayLifetime.receivedAt || Date.now() < displayLifetime.expiresAt && !(handTimeline.snapshot().sourceStatus.firstUtgProof ?? handTimeline.snapshot().sourceStatus.hjProof ?? handTimeline.snapshot().sourceStatus.coProof ?? handTimeline.snapshot().sourceStatus.btnProof ?? handTimeline.snapshot().sourceStatus.sbProof)) {
      clearDisplayLifetime();
      overlayState.aiResult = null;
      overlayState.policyLine = null;
      overlayState.aiStatus = "waiting_for_proof";
      lastRecommendationRequestKey = null;
      return;
    }
    if (Date.now() >= displayLifetime.expiresAt) {
      lastRecommendationRequestKey = null;
      overlayState.aiResult = null;
      overlayState.aiStatus = "evidence_expired";
      overlayState.policyLine = "No current recommendation. Fresh source evidence is required.";
      overlayState.aiWarnings = [];
    }
  }
  function refreshFreshnessDisplay() {
    if (!displayLifetime) return;
    try {
      const read = readLiveTable();
      const dom = decisionFingerprint(location.origin + location.pathname, read.raw, read.context, read.raiseControl);
      if (dom !== displayLifetime.dom) {
        clearDisplayLifetime();
        lastRecommendationRequestKey = null;
        overlayState.aiResult = null;
        overlayState.policyLine = null;
        overlayState.aiStatus = "waiting_for_proof";
      }
    } catch {
      clearDisplayLifetime();
      lastRecommendationRequestKey = null;
      overlayState.aiResult = null;
      overlayState.policyLine = null;
      overlayState.aiStatus = "blocked";
    }
    renderOverlay();
  }
  setInterval(refreshFreshnessDisplay, 250);
  document.addEventListener("visibilitychange", refreshFreshnessDisplay);
  window.addEventListener?.("focus", refreshFreshnessDisplay);
  setInterval(() => {
    try {
      const read = readLiveTable();
      const assessment = assessLiveState(read.raw, read.context);
      handTimeline.observe(read, assessment);
      void handTimeline.tick();
      const domStateJson = decisionFingerprint(location.origin + location.pathname, read.raw, read.context, read.raiseControl);
      const timelineSnapshot = handTimeline.snapshot();
      const stateJson = JSON.stringify([domStateJson, liveProofRevision(timelineSnapshot)]);
      if (stateJson !== lastStateJson) currentDiagnosticPacket = null;
      if (domStateJson !== lastDomStateJson) {
        lastDomStateJson = domStateJson;
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
      const preflop = buildLivePreflopContext(assessment, actionHistory, timelineSnapshot, read);
      logLiveDiagnostics(read, assessment, actionHistory, preflop, currentDiagnosticPacket, handTimeline.snapshot());
      if (stateJson !== lastStateJson) {
        currentDiagnosticPacket = null;
        lastStateJson = stateJson;
        lastRecommendationRequestKey = null;
        requestSequence++;
        const { state, confidence, bigBlind, amountToCall: parsedAmountToCall, positions: positions2, decisionPot } = assessment;
        const amountToCall = (preflop?.openingEvidence === "first_utg_hand_start" || preflop?.openingEvidence === "hj_after_utg_fold" || preflop?.openingEvidence === "co_after_utg_hj_folds" || preflop?.openingEvidence === "btn_after_utg_hj_co_folds" || preflop?.openingEvidence === "sb_after_utg_hj_co_btn_folds") && bigBlind !== null ? preflop.amountToCallBB * bigBlind : parsedAmountToCall;
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
        if (!state) {
          const failed = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence));
          overlayState.aiStatus = failed.activation.state === "unsafe" ? "unsafe" : "waiting_for_proof";
          overlayState.policyLine = activationLabel(failed.activation.state);
          overlayState.aiWarnings = [...failed.activation.reasons, ...confidence.reasons];
          renderOverlay();
          return;
        }
        const hero = state.seats.find((s) => s.isYou);
        const heroPosition = hero ? positions2.get(hero.seatNumber) : void 0;
        if (preflop) {
          overlayState.preflopLine = "Preflop: " + preflop.situation + (preflop.decisionSupport === "uncertain" ? " - insufficient strategic model / uncertain" : "");
          overlayState.aiWarnings = [...confidence.reasons, ...preflop.reasons];
          renderOverlay();
        }
        const scoped = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence));
        overlayState.aiStatus = scoped.activation.state === "proof_ready" ? "idle" : scoped.activation.state;
        overlayState.policyLine = activationLabel(scoped.activation.state) + " (" + scoped.activation.supportedDecisionType + ")";
        overlayState.aiWarnings = [.../* @__PURE__ */ new Set([...scoped.activation.reasons, ...state.street === "preflop" ? [] : confidence.reasons])];
        renderOverlay();
        if (scoped.activation.state === "unsafe" || scoped.activation.state === "unsupported" || scoped.activation.failedProofs.some((scope) => !["rangeInput", "equity", "terminal"].includes(scope))) return;
        if (!hero || hero.stack === null || bigBlind === null || amountToCall === null || heroPosition === void 0) return;
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
            table: { potBB: decisionPot === null ? null : decisionPot / bigBlind, board: [], street: "preflop", numOpponentsRemaining: preflop.activeOpponents },
            facingAction: { type: facing, ...amountToCall > 0 ? { amountBB: amountToCall / bigBlind } : {} },
            candidateActions: deriveCandidateActions(facing),
            engineCalculations: {},
            dataConfidence: confidence.level,
            preflop,
            preflopExecution: buildLivePreflopExecution(read, assessment, liveProofRevision(timelineSnapshot), scoped.openingSize ?? void 0),
            potEvidence: { ...assessment.pot, bigBlind },
            opponentContext: { opponents: state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded).map((s) => ({ seat: s.seatNumber, position: positions2.get(s.seatNumber) ?? null, rangeBasis: "Preflop context remains uncertain", rangeConfidence: "low", rangeStatus: "prior_only", ...opponentStats.profile(s.playerName) ?? {} })) }
          };
          packet.decisionProofs = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence), packet).evidence;
          const policy = evaluateDecisionPolicy(packet);
          currentDiagnosticPacket = packet;
          overlayState.preflopLine = "Preflop: " + preflop.situation;
          if (policy.status !== "selected" || !policy.activation?.allowed) {
            overlayState.aiStatus = policy.activation?.state === "unsafe" ? "unsafe" : policy.activation?.state === "unsupported" ? "unsupported" : "waiting_for_proof";
            overlayState.aiWarnings = policy.reasons;
          } else if (hero.isCurrentToAct && hero.holeCards.length === 2) {
            const requestKey = decisionRequestKey(requestSequence, stateJson);
            lastRecommendationRequestKey = requestKey;
            overlayState.aiStatus = "waiting";
            overlayState.policyLine = null;
            currentDiagnosticPacket = packet;
            logLiveDiagnostics(read, assessment, actionHistory, preflop, packet, handTimeline.snapshot());
            requestRecommendation(packet, "structured preflop", requestKey);
          }
          renderOverlay();
          return;
        }
        if (confidence.level === "low" || decisionPot === null || !assessment.pot.isPotSemanticsVerified || assessment.pot.decisionPotSource === null) return;
        if (hero && hero.holeCards.length === 2) {
          const numOpponents = state.seats.filter(
            (s) => s.isOccupied && !s.isYou && !s.isFolded
          ).length;
          if (numOpponents >= 1) {
            const opponents = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded);
            const estimates = opponents.map((opponent) => {
              const records = actionHistory.records.get(opponent.seatNumber) ?? [];
              return estimateOpponentRange({
                position: positions2.get(opponent.seatNumber) ?? null,
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
                position: positions2.get(opponents[i].seatNumber) ?? null,
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
                packet.decisionProofs = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence), packet).evidence;
                currentDiagnosticPacket = packet;
                logLiveDiagnostics(read, assessment, actionHistory, preflop, packet, handTimeline.snapshot());
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
      handTimeline.gap("Live polling failed; snapshot continuity lost.");
      requestSequence++;
      lastRecommendationRequestKey = null;
      lastStateJson = null;
      lastDomStateJson = null;
      previousGameState = null;
      actionHistory = emptyActionHistory();
      currentDiagnosticPacket = null;
      overlayState.aiResult = null;
      overlayState.aiStatus = "blocked";
      clearDisplayLifetime();
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
