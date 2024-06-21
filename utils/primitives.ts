import * as ray from "./ray"
import { randomOnUnitSphere } from "./utils"
import {
  MaterialSampleRecord, Material, DiffuseBRDF,
  MetalBRDF, MicrofacetSpecularBRDF, NormalDiffuseBRDF,
  NormalMetalBRDF,
  DiffuseSpecularBRDF,
  SimpleEmitter
} from "./materials"
import { CheckerTexture, UniformColorTexture } from "./textures"
import { Vector2, Vector3 } from "./vector"

class HitRecord {
  success!: boolean
  t!: number
  pos!: Vector3
  uv!: Vector2
  normal!: Vector3
  tangent!: Vector3
  binormal!: Vector3
  material!: Material
  deletePath = false
}

abstract class Shape {
  material: Material
  constructor(material?: Material) {
    this.material = material ?? new SimpleEmitter(new Vector3(1, 1, 0), 1)
  }

  hit (r: ray.Ray, maxt = Infinity) {
    const rec = new HitRecord()
    rec.success = false
    return rec
  }
}

class Sphere extends Shape{
  center: Vector3
  radius: number
  constructor(center: Vector3, radius: number, material?: Material) {
    super(material)
    this.center = center
    this.radius = radius
  }
  
  hit (r: ray.Ray, maxt = Infinity) {
    const eps = 0.001

    const rec = new HitRecord()

    const a = r.direction.magSq()
    const b = 2 * r.origin.sub(this.center).dot(r.direction)
    const c = r.origin.sub(this.center).magSq() - this.radius ** 2
    const D = b ** 2 - 4 * a * c
    if (D < 0) {
      rec.success = false
      return rec
    }
    const t1 = (-b - (D) ** (1/2)) / (2 * a)
    const t2 = (-b + (D) ** (1/2)) / (2 * a)
    // 両方後ろにある場合
    if (t2 < eps) {
      rec.success = false
      return rec
    }

    let t
    if (t1 > eps && t2 > eps) {
      // 両方前にある場合
      t = t1
    } else {
      // t2だけが前にある場合
      t = t2
    }
    // maxtより大きい場合
    if (t > maxt) {
      rec.success = false
      return rec
    }
    rec.success = true
    rec.t = t
    rec.pos = r.at(rec.t)
    let normal = rec.pos.sub(this.center).normalized()
    const ndDot = normal.dot(r.direction)
    if (ndDot > 0) {
      normal = normal.mult(-1)
    }
    rec.normal = normal
    let upVec = new Vector3(0, 1, 0)
    if (1 - Math.abs(normal.dot(upVec)) < 1e-6) {
      upVec = new Vector3(0, 0, 1)
    }
    rec.tangent = rec.normal.cross(upVec).normalized()
    rec.binormal = rec.tangent.cross(rec.normal).normalized()
    rec.uv = new Vector2(
      Math.atan2(rec.pos.z, rec.pos.x),
      Math.acos(rec.pos.y / this.radius)
    )
    rec.material = this.material
    return rec
  }

  uniformSample ()  {
    return this.center.add(randomOnUnitSphere()).mult(this.radius)
  }

  surfaceArea () {
    return 4 * Math.PI * this.radius ** 2
  }
}

class Quad extends Shape {
  origin: Vector3
  u: Vector3
  v: Vector3
  normal: Vector3
  constructor(origin: Vector3, u: Vector3, v: Vector3, material?: Material) {
    super(material)
    this.origin = origin
    this.u = u
    this.v = v
    this.normal = u.cross(v)
  }
  
  hit (r: ray.Ray, maxt = Infinity) {
    const eps = 0.001

    const rec = new HitRecord()

    const t = (this.normal.dot(this.origin) - this.normal.dot(r.origin)) / this.normal.dot(r.direction)
    // maxtより大きいか、後ろにある場合
    if (t > maxt || t < eps) {
      rec.success = false
      return rec
    }
    const pos = r.at(t)
    // 外側にある場合
    const dp = pos.sub(this.origin)
    const dpou = dp.dot(this.u.normalized())
    const dpov = dp.dot(this.v.normalized())
    if (dpou < 0 || this.u.mag() < dpou || dpov < 0 || this.v.mag() < dpov) {
      rec.success = false
      return rec
    }

    rec.success = true
    rec.t = t
    rec.pos = pos
    let normal = this.normal
    const ndDot = normal.dot(r.direction)
    if (ndDot > 0) {
      normal = normal.mult(-1)
    }
    rec.normal = normal
    rec.tangent = this.u.normalized()
    rec.binormal = rec.tangent.cross(rec.normal).normalized()
    rec.uv = new Vector2(dpou, dpov)
    rec.material = this.material
    return rec
  }

  uniformSample ()  {
    const rand1 = Math.random()
    const rand2 = Math.random()
    return this.origin.add(this.u.mult(rand1)).add(this.v.mult(rand2))
  }

  surfaceArea () {
    return this.u.mag() * this.v.mag()
  }
}


export { HitRecord, Shape, Sphere, Quad }