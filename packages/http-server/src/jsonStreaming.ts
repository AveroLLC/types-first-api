import { from, Observable, Subject } from 'rxjs';
import * as stream from 'stream';

export function parseStreamingJson<T>(inputStream: NodeJS.ReadableStream): Observable<T> {
  const data$ = new Subject<T>();

  let buffer = '';
  let i = 0;
  let startIndex = 0;
  let isEscape = false;
  let insideObject = false;
  let insideString = false;
  let nestingCounter = 0;

  function tryParse() {
    while (i < buffer.length) {
      const char = buffer[i];
      i++;
      if (isEscape) {
        isEscape = false;
        continue;
      }
      if (char === '\\') {
        isEscape = true;
        continue;
      }
      if (char === '"') {
        insideString = !insideString;
        continue;
      }
      if (insideString) {
        continue;
      }
      if (char === '{') {
        nestingCounter++;
        if (nestingCounter === 1) {
          startIndex = i;
          insideObject = true;
        }
      }
      if (char === '}') {
        nestingCounter--;
        if (nestingCounter === 0) {
          insideObject = false;
          const objectString = buffer.slice(startIndex - 1, i);
          try {
            const value = JSON.parse(objectString);
            data$.next(value);
          } catch (err) {
            throwUnparsable(objectString);
          }
          buffer = buffer.slice(i);
          i = 0;
        }
      }
    }
  }

  function throwUnparsable(str: string) {
    data$.error(new Error(`Received unparsable json string: ${str}`));
  }

  inputStream.on('data', chunk => {
    buffer += chunk;
    tryParse();
  });

  inputStream.on('error', err => {
    //TODO: structured error?
    data$.error(err);
  });
  inputStream.on('end', () => {
    if (insideObject) {
      throwUnparsable(buffer);
    }
    data$.complete();
  });

  return from(data$);
}

export function writeStreamingJson<T>(data$: Observable<T>): NodeJS.ReadableStream {
  const outputStream = new stream.PassThrough();

  data$.subscribe(
    data => {
      outputStream.write(JSON.stringify(data));
    },
    err => {
      outputStream.emit('error', err);
    },
    () => {
      outputStream.end();
    }
  );

  return outputStream;
}
