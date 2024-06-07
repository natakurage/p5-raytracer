abstract class Vector {
  protected _e: number[]

  constructor(e: number[]) {
    this._e = e
  }

  copy = () => {
    const clone = Object.create(Object.getPrototypeOf(this))
    Object.assign(clone, this)
    return clone as this;
  }

  newVector = (e: number[]) => {
    const clone = this.copy()
    clone._e = e
    return clone
  }

  binOp = (o: this | number, f: (a: number, b: number) => number) => {
    const e: number[] = []
    for (let i = 0; i < this._e.length; i++) {
      if (typeof o === "number") {
        e[i] = f(this._e[i], o)
      } else {
        if (this._e.length !== o._e.length) {
          throw Error("vector dimensions must be same")
        }
        e[i] = f(this._e[i], o._e[i])
      }
    }
    return this.newVector(e)
  }

  add = (o: this | number) => {
    return this.binOp(o, (a, b) => a + b)
  }
  
  sub = (o: this | number) => {
    return this.binOp(o, (a, b) => a - b)
  }

  mult = (o: this | number) => {
    return this.binOp(o, (a, b) => a * b)
  }

  div = (o: this | number) => {
    return this.binOp(o, (a, b) => a / b)
  }

  magSq = () => {
    return this._e.map(el => el**2).reduce((a, b) => a + b, 0)
  }

  mag = () => {
    return this.magSq() ** (1/2)
  }

  normalized = () => {
    return this.div(this.mag())
  }

  dot = (vec: this) => {
    if (this._e.length !== vec._e.length) {
      throw Error("vector dimensions must be same")
    }
    return this.mult(vec)._e.reduce((a, b) => a + b, 0)
  }
}

class Vector2 extends Vector {
  constructor(x: number, y: number) {
    super([x, y])
  }

  get x(): number {
    return this._e[0]
  }

  get y(): number {
    return this._e[1]
  }
}

class Vector3 extends Vector {
  constructor(x: number, y: number, z: number) {
    super([x, y, z])
  }

  get x(): number {
    return this._e[0]
  }

  get y(): number {
    return this._e[1]
  }

  get z(): number {
    return this._e[2]
  }

  cross = (vec: Vector3) => {
    return new Vector3(
      this.y * vec.z - this.z * vec.y,
      this.z * vec.x - this.x * vec.z,
      this.x * vec.y - this.y * vec.x
    )
  }
}

export { Vector, Vector2, Vector3 }
