import p5Types from "p5"
import * as ray from "./ray"
import { randomOnUnitSphere } from "./utils"
import {
  MaterialSampleRecord, Material, DiffuseBRDF,
  MetalBRDF, MicrofacetSpecularBRDF, NormalDiffuseBRDF,
  NormalMetalBRDF,
  DiffuseSpecularBRDF
} from "./materials"
import { CheckerTexture, UniformColorTexture } from "./textures"

class HitRecord {
  success!: boolean
  t!: number
  pos!: p5Types.Vector
  uv!: p5Types.Vector
  normal!: p5Types.Vector
  tangent!: p5Types.Vector
  binormal!: p5Types.Vector
  brdf!: p5Types.Vector
  pdf!: number
  l!: p5Types.Vector
  deletePath = false
  Le!: p5Types.Vector
}

class Sphere {
  p5: p5Types
  center: p5Types.Vector
  radius: number
  material: Material
  constructor(p5: p5Types, center: p5Types.Vector, radius: number, material?: Material) {
    this.p5 = p5
    this.center = center
    this.radius = radius
    this.material = material ?? 
      // new NormalDiffuseBRDF(p5)
      // new NormalMetalBRDF(p5)
      // new DiffuseBRDF(p5, p5.createVector(0.8, 0.1, 0.1))
      // new MetalBRDF(p5, p5.createVector(1, 1, 1))
      // new MicrofacetSpecularBRDF(p5, p5.createVector(0.5, 0.5, 0.5), 0.1)
      new DiffuseSpecularBRDF(p5,
        new CheckerTexture(
          p5, p5.createVector(0.8, 0.1, 0.1),
          p5.createVector(0.1, 0.1, 0.1),2
        ),
      0.5)
  }
  
  hit = (r: ray.Ray) => {
    const eps = 0.001

    const rec = new HitRecord()

    const a = r.direction.magSq()
    const b = 2 * p5Types.Vector.dot(p5Types.Vector.sub(r.origin, this.center), r.direction)
    const c = p5Types.Vector.sub(r.origin, this.center).magSq() - this.radius ** 2
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
    const normal = p5Types.Vector.sub(rec.pos, this.center).normalize()
    const ndDot = p5Types.Vector.dot(normal, r.direction)
    if (ndDot > 0) {
      normal.mult(-1)
    }
    rec.normal = normal
    let upVec = this.p5.createVector(0, 1, 0)
    if (1 - Math.abs(p5Types.Vector.dot(normal, upVec)) < 1e-6) {
      upVec = this.p5.createVector(0, 0, 1)
    }
    rec.tangent = rec.normal.copy().cross(upVec).normalize()
    rec.binormal = rec.tangent.copy().cross(rec.normal).normalize()
    const mRec = this.material.newSample(r, rec)
    rec.uv = this.p5.createVector(
      this.p5.acos(rec.pos.z / this.radius),
      this.p5.atan2(rec.pos.y, rec.pos.x)
    )
    rec.brdf = mRec.brdf
    rec.pdf = mRec.pdf
    rec.l = mRec.l
    rec.Le = mRec.Le
    return rec
  }

}

export { HitRecord, Sphere }