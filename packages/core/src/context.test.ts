import { Observable, Subject, race, interval, NEVER } from 'rxjs';
import { Context } from './context';
import { take, tap, mapTo } from 'rxjs/operators';

const later = () => new Date(Date.now() + 100);

function isPending(p: Promise<any>): Promise<boolean> {
  let uniq = Symbol();

  return Promise.race([p, Promise.resolve(uniq)]).then(v => {
    return v === uniq;
  });
}

describe('context', () => {
  let context: Context;
  beforeEach(() => {
    context = Context.create();
  });

  describe('metadata', () => {
    it('should have a metadata object that defaults to {}', () => {
      expect(context.metadata).toEqual({});
    });

    it('should allow you to set metadata at time of construction', () => {
      const md = {
        hello: 'world',
        what: 'is up',
      };

      context = Context.create({ metadata: md });
      expect(context.metadata).toEqual(md);
    });

    it('should make a copy of the metdata', () => {
      const md = {
        hello: 'world',
        what: 'is up',
      };

      context = Context.create({ metadata: md });

      md.hello = 'hiii';
      expect(context.metadata.hello).toEqual('world');
    });

    it('should allow manipulation of context metadata', () => {
      const md = {
        hello: 'world',
        what: 'is up',
      };

      context = Context.create({ metadata: md });

      context.metadata.hello = 'hiii';
      expect(context.metadata.hello).toEqual('hiii');
    });
  });

  describe('set & get', () => {
    it('default values to undefined', () => {
      expect(context.get('date')).toBeUndefined();
    });

    it('will return te entire data map', () => {
      expect(context.get()).toEqual({});
    });

    it('allows you to set values', () => {
      const d = new Date();
      context.set('date', d);

      expect(context.get('date')).toBe(d);
    });

    it('reflects set values in the map', () => {
      const d = new Date();
      const u = {
        name: 'Mark',
        id: 'asdf',
      };
      context.set('date', d);
      context.set('user', u);

      expect(context.get()).toEqual({
        date: d,
        user: u,
      });
    });
  });

  describe('cancel', () => {
    it('should provide a cancel$ observable', () => {
      expect(context.cancel$).toBeInstanceOf(Observable);
    });

    it('should not consider the cancel$ observable complete if context has not been cancelled', () => {
      expect(isPending(context.cancel$.toPromise())).resolves.toEqual(true);
    });

    it('should emit & close when cancelled', () => {
      context.cancel();

      return context.cancel$.toPromise();
    });

    it('should not throw if cancelled multiple times', () => {
      context = Context.create();

      context.cancel();
      context.cancel();

      return context.cancel$.toPromise();
    });

    it('should should not propagate cancellation upstream', () => {
      const c2 = Context.from(context);

      let isComplete = false;
      context.cancel$.toPromise().then(() => {
        isComplete = true;
      });

      c2.cancel();

      return new Promise((resolve, reject) => {
        expect(isComplete).toBe(false);
        resolve();
      });
    });
  });

  describe('deadline', () => {
    it('should allow a scheduled cancellation with a deadline', () => {
      context = Context.create({ deadline: later() });

      return context.cancel$.toPromise();
    });
  });

  describe('chaining', () => {
    it('should not propagate metadata', () => {
      const c1 = Context.create({
        metadata: { hello: 'world' },
      });
      const c2 = Context.from(c1);

      expect(c2.metadata).toEqual({});
    });

    it('should propagate data', () => {
      const c1 = Context.create();
      c1.set('hello', 'world');
      const c2 = Context.from(c1);

      expect(c2.get('hello')).toEqual('world');
    });

    it('should propagate cancellation from upstream contexts', () => {
      const c1 = Context.create();
      const c2 = Context.from(c1);

      c1.cancel();

      return c2.cancel$.toPromise();
    });

    it('should not propagate cancellation from downstream contexts', () => {
      const c1 = Context.create();
      const c2 = Context.from(c1);

      c2.cancel();

      return expect(isPending(c1.cancel$.toPromise())).resolves.toEqual(true);
    });

    it('should propagate deadlines', () => {
      const c1 = Context.create({
        deadline: later(),
      });

      const c2 = Context.from(c1);

      return c2.cancel$.toPromise();
    });
  });
});
