import { Ray } from "./ray"
import { randomOnHemiSphere, randomOnUnitSphere, saturate } from "./utils"
import { HitRecord } from "./primitives"
import { Texture, UniformColorTexture } from "./textures"
import { Vector2, Vector3 } from "./vector"

class MaterialSampleRecord {
  bsdf!: Vector3
  isBtdf = false
  pdf!: number
  Le!: Vector3
  finishTrace = false
  isNEEEmitter = false
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

  sampleDirection (r: Ray, hRec: HitRecord, eta: number) {
    throw new Error("not implemented")
    return new Vector3(0, 0, 0)
  }

  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, normalInverted: boolean, eta: number) {
    throw new Error("not implemented")
    return new MaterialSampleRecord()
  }
}

class BRDF extends Material{
  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    throw new Error("not implemented")
    return new MaterialSampleRecord()
  }
}

class BTDF extends Material{
  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, normalInverted: boolean, eta: number) {
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

  sampleDirection(r: Ray, hRec: HitRecord) {
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
    return tangentToWorld(lInTangent, hRec.tangent, hRec.binormal, hRec.normal)
  }

  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    const rec = new MaterialSampleRecord()
    if (l.dot(normal) < 0) {
      console.log(l.dot(normal), "dd")
      rec.bsdf = new Vector3(0, 0, 0)
      rec.pdf = 1
    } else {
      const diffuseColor = this.diffuseColor.sample(uv)
      rec.bsdf = diffuseColor.div(Math.PI)
      rec.pdf = l.dot(normal) / Math.PI
    }
    return rec
  }
}

class MetalBRDF extends BRDF {
  metalColor: Texture

  constructor(metalColor: Texture) {
    super()
    this.metalColor = metalColor
  }

  getPDF (v: Vector3, l: Vector3, normal: Vector3) {
    return 
  }

  sampleDirection(r: Ray, hRec: HitRecord) {
    const v = r.direction.normalized().mult(-1)
    return reflect(v, hRec.normal)
  }

  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    const rec = new MaterialSampleRecord()
    const step = reflect(v, normal).sub(l).magSq() < 1e-8 ? 1 : 0
    rec.pdf = step
    const metalColor = this.metalColor.sample(uv)
    rec.bsdf = metalColor.div(l.dot(normal)).mult(step)
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

  sampleDirection(r: Ray, hRec: HitRecord) {
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
    return reflect(v, half)
  }

  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    const rec = new MaterialSampleRecord()
    if (l.dot(normal) < 0) {
      rec.bsdf = new Vector3(0, 0, 0)
      rec.pdf = 1
      return rec
    }
    // this.testGGX()
    const half = v.add(l).mult(0.5)
    const hnDot = saturate(half.dot(normal))
    const lhDot = saturate(l.dot(half))

    const ndf = this.GGX(hnDot)
    const F0 = this.F0.sample(uv)
    const fresnel = this.schlickFresnel(lhDot, F0)
    const geo = this.hcssm(l, v, normal)
    
    rec.bsdf = fresnel.mult(ndf * geo).div(
      Math.max(4 * l.dot(normal) * v.dot(normal), 1e-6)
    )
    rec.pdf = ndf * hnDot / (Math.max(4 * l.dot(half), 1e-6))
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

  sampleDirection(r: Ray, hRec: HitRecord) {
    const v = r.direction.mult(-1).normalized()
    const specL = this.specularBRDF.sampleDirection(r, hRec)
    const specHalf = v.add(specL).mult(0.5)
    const lhDot = specL.dot(specHalf)
    const fresnel = this.specularBRDF.schlickFresnel(lhDot, this.specularBRDF.F0.sample(hRec.uv))
    const fresnelLuminance = RGB2Luminance(fresnel)
    const probSpec = 1 / (2 - fresnelLuminance)
    if (Math.random() < probSpec) {
      return specL
    } else {
      return this.diffuseBRDF.sampleDirection(r, hRec)
    }
  }

  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3) {
    const rec = new MaterialSampleRecord()
    const half = v.add(l).mult(0.5)
    const lhDot = l.dot(half)
    const fresnel = this.specularBRDF.schlickFresnel(lhDot, this.specularBRDF.F0.sample(uv))
    const fresnelLuminance = RGB2Luminance(fresnel)
    const diffRec = this.diffuseBRDF.newSample(uv, v, l, normal)
    const specRec = this.specularBRDF.newSample(uv, v, l, normal)
    rec.pdf = (diffRec.pdf * (1 - fresnelLuminance) + specRec.pdf) / (2 - fresnelLuminance)
    const oneMinusF = fresnel.mult(-1).add(new Vector3(1, 1, 1))
    rec.bsdf = diffRec.bsdf.mult(oneMinusF).add(specRec.bsdf)
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

  calcF0 (etai: number, etao: number) {
    const F0Nc = ((etai - etao) / (etai + etao)) ** 2
    const invColor = new Vector3(1, 1, 1).sub(this.color)
    return invColor.mult(F0Nc)
  }

  occurTotalRefl (v: Vector3, normal: Vector3, relEta: number) {
    const sinThetaIn = (1 - normal.dot(v) ** 2) ** (1/2)
    const sinThetaOut = relEta * sinThetaIn
    return sinThetaOut > 1
  }

  sampleDirection(r: Ray, hRec: HitRecord, eta: number) {
    const v = r.direction.mult(-1).normalized()
    const etai = hRec.normalInverted ? this.eta : eta
    const etao = hRec.normalInverted ? eta : this.eta
    const relEta = etai / etao

    /* fresnel */
    const F0 = this.calcF0(etai, etao)
    const fresnel = this.schlickFresnel(hRec.normal.dot(v), F0)
    const probRefl = RGB2Luminance(fresnel)

    const totalRefl = this.occurTotalRefl(v, hRec.normal, relEta)

    if (totalRefl || Math.random() < probRefl) {
      return reflect(v, hRec.normal)
    } else {
      return refract(v, hRec.normal, relEta)
    }
  }

  newSample (uv: Vector2, v: Vector3, l: Vector3, normal: Vector3, normalInverted: boolean, eta: number) {
    const rec = new MaterialSampleRecord()
    const etai = normalInverted ? this.eta : eta
    const etao = normalInverted ? eta : this.eta
    const relEta = etai / etao

    /* fresnel */
    const F0 = this.calcF0(etai, etao)
    const fresnel = this.schlickFresnel(normal.dot(v), F0)
    const probRefl = RGB2Luminance(fresnel)

    if (reflect(v, normal).sub(l).magSq() < 1e-8) {
      rec.bsdf = fresnel.div(l.dot(normal))
      const totalRefl = this.occurTotalRefl(v, normal, relEta)
      rec.pdf = totalRefl ? 1 : 1 * probRefl
    }
    else if (refract(v, normal, relEta).sub(l).magSq() < 1e-8) {
      const fresnelTrans = new Vector3(1, 1, 1).sub(fresnel)
      rec.bsdf = fresnelTrans.mult((1 / relEta) ** 2 / l.dot(normal.mult(-1)))
      rec.pdf = 1 * (1 - probRefl)
    }
    else {
      rec.bsdf = new Vector3(0, 0, 0)
      rec.pdf = 0
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
  radiance: number
  constructor(color: Vector3, emittance: number) {
    super()
    this.color = color
    this.radiance = emittance
  }

  sampleDirection () {
    return new Vector3(0, 0, 0)
  }

  newSample () {
    const rec = new MaterialSampleRecord()
    rec.finishTrace = true
    rec.bsdf = new Vector3(0, 0, 0)
    rec.pdf = 1
    rec.Le = this.color.mult(this.radiance)
    return rec
  }
}

export {
  MaterialSampleRecord, Material, DiffuseBRDF,
  MetalBRDF, MicrofacetSpecularBRDF,
  DiffuseSpecularBRDF, GrassBSDF, SimpleEmitter
}