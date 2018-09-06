import { Subject, race, Observable } from 'rxjs';
import * as _ from 'lodash';
import { Metadata } from './interfaces';

export interface ContextOpts {
  metadata?: Metadata;
  deadline?: Date;
  cancel$?: Observable<any>;
}

/*
Context is a container for propagating:
- Cancelation
- Deadlines
- Errors?
*/

export class Context<TContext extends Record<string, any> = {}> {
  private data: TContext = {} as TContext;
  private deadline: NodeJS.Timer;
  private _cancel$ = new Subject();
  private _cancelSource$: Observable<any>;
  public metadata: Metadata = {};

  get cancel$() {
    return race(this._cancel$, this._cancelSource$);
  }

  private constructor(opts?: ContextOpts) {
    if (opts && opts.deadline) {
      const dt = opts.deadline.getTime() - Date.now();
      if (dt > 0) {
        this.deadline = setTimeout(this.cancel, dt);
      }
    }

    if (opts && opts.cancel$) {
      this._cancelSource$ = opts.cancel$;
    }

    if (opts && opts.metadata) {
      this.metadata = opts.metadata;
    }
  }

  static create = <TContext>(opts?: ContextOpts) => {
    return new Context<TContext>(opts);
  };

  static from = <T extends Record<string, any>>(parent: Context<T>): Context<T> => {
    const child = new Context<T>({ cancel$: parent.cancel$ });

    _.each(parent.get(), (v, k) => {
      child.set(k, v);
    });

    return child;
  };

  set = <K extends keyof TContext>(k: K, v: TContext[K]) => {
    this.data[k] = v;
  };

  get(): TContext;
  get<K extends keyof TContext>(k: K): TContext[K];
  get(k?: keyof TContext) {
    return k == null ? this.data : this.data[k];
  }

  cancel = () => {
    clearTimeout(this.deadline);
    this._cancel$.complete();
  };
}
