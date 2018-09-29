import { Subject, race, Observable } from 'rxjs';
import * as _ from 'lodash';
import { Metadata } from './interfaces';

export interface ContextOpts {
  metadata?: Metadata;
  deadline?: Date;
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
  deadline: Date;
  private timer: NodeJS.Timer;
  private _cancel$ = new Subject();
  private _parentCancel$: Observable<{}>;

  get cancel$() {
    return race(this._cancel$, this._parentCancel$);
  }

  private constructor(opts?: ContextOpts) {
    if (opts && opts.deadline) {
      this.deadline = opts.deadline;
      const dt = opts.deadline.getTime() - Date.now();
      if (dt > 0) {
        this.timer = setTimeout(this.cancel, dt);
      }
    }

    if (opts && opts.metadata) {
      this.metadata = _.cloneDeep(opts.metadata);
    }
  }

  static create = (opts?: ContextOpts) => {
    return new Context(opts);
  };

  // TODO: chain data, deadline & cancelation
  static from = (parent: Context): Context => {
    const child = new Context({ deadline: parent.deadline });

    child._parentCancel$ = parent.cancel$;

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
    clearTimeout(this.timer);
    this._cancel$.complete();
  };
}
