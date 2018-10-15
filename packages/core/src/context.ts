import * as _ from 'lodash';
import { NEVER, Observable, race, Subject } from 'rxjs';
import { IError, StatusCodes } from './errors';
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

const CANCELLATION_ERROR: IError = {
  code: StatusCodes.Cancelled,
  message: 'Request cancelled by the client.',
  forwardedFor: [],
};

export class Context {
  private data: Record<string, any> = {};
  public metadata: Metadata = {};
  deadline: Date;
  private timer: NodeJS.Timer;
  private _cancel$ = new Subject();
  private _parentCancel$: Observable<{}> = NEVER;

  get cancel$() {
    return race(this._cancel$, this._parentCancel$);
  }

  private constructor(opts?: ContextOpts) {
    if (opts && opts.deadline) {
      this.deadline = opts.deadline;
      const dt = opts.deadline.getTime() - Date.now();
      const deadlineError: IError = {
        code: StatusCodes.Deadline,
        message: `Request exceeded deadline ${this.deadline.toISOString()}.`,
        forwardedFor: [],
      };
      if (dt > 0) {
        this.timer = setTimeout(() => {
          this.cancel(deadlineError);
        }, dt);
      } else {
        this.cancel(deadlineError);
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

  cancel = (err?: Partial<IError>) => {
    clearTimeout(this.timer);
    const error = { ...CANCELLATION_ERROR, ...err };
    this._cancel$.error(error);
  };
}
