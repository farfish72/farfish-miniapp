export {};

declare global {
  interface Window {
    ethereum?: any;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
