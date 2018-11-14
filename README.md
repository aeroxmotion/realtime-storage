# Realtime Storage

  Persist your JS objects in the [`Web Storage`](https://html.spec.whatwg.org/multipage/webstorage.html).

## Usage

```js
import rs from 'realtime-storage'

const person = rs('person', {
  name: 'John',
  age: 30,
  sports: ['soccer']
})

/**
 * LocalStorage:
 *
 * KEY     |  VALUE (stringified version)
 * person  | '{ "name": "John", "age": 30, "sports": ["soccer"] }'
 */

person.name = 'Joe' // Updated storage: { "name": "John", ... }
person.sports.push('basketball') // Updated storage: { "sports": ["soccer", "basketball"], ... }

delete person.age

// Remove entry from LocalStorage
rs.remove(person)
```

## API Reference

<details>
  <summary>
    <strong>rs(name | options[, entry])</strong>
  </summary>
  <br>

  Creates a new *realtime entry* to deal with

  **Arguments:** TODO
  **Returns:** TODO
</details>

<details>
  <summary>
    <strong>rs.session(name[, entry])</strong>
  </summary>
  <br>

  TODO

  **Arguments:** TODO
  **Returns:** TODO
</details>

<details>
  <summary>
    <strong>rs.remove(entry)</strong>
  </summary>
  <br>

  Remove *realtime entry* from `WebStorage`

  **Arguments:** TODO
  **Returns:** TODO
</details>
