/// <reference types="vite/client" />

/**
 * Static asset module declarations.
 *
 * Vite bundles these imports at build time, but TypeScript still needs the
 * module shape declared, otherwise `tsc` fails with TS2307.
 */
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
