import { createError, IError, StatusCodes } from './errors';

const DEFAULT_ERROR: IError = {
  code: StatusCodes.BadRequest,
  message: 'Bad Request',
  forwardedFor: [],
};

describe('errors', () => {
  describe('with null', () => {
    it('should fall back to the default error', () => {
      const error = createError(null, DEFAULT_ERROR);
      expect(error.code).toEqual(DEFAULT_ERROR.code);
      expect(error.message).toEqual(DEFAULT_ERROR.message);
    });

    it('should create a stack trace', () => {
      const error = createError(null, DEFAULT_ERROR);
      expect(error.stackTrace).toBeDefined;
    });

    it('should initialize forwardedFor to an empty array', () => {
      const error = createError(null, DEFAULT_ERROR);
      expect(error.forwardedFor).toEqual([]);
    });
  });

  describe('with non-standard objects', () => {
    it('should fall back to the default error', () => {
      const error = createError({}, DEFAULT_ERROR);
      expect(error.code).toEqual(DEFAULT_ERROR.code);
      expect(error.message).toEqual(DEFAULT_ERROR.message);
    });

    it('should create a stack trace', () => {
      const error = createError({}, DEFAULT_ERROR);
      expect(error.stackTrace).toBeDefined;
    });

    it('should initialize forwardedFor to an empty array', () => {
      const error = createError({}, DEFAULT_ERROR);
      expect(error.forwardedFor).toEqual([]);
    });

    it('should include the source error', () => {
      const error = createError({}, DEFAULT_ERROR);
      expect(error.details).toEqual('source error: {}');
    });
  });

  describe('with native errors', () => {
    it('should fall back to the default error code', () => {
      const error = createError(new Error('Uh oh!'), DEFAULT_ERROR);
      expect(error.code).toEqual(DEFAULT_ERROR.code);
    });

    it('should use the native error message and stack trace', () => {
      const err = new Error('Uh oh!');
      const error = createError(err, DEFAULT_ERROR);
      expect(error.message).toEqual('Uh oh!');
      expect(error.stackTrace).toEqual(err.stack);
    });
  });

  describe('with IErrors', () => {
    it('should pass through the input error', () => {
      const error = createError(null, DEFAULT_ERROR);
      expect(createError(error, DEFAULT_ERROR)).toBe(error);
    });
  });
});
