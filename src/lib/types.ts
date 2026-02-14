// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Tag {
  declare const OpaqueTagSymbol: unique symbol;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  declare class OpaqueTag<S extends string> {
    private [OpaqueTagSymbol]: S;
  }
  export type OpaqueType<T, S extends string> = T & OpaqueTag<S>;
}

export type Opaque<T, S extends string> = Tag.OpaqueType<T, S>;
