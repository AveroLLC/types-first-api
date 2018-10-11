import { toArray, delay, delayWhen, mergeMap, tap } from 'rxjs/operators';
import {
  Observable,
  Subject,
  of,
  EMPTY,
  throwError,
  from,
  BehaviorSubject,
  race,
  defer,
} from 'rxjs';
import { shortCircuitRace } from './shortCircuitRace';

describe('shortCircuitRace', () => {
  it('should return an observable', () => {
    const o = shortCircuitRace();
    expect(o).toBeInstanceOf(Observable);
  });

  it('should mirror the first observable to emit a value', () => {
    const i1 = from([1, 2]).pipe(mergeMap((v, i) => of(v).pipe(delay((i + 1) * 150))));
    const i2 = from([3, 4]).pipe(mergeMap((v, i) => of(v).pipe(delay((i + 1) * 100))));
    const o = shortCircuitRace(i1, i2);

    return expect(o.pipe(toArray()).toPromise()).resolves.toEqual([3, 4]);
  });

  it('should mirror the first observable to throw an error', () => {
    const i1 = from([1, 2]).pipe(mergeMap((v, i) => of(v).pipe(delay((i + 1) * 150))));
    const i2 = throwError('UH OH!').pipe(delay(100));
    const o = shortCircuitRace(i1, i2);

    return expect(o.pipe(toArray()).toPromise()).rejects.toEqual('UH OH!');
  });

  it('should mirror the first observable to complete', () => {
    const i1 = from([1, 2]).pipe(mergeMap((v, i) => of(v).pipe(delay((i + 1) * 1500))));
    const i2 = EMPTY.pipe(delay(100));
    const o = shortCircuitRace(i1, i2);

    return expect(o.pipe(toArray()).toPromise()).resolves.toEqual([]);
  });

  it('should never subscribe to subsequent observables if an input has already emitted', async () => {
    let isSubscribed = false;
    const i1 = of(1);
    const i2 = defer(() => {
      isSubscribed = true;
      return of(2);
    });
    const o = race(i1, i2);

    await expect(o.toPromise()).resolves.toEqual(1);
    expect(isSubscribed).toEqual(false);
  });

  it('should never subscribe to subsequent observables if an input is complete', async () => {
    let isSubscribed = false;
    const i1 = EMPTY;
    const i2 = defer(() => {
      isSubscribed = true;
      return of(2);
    });
    const o = shortCircuitRace(i1, i2);

    await expect(o.toPromise()).resolves.toEqual(undefined);
    expect(isSubscribed).toEqual(false);
  });

  it('should never subscribe to subsequent observables if an input has thrown', async () => {
    let isSubscribed = false;
    const i1 = throwError('uh oh');
    const i2 = defer(() => {
      isSubscribed = true;
      return of(2);
    });
    const o = shortCircuitRace(i1, i2);

    await expect(o.toPromise()).rejects.toEqual('uh oh');
    expect(isSubscribed).toEqual(false);
  });

  it('should clean up other subscriptions once a racer has emitted', async () => {
    let tearDownHappened = false;
    const i1 = of(1).pipe(delay(100));
    const i2 = new Observable(subscriber => {
      subscriber.add(() => {
        tearDownHappened = true;
      });
    });
    const o = shortCircuitRace(i1, i2);

    expect(tearDownHappened).toEqual(false);
    await expect(o.toPromise()).resolves.toEqual(1);

    expect(tearDownHappened).toEqual(true);
  });

  it.only('should work when called more than once', async () => {
    const i1 = from([1, 2]).pipe(mergeMap((v, i) => of(v).pipe(delay((i + 1) * 150))));
    const i2 = from([3, 4]).pipe(mergeMap((v, i) => of(v).pipe(delay((i + 1) * 100))));
    const o = shortCircuitRace(i1, i2);

    await expect(o.pipe(toArray()).toPromise()).resolves.toEqual([3, 4]);
    await expect(o.pipe(toArray()).toPromise()).resolves.toEqual([3, 4]);
  });
});
