import { Ray } from "./ray"
import { randomOnHemiSphere, randomOnUnitSphere, saturate } from "./utils"
import { HitRecord } from "./primitives"
import { Texture, UniformColorTexture } from "./textures"
import { Vector2, Vector3 } from "./vector"

class MaterialSampleRecord {
  bsdf!: Vector3
  isBtdf = false
  l!: Vector3
  pdf!: number
  fresnel!: Vector3
  Le!: Vector3
}

const reflect = (vec: Vector3, normal: Vector3) => {
  return normal.mult(2 * normal.dot(vec)).sub(vec)
}

const refract = (vec: Vector3, normal: Vector3, relEta: number) => {
  const sinThetaIn = (1 - normal.dot(vec) ** 2) ** (1/2)
  const sinThetaOut = relEta * sinThetaIn
  const cosThetaOut = (1 - sinThetaOut ** 2) ** (1/2)
  const horizon = vec.sub(normal.mult(vec.dot(normal))).normalized()
  return horizon.mult(-sinThetaOut).add(normal.mult(-cosThetaOut)).normalized()
}

const tangentToWorld = (
  vec: Vector3, tangent: Vector3,
  binormal: Vector3, normal: Vector3) => {
    const matrix = [
      [tangent.x, binormal.x, normal.x],
      [tangent.y, binormal.y, normal.y],
      [tangent.z, binormal.z, normal.z]
    ]
    return new Vector3(
      vec.x * matrix[0][0] + vec.y * matrix[0][1] + vec.z * matrix[0][2],
      vec.x * matrix[1][0] + vec.y * matrix[1][1] + vec.z * matrix[1][2],
      vec.x * matrix[2][0] + vec.y * matrix[2][1] + vec.z * matrix[2][2]
    )
  }

const RGB2Luminance = (rgb: Vector3) => {
  return rgb.dot(new Vector3(0.299, 0.587, 0.114))
}

class Material {
  constructor() {
  }

  newSample (r: Ray, hRec: HitRecord, eta: number) {
    throw new Error("not implemented")
    return new MaterialSampleRecord()
  }

  evalBSDF (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, eta: number, normalInverted: boolean) {
    const vlDot = v.dot(l)
    if (vlDot < 0) {
      return this.evalBTDF(uv, v, l, normal, eta, normalInverted)
    }
    else
      return this.evalBRDF(uv, v, l, normal, eta, normalInverted)
  }

  evalBRDF (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, eta: number, normalInverted: boolean) {
    return new Vector3(0, 0, 0)
  }

  evalBTDF (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, eta: number, normalInverted: boolean) {
    return new Vector3(0, 0, 0)
  }
}

class BRDF extends Material{
  newSample (r: Ray, hRec: HitRecord) {
    throw new Error("not implemented")
    return new MaterialSampleRecord()
  }
}

class BTDF extends Material{
  newSample (r: Ray, hRec: HitRecord, eta: number) {
    throw new Error("not implemented")
    return new MaterialSampleRecord()
  }
}

class DiffuseBRDF extends BRDF {
  diffuseColor: Texture

  constructor(diffuseColor: Texture) {
    super()
    this.diffuseColor = diffuseColor
  }

  evalBRDF (uv: Vector2) {
    const diffuseColor = this.diffuseColor.sample(uv)
    return diffuseColor.div(Math.PI)
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()

    // sample light vector
    const rand1 = Math.random()
    const cosTheta = rand1 ** (1/2)
    const sinTheta = (1 - cosTheta**2) ** (1/2)
    const phi = Math.random() * 2 * Math.PI
    const lInTangent = new Vector3(
      sinTheta * Math.cos(phi),
      sinTheta * Math.sin(phi),
      cosTheta
    )
    rec.l = tangentToWorld(lInTangent, hRec.tangent, hRec.binormal, hRec.normal)
    rec.bsdf = this.evalBRDF(hRec.uv)
    rec.pdf = rec.l.dot(hRec.normal) / Math.PI
    return rec
  }
}

class MetalBRDF extends BRDF {
  metalColor: Texture

  constructor(metalColor: Texture) {
    super()
    this.metalColor = metalColor
  }

  evalBRDF (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    if (reflect(v, normal).sub(l).magSq() > 1e-6)
      return new Vector3(0, 0, 0)
    return this._evalBRDF(uv, l, normal)
  }

  private _evalBRDF (uv: Vector2, l: Vector3, normal: Vector3) {
    const metalColor = this.metalColor.sample(uv)
    return metalColor.div(l.dot(normal))
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    const v = r.direction.normalized().mult(-1)
    rec.l = reflect(v, hRec.normal)
    rec.pdf = 1
    rec.bsdf = this._evalBRDF(hRec.uv, rec.l, hRec.normal)
    return rec
  }
}

class MicrofacetSpecularBRDF extends BRDF {
  F0: Texture
  alpha: number

  constructor(F0: Texture, roughness: number) {
    super()
    this.F0 = F0
    this.alpha = roughness ** 2
  }

  evalBRDF (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    const half = v.add(l).mult(0.5)
    const hnDot = saturate(half.dot(normal))
    const lhDot = saturate(l.dot(half))
    const ndf = this.GGX(hnDot)
    const F0 = this.F0.sample(uv)
    const fresnel = this.schlickFresnel(lhDot, F0)
    const geo = this.hcssm(l, v, normal)
    return this._evalBRDF(fresnel, ndf, geo, l, v, normal)
  }

  private _evalBRDF (fresnel: Vector3, ndf: number, geo: number, l: Vector3, v: Vector3, normal: Vector3) {
    return fresnel.mult(ndf * geo).div(
      Math.max(4 * l.dot(normal) * v.dot(normal), 1e-6)
    )
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    // this.testGGX()
    
    // sample half vector
    const rand1 = Math.random()
    const cosTheta = ((1 - rand1) / (rand1 * (this.alpha ** 2 - 1) + 1)) ** (1/2)
    const sinTheta = (1 - cosTheta**2) ** (1/2)
    const phi = Math.random() * 2 * Math.PI
    const halfInTangent = new Vector3(
      sinTheta * Math.cos(phi),
      sinTheta * Math.sin(phi),
      cosTheta
    )
    const half = tangentToWorld(halfInTangent, hRec.tangent, hRec.binormal, hRec.normal)

    // calculate light vector from view and half vector
    const v = r.direction.normalized().mult(-1)
    rec.l = reflect(v, half)
    const hnDot = saturate(half.dot(hRec.normal))
    const lhDot = saturate(rec.l.dot(half))

    const ndf = this.GGX(hnDot)
    const F0 = this.F0.sample(hRec.uv)
    rec.fresnel = this.schlickFresnel(lhDot, F0)
    const geo = this.hcssm(rec.l, v, hRec.normal)
    rec.bsdf = this._evalBRDF(rec.fresnel, ndf, geo, rec.l, v, hRec.normal)
    rec.pdf = ndf * hnDot / (Math.max(4 * rec.l.dot(half), 1e-6))
    return rec
  }

  schlickFresnel (lhDot: number, F0: Vector3, approx = true) {
    if (approx) {
      const oneMinusF0 = F0.mult(-1).add(new Vector3(1, 1, 1))
      return oneMinusF0.mult((1 - lhDot) ** 5).add(F0)
    }
    else {
      throw new Error("not implemented")
    }
  }

  GGX (hnDot: number) {
    const alphaSq = this.alpha ** 2
    const step = hnDot > 0 ? 1 : 0
    return step * alphaSq / (Math.PI * (hnDot ** 2 * (alphaSq-1) +1) ** 2)
  }

  testGGX () {
    const N = 10000
    let total = 0
    for (let i = 0; i < N; i++) {
      const normal = new Vector3(0, 0, 1)
      const half = randomOnHemiSphere(normal)
      const hnDot = normal.dot(half)
      total += this.GGX(hnDot) * hnDot
    }
    alert(total / N * 2 * Math.PI)
  }

  hcssm (l: Vector3, v: Vector3, normal: Vector3) {
    const alphaSq = this.alpha ** 2
    const lambda = (w: Vector3) => {
      const whDot = w.dot(normal)
      const tanThetaSq = 1 / (whDot > 0 ? whDot : 0) ** 2 - 1
      const alphaGSqInv = alphaSq * tanThetaSq
      return (-1 + (1 + alphaGSqInv) ** (1/2)) / 2
    }
    return 1 / (lambda(l) + lambda(v) + 1)
  }
}

class DiffuseSpecularBRDF extends BRDF {
  diffuseBRDF: DiffuseBRDF
  specularBRDF: MicrofacetSpecularBRDF

  constructor(baseColor: Texture, roughness: number) {
    super()
    this.diffuseBRDF = new DiffuseBRDF(baseColor)
    this.specularBRDF = new MicrofacetSpecularBRDF(baseColor, roughness)
  }

  evalBRDF (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    const diffBsdf = this.diffuseBRDF.evalBRDF(uv)
    const specBsdf = this.specularBRDF.evalBRDF(uv, v, l, normal)
    const lhDot = v.add(l).mult(0.5).dot(l)
    const fresnel = this.specularBRDF.schlickFresnel(lhDot, this.specularBRDF.F0.sample(uv))
    return this._evalBRDF(fresnel, diffBsdf, specBsdf)
  }

  private _evalBRDF (specFresnel: Vector3, specBsdf: Vector3, diffBsdf: Vector3) {
    const oneMinusF = specFresnel.mult(-1).add(new Vector3(1, 1, 1))
    return diffBsdf.mult(oneMinusF).add(specBsdf)
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    const diffRec = this.diffuseBRDF.newSample(r, hRec)
    const specRec = this.specularBRDF.newSample(r, hRec)
    if (specRec.fresnel === null) {
      throw Error("internal error: specRec does not contain fresnel")
    }
    const fresnelLuminance = RGB2Luminance(specRec.fresnel)
    const probSpec = 1 / (2 - fresnelLuminance)
    if (Math.random() < probSpec) {
      rec.l = specRec.l
    } else {
      rec.l = diffRec.l
    }
    rec.pdf = (diffRec.pdf * (1 - fresnelLuminance) + specRec.pdf) / (2 - fresnelLuminance)
    rec.bsdf = this._evalBRDF(specRec.fresnel, specRec.bsdf, diffRec.bsdf)
    return rec
  }
}

class GrassBSDF extends Material {
  color: Vector3
  eta: number
  constructor(color: Vector3, eta: number) {
    super()
    this.color = color
    this.eta = eta
  }

  evalBRDF (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, eta: number, normalInverted: boolean) {
    const etai = normalInverted ? this.eta : eta
    const etao = normalInverted ? eta : this.eta
    const F0Nc = ((etai - etao) / (etai + etao)) ** 2
    const invColor = new Vector3(1, 1, 1).sub(this.color)
    const F0 = invColor.mult(F0Nc)
    const fresnel = this.schlickFresnel(v.dot(normal), F0)
    if (reflect(v, normal).sub(l).magSq() > 1e-6)
      return new Vector3(0, 0, 0)
    console.log(1)
    return fresnel.div(l.dot(normal))
  }

  evalBTDF(uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, eta: number, normalInverted: boolean): Vector3 {
    const etai = normalInverted ? this.eta : eta
    const etao = normalInverted ? eta : this.eta
    const relEta = etai / etao
    const F0Nc = ((etai - etao) / (etai + etao)) ** 2
    const invColor = new Vector3(1, 1, 1).sub(this.color)
    const F0 = invColor.mult(F0Nc)
    const fresnel = this.schlickFresnel(v.dot(normal), F0)
    const fresnelTrans = new Vector3(1, 1, 1).sub(fresnel)
    if (refract(v, normal, relEta).sub(l).magSq() < 1e-6) {
      return fresnelTrans.mult((1 / relEta) ** 2 / l.dot(normal))
    }
    return new Vector3(0, 0, 0)
  }

  newSample (r: Ray, hRec: HitRecord, eta: number) {
    const rec = new MaterialSampleRecord()
    const v = r.direction.normalized().mult(-1)
    const etai = hRec.normalInverted ? this.eta : eta
    const etao = hRec.normalInverted ? eta : this.eta
    const relEta = etai / etao

    /* fresnel */
    const F0Nc = ((etai - etao) / (etai + etao)) ** 2
    const invColor = new Vector3(1, 1, 1).sub(this.color)
    const F0 = invColor.mult(F0Nc)
    rec.fresnel = this.schlickFresnel(hRec.normal.dot(v), F0)

    const sinThetaIn = (1 - hRec.normal.dot(v) ** 2) ** (1/2)
    const sinThetaOut = relEta * sinThetaIn
    const totalRefl = sinThetaOut > 1

    const probRefl = RGB2Luminance(rec.fresnel)

    if (totalRefl || Math.random() < probRefl) {
      rec.l = reflect(v, hRec.normal)
      rec.bsdf = rec.fresnel.div(rec.l.dot(hRec.normal));
      rec.pdf = totalRefl ? 1 : 1 * probRefl
    } else {
      rec.l = refract(v, hRec.normal, relEta)
      const fresnelTrans = new Vector3(1, 1, 1).sub(rec.fresnel)
      rec.bsdf = fresnelTrans.mult((1 / relEta) ** 2 / rec.l.dot(hRec.normal))
      rec.isBtdf = true
      rec.pdf = 1 * (1 - probRefl)
    }
    return rec
  }

  schlickFresnel (vnDot: number, F0: Vector3, approx = true) {
    if (approx) {
      const oneMinusF0 = F0.mult(-1).add(new Vector3(1, 1, 1))
      return oneMinusF0.mult((1 - vnDot) ** 5).add(F0)
    }
    else {
      throw new Error("not implemented")
    }
  }
}

class SimpleEmitter extends BRDF {
  color: Vector3
  emittance: number
  constructor(color: Vector3, emittance: number) {
    super()
    this.color = color
    this.emittance = emittance
  }

  evalBRDF () {
    return new Vector3(0, 0, 0)
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    hRec.deletePath = true
    rec.bsdf = this.evalBRDF()
    rec.pdf = 1
    rec.Le = this.color.mult(this.emittance)
    return rec
  }
}

export {
  MaterialSampleRecord, Material, DiffuseBRDF,
  MetalBRDF, MicrofacetSpecularBRDF,
  DiffuseSpecularBRDF, GrassBSDF, SimpleEmitter
}