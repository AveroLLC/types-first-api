import { delay } from 'rxjs/operators';
import { of, Subject, race, Observable } from 'rxjs';
import { Context } from './context';

interface MyContext {
  date: Date;
  user: {
    name: string;
    id: string;
  };
}

describe('context', () => {
  let context: Context<MyContext>;
  beforeEach(() => {
    context = Context.create<MyContext>();
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
      expect(context.metadata).toBe(md);
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

    it('should emit & close when cancelled', () => {
      context.cancel();

      return context.cancel$.toPromise();
    });

    it('should allow a context to receive a cancellation observable and respect it', () => {
      const cancel = new Subject();
      context = Context.create<MyContext>({ cancel$: cancel });

      cancel.complete();

      return context.cancel$.toPromise();
    });

    it('should still cancel if called directly', () => {
      const cancel = new Subject();
      context = Context.create<MyContext>({ cancel$: cancel });

      context.cancel();

      return context.cancel$.toPromise();
    });

    it('should not throw if cancelled multiple times', () => {
      const cancel = new Subject();
      context = Context.create<MyContext>({ cancel$: cancel });

      context.cancel();
      cancel.complete();
      context.cancel();

      return context.cancel$.toPromise();
    });

    it('should propagate cancelation downstream from chained contexts', () => {
      const c2 = Context.from(context);
      const c3 = Context.from(c2);

      context.cancel();

      return Promise.all([
        context.cancel$.toPromise(),
        c2.cancel$.toPromise(),
        c3.cancel$.toPromise(),
      ]);
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
    const later = () => new Date(Date.now() + 100);
    it('should allow a scheduled cancellation with a deadline', () => {
      context = Context.create<MyContext>({ deadline: later() });

      return context.cancel$.toPromise();
    });
  });
});
