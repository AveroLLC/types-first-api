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

export class Context {
  private data: Record<string, any> = {};
  public metadata: Metadata = {};
  private deadline: NodeJS.Timer;
  private _cancel$ = new Subject();
  private _cancelSource$: Observable<any>;

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

  static create = (opts?: ContextOpts) => {
    return new Context(opts);
  };

  static from = (parent: Context): Context => {
    const child = new Context({ cancel$: parent.cancel$ });

    _.each(parent.get(), (v, k) => {
      child.set(k, v);
    });

    return child;
  };

  set = (k: string, v: any) => {
    this.data[k] = v;
  };

  get(): Record<string, any>;
  get(k: string): any;
  get(k?: string) {
    return k == null ? this.data : this.data[k];
  }

  cancel = () => {
    clearTimeout(this.deadline);
    this._cancel$.complete();
  };
}
