declare module "*" {
  interface QueryOption<T> {
    processing: (data: any, option: number) => any;
  }
}
