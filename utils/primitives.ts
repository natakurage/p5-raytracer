import * as ray from "./ray"
import { randomOnUnitSphere } from "./utils"
import {
  MaterialSampleRecord, Material, DiffuseBRDF,
  MetalBRDF, MicrofacetSpecularBRDF, NormalDiffuseBRDF,
  NormalMetalBRDF,
  DiffuseSpecularBRDF
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
  brdf!: Vector3
  pdf!: number
  l!: Vector3
  deletePath = false
  Le!: Vector3
}

class Sphere {
  center: Vector3
  radius: number
  material: Material
  constructor(center: Vector3, radius: number, material?: Material) {
    this.center = center
    this.radius = radius
    this.material = material ?? 
      // new NormalDiffuseBRDF(Math)
      // new NormalMetalBRDF(Math)
      // new DiffuseBRDF(Math, new Vector3(0.8, 0.1, 0.1))
      // new MetalBRDF(Math, new Vector3(1, 1, 1))
      // new MicrofacetSpecularBRDF(Math, new Vector3(0.5, 0.5, 0.5), 0.1)
      new DiffuseSpecularBRDF(
        new CheckerTexture(
        new Vector3(0.8, 0.1, 0.1),
        new Vector3(0.1, 0.1, 0.1),2
      ),
      0.5)
  }
  
  hit = (r: ray.Ray) => {
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
    const mRec = this.material.newSample(r, rec)
    rec.brdf = mRec.brdf
    rec.pdf = mRec.pdf
    rec.l = mRec.l
    rec.Le = mRec.Le
    return rec
  }

}

export { HitRecord, Sphere }