import p5Types from 'p5'

class Ray {
  origin: p5Types.Vector
  direction: p5Types.Vector
  constructor(origin: p5Types.Vector, direction: p5Types.Vector) {
    this.origin = origin
    this.direction = direction
  }

  at = (t: number) => {
    return this.origin.copy().add(this.direction.copy().mult(t))
  }
}

export { Ray }