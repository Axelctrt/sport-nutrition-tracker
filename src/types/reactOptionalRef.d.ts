import 'react';

declare module 'react' {
  function useRef<T = undefined>(): { current: T | undefined };
}
