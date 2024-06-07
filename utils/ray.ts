import { Vector3 } from './vector'

class Ray {
  origin: Vector3
  direction: Vector3
  constructor(origin: Vector3, direction: Vector3) {
    this.origin = origin
    this.direction = direction
  }

  at (t: number) {
    return this.origin.add(this.direction.mult(t))
  }
}

export { Ray }