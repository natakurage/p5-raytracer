import { Vector2, Vector3 } from './vector'
import { Quad, Sphere } from './primitives'
import { randomOnUnitSphere } from './utils'

class EmitterSampleRecord {
  success!: boolean
  t!: number
  pos!: Vector3
  uv!: Vector2
  normal!: Vector3
  tangent!: Vector3
  binormal!: Vector3
  pdf!: number
  l!: Vector3
  Le!: Vector3
}

class Emitter {
  constructor() {
  }

  surfaceArea () {
    return 0
  }

  randomSample () {
    throw new Error("not implemented")
    return new EmitterSampleRecord()
  }
}

/* TODO: 無限大の問題を修正 */
class PointLight extends Emitter {
  center: Vector3
  radius: number
  power: number
  color: Vector3

  constructor(center: Vector3, radius: number, power: number, color: Vector3) {
    super()
    this.center = center
    this.radius = radius
    this.power = power
    this.color = color
  }

  surfaceArea () {
    return 4 * Math.PI * this.radius ** 2
  }

  randomSample () {
    const rec = new EmitterSampleRecord()
    rec.normal = randomOnUnitSphere()
    rec.pos = this.center.add(rec.normal.mult(this.radius))
    rec.Le = this.color.mult(this.power / (4 * Math.PI))
    rec.pdf = 1
    return rec
  }
}

class AreaLight extends Emitter {
  quad: Quad
  radiance: number
  color: Vector3

  constructor(origin: Vector3, u: Vector3, v: Vector3, radiance: number, color: Vector3) {
    super()
    this.quad = new Quad(origin, u, v)
    this.radiance = radiance
    this.color = color
  }

  surfaceArea () {
    return this.quad.surfaceArea()
  }

  randomSample () {
    const rec = new EmitterSampleRecord()
    rec.normal = this.quad.normal
    rec.pos = this.quad.uniformSample()
    rec.Le = this.color.mult(this.radiance)
    rec.pdf = 1
    return rec
  }
}

export { Emitter, PointLight, AreaLight }