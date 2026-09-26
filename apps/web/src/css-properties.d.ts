import 'react';

declare module 'react' {
  interface CSSProperties {
    /** Item order for the `.animate-rise` entry cascade. */
    '--i'?: number;
  }
}
