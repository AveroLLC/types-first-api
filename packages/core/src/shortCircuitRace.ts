import { Observable, Subscription } from 'rxjs';

export function shortCircuitRace(...observables: Observable<any>[]) {
  return new Observable(subscriber => {
    const subscriptions: Subscription[] = [];
    let hasFirst = false;

    function clearSubscriptionsExcept(except: number) {
      hasFirst = true;
      subscriptions.forEach((sub, i) => {
        if (i === except) {
          return;
        }
        sub.unsubscribe();
      });
    }

    observables.forEach((obs, i) => {
      if (hasFirst) {
        return;
      }
      const sub = obs.subscribe(
        val => {
          clearSubscriptionsExcept(i);
          subscriber.next(val);
        },
        err => {
          clearSubscriptionsExcept(i);
          subscriber.error(err);
        },
        () => {
          clearSubscriptionsExcept(i);
          subscriber.complete();
        }
      );
      subscriber.add(sub);
      subscriptions[i] = sub;
    });
  });
}
