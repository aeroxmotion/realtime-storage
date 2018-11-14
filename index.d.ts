interface Options<T> {
  name: string
  sync: boolean
  storage: string
  preserve: boolean
  serializer: (entryObject: T) => string
  deserializer: (entryString: string) => T
}

declare function rs<T>(name: string, entry: T): Proxy<T>
declare function rs<T>(options: Options<T>, entry: T): Proxy<T>

declare namespace rs {
  function session<T>(name: string, entry: T): Proxy<T>
  function remove<T>(entry: T): void
}

export default rs
