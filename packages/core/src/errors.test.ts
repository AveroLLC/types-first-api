import { createError, StatusCodes, IError } from './errors';

const DEFAULT_ERROR: IError = {
  code: StatusCodes.BadRequest,
  message: 'Bad Request',
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

    it('should not provide a source', () => {
      const error = createError(null, DEFAULT_ERROR);
      expect(error.source).toBeUndefined;
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

    it('should not provide a source', () => {
      const error = createError({}, DEFAULT_ERROR);
      expect(error.source).toBeUndefined;
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
