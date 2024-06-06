import p5Types from "p5"
import { Ray } from "./ray"
import { randomOnHemiSphere, randomOnUnitSphere } from "./utils"
import { HitRecord } from "./primitives"
import { Texture } from "./textures"

class MaterialSampleRecord {
  brdf!: p5Types.Vector
  l!: p5Types.Vector
  pdf!: number
  fresnel!: p5Types.Vector | null
  Le!: p5Types.Vector
}

const dot = p5Types.Vector.dot
const saturate = (v: number) => Math.min(Math.max(v, 0), 1)

const reflect = (vec: p5Types.Vector, normal: p5Types.Vector) => {
  return normal.copy().mult(2 * dot(normal, vec)).sub(vec)
}

const tangentToWorld = (
  p5: p5Types, vec: p5Types.Vector, tangent: p5Types.Vector,
  binormal: p5Types.Vector, normal: p5Types.Vector) => {
    const matrix = [
      [tangent.x, binormal.x, normal.x],
      [tangent.y, binormal.y, normal.y],
      [tangent.z, binormal.z, normal.z]
    ]
    return p5.createVector(
      vec.x * matrix[0][0] + vec.y * matrix[0][1] + vec.z * matrix[0][2],
      vec.x * matrix[1][0] + vec.y * matrix[1][1] + vec.z * matrix[1][2],
      vec.x * matrix[2][0] + vec.y * matrix[2][1] + vec.z * matrix[2][2]
    )
  }

const RGB2Luminance = (rgb: p5Types.Vector) => {
  return rgb.copy().dot(0.299, 0.587, 0.114)
}

class Material {
  p5: p5Types
  constructor(p5: p5Types) {
    this.p5 = p5
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    throw new Error("not implemented")
    return new MaterialSampleRecord()
  }
}

class DiffuseBRDF extends Material {
  diffuseColor: Texture

  constructor(p5: p5Types, diffuseColor: Texture) {
    super(p5)
    this.diffuseColor = diffuseColor
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    const rec = new MaterialSampleRecord()

    // sample light vector
    const rand1 = this.p5.random()
    const cosTheta = rand1 ** (1/2)
    const sinTheta = (1 - cosTheta**2) ** (1/2)
    const phi = this.p5.random(0, 2 * this.p5.PI)
    const lInTangent = this.p5.createVector(
      sinTheta * this.p5.cos(phi),
      sinTheta * this.p5.sin(phi),
      cosTheta
    )
    rec.l = tangentToWorld(
      this.p5, lInTangent, hRec.tangent, hRec.binormal, hRec.normal)
    const diffuseColor = this.diffuseColor.sample(hRec.pos)
    rec.brdf = diffuseColor.copy().div(this.p5.PI)
    rec.pdf = p5Types.Vector.dot(rec.l, hRec.normal) / this.p5.PI
    return rec
  }
}

class MetalBRDF extends Material {
  metalColor: Texture

  constructor(p5: p5Types, metalColor: Texture) {
    super(p5)
    this.metalColor = metalColor
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    const rec = new MaterialSampleRecord()
    const v = r.direction.copy().normalize().mult(-1)
    rec.l = reflect(v, hRec.normal)
    const metalColor = this.metalColor.sample(hRec.pos)
    rec.brdf = metalColor.copy().div(dot(rec.l, hRec.normal))
    rec.pdf = 1
    return rec
  }
}

class MicrofacetSpecularBRDF extends Material {
  F0: Texture
  alpha: number

  constructor(p5: p5Types, F0: Texture, roughness: number) {
    super(p5)
    this.F0 = F0
    this.alpha = roughness ** 2
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    const rec = new MaterialSampleRecord()
    // this.testGGX()
    
    // sample half vector
    const rand1 = this.p5.random()
    const cosTheta = ((1 - rand1) / (rand1 * (this.alpha ** 2 - 1) + 1)) ** (1/2)
    const sinTheta = (1 - cosTheta**2) ** (1/2)
    const phi = this.p5.random(0, 2 * this.p5.PI)
    const halfInTangent = this.p5.createVector(
      sinTheta * this.p5.cos(phi),
      sinTheta * this.p5.sin(phi),
      cosTheta
    )
    const half = tangentToWorld(
      this.p5, halfInTangent, hRec.tangent, hRec.binormal, hRec.normal)

    // calculate light vector from view and half vector
    const v = r.direction.copy().normalize().mult(-1)
    rec.l = reflect(v, half)
    const hnDot = saturate(dot(half, hRec.normal))
    const lhDot = saturate(dot(rec.l, half))

    const ndf = this.GGX(hnDot)
    const F0 = this.F0.sample(hRec.pos)
    rec.fresnel = this.schlickFresnel(lhDot, F0)
    const geo = this.hcssm(rec.l, v, hRec.normal)
    rec.brdf = rec.fresnel.copy().mult(ndf * geo).div(
      Math.max(4 * dot(rec.l, hRec.normal) * dot(v, hRec.normal), 1e-6)
    )
    rec.pdf = ndf * hnDot / (Math.max(4 * dot(rec.l, half), 1e-6))
    return rec
  }

  schlickFresnel = (lhDot: number, F0: p5Types.Vector, approx = true) => {
    if (approx) {
      const oneMinusF0 = F0.copy().mult(-1).add(1, 1, 1)
      return oneMinusF0.mult((1 - lhDot) ** 5).add(F0)
    }
    else {
      throw new Error("not implemented")
    }
  }

  GGX = (hnDot: number) => {
    const alphaSq = this.alpha ** 2
    const step = hnDot > 0 ? 1 : 0
    return step * alphaSq / (this.p5.PI * (hnDot ** 2 * (alphaSq-1) +1) ** 2)
  }

  testGGX = () => {
    const N = 10000
    let total = 0
    for (let i = 0; i < N; i++) {
      const normal = this.p5.createVector(0, 0, 1)
      const half = randomOnHemiSphere(this.p5, normal)
      const hnDot = dot(normal, half)
      total += this.GGX(hnDot) * hnDot
    }
    alert(total / N * 2 * this.p5.PI)
  }

  hcssm = (l: p5Types.Vector, v: p5Types.Vector, normal: p5Types.Vector) => {
    const alphaSq = this.alpha ** 2
    const lambda = (w: p5Types.Vector) => {
      const whDot = dot(w, normal)
      const tanThetaSq = 1 / (whDot > 0 ? whDot : 0) ** 2 - 1
      const alphaGSqInv = alphaSq * tanThetaSq
      return (-1 + (1 + alphaGSqInv) ** (1/2)) / 2
    }
    return 1 / (lambda(l) + lambda(v) + 1)
  }
}

class DiffuseSpecularBRDF extends Material {
  diffuseBRDF: DiffuseBRDF
  specularBRDF: MicrofacetSpecularBRDF
  baseColor: Texture
  roughness: number

  constructor(p5: p5Types, baseColor: Texture, roughness: number) {
    super(p5)
    this.baseColor = baseColor
    this.roughness = roughness ** 2
    this.diffuseBRDF = new DiffuseBRDF(p5, baseColor)
    this.specularBRDF = new MicrofacetSpecularBRDF(p5, baseColor, roughness ** 2)
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    const rec = new MaterialSampleRecord()
    const diffRec = this.diffuseBRDF.newSample(r, hRec)
    const specRec = this.specularBRDF.newSample(r, hRec)
    if (specRec.fresnel === null) {
      throw Error("internal error: specRec does not contain fresnel")
    }
    const oneMinusF = specRec.fresnel.copy().mult(-1).add(1, 1, 1)
    const fresnelLuminance = RGB2Luminance(specRec.fresnel)
    const probSpec = 1 / (2 - fresnelLuminance)
    if (this.p5.random() < probSpec) {
      rec.l = specRec.l
    } else {
      rec.l = diffRec.l
    }
    rec.pdf = (diffRec.pdf * (1 - fresnelLuminance) + specRec.pdf) / (2 - fresnelLuminance)
    rec.brdf = diffRec.brdf.copy().mult(oneMinusF).add(specRec.brdf)
    return rec
  }
}

class NormalDiffuseBRDF extends Material {

  constructor(p5: p5Types) {
    super(p5)
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    const rec = new MaterialSampleRecord()
    const diffuseColor = hRec.binormal.copy().add(1, 1, 1).mult(0.5)
    rec.brdf = diffuseColor.copy().div(this.p5.PI)
    rec.pdf = 1 / (2 * this.p5.PI)
    let l = randomOnUnitSphere(this.p5)
    let lnDot = dot(hRec.normal, l)
    if (lnDot < 0) {
      l = l.mult(-1)
    }
    rec.l = l
    return rec
  }
}

class NormalMetalBRDF extends Material {

  constructor(p5: p5Types) {
    super(p5)
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    const rec = new MaterialSampleRecord()
    const v = r.direction.copy().normalize().mult(-1)
    rec.l = reflect(v, hRec.normal)
    const metalColor = hRec.normal.copy().add(1, 1, 1).mult(0.5)
    rec.brdf = metalColor.copy().div(dot(rec.l, hRec.normal))
    rec.pdf = 1
    return rec
  }
}

class SimpleEmitter extends Material {
  color: p5Types.Vector
  emittance: number
  constructor(p5: p5Types, color: p5Types.Vector, emittance: number) {
    super(p5)
    this.color = color
    this.emittance = emittance
  }

  newSample = (r: Ray, hRec: HitRecord) => {
    const rec = new MaterialSampleRecord()
    hRec.deletePath = true
    rec.brdf = this.p5.createVector(0, 0, 0)
    rec.pdf = 1
    rec.Le = this.color.copy().mult(this.emittance)
    return rec
  }
}

export {
  MaterialSampleRecord, Material, DiffuseBRDF,
  MetalBRDF, MicrofacetSpecularBRDF, NormalDiffuseBRDF, NormalMetalBRDF,
  DiffuseSpecularBRDF, SimpleEmitter
}