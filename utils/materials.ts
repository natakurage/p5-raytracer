import { Ray } from "./ray"
import { randomOnHemiSphere, randomOnUnitSphere, saturate } from "./utils"
import { HitRecord } from "./primitives"
import { Texture } from "./textures"
import { Vector3 } from "./vector"

class MaterialSampleRecord {
  brdf!: Vector3
  l!: Vector3
  pdf!: number
  fresnel!: Vector3 | null
  Le!: Vector3
}

const reflect = (vec: Vector3, normal: Vector3) => {
  return normal.mult(2 * normal.dot(vec)).sub(vec)
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

  newSample (r: Ray, hRec: HitRecord) {
    throw new Error("not implemented")
    return new MaterialSampleRecord()
  }
}

class DiffuseBRDF extends Material {
  diffuseColor: Texture

  constructor(diffuseColor: Texture) {
    super()
    this.diffuseColor = diffuseColor
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
    const diffuseColor = this.diffuseColor.sample(hRec.uv)
    rec.brdf = diffuseColor.div(Math.PI)
    rec.pdf = rec.l.dot(hRec.normal) / Math.PI
    return rec
  }
}

class MetalBRDF extends Material {
  metalColor: Texture

  constructor(metalColor: Texture) {
    super()
    this.metalColor = metalColor
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    const v = r.direction.normalized().mult(-1)
    rec.l = reflect(v, hRec.normal)
    const metalColor = this.metalColor.sample(hRec.uv)
    rec.brdf = metalColor.div(rec.l.dot(hRec.normal))
    rec.pdf = 1
    return rec
  }
}

class MicrofacetSpecularBRDF extends Material {
  F0: Texture
  alpha: number

  constructor(F0: Texture, roughness: number) {
    super()
    this.F0 = F0
    this.alpha = roughness ** 2
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
    rec.brdf = rec.fresnel.mult(ndf * geo).div(
      Math.max(4 * rec.l.dot(hRec.normal) * v.dot(hRec.normal), 1e-6)
    )
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

class DiffuseSpecularBRDF extends Material {
  diffuseBRDF: DiffuseBRDF
  specularBRDF: MicrofacetSpecularBRDF

  constructor(baseColor: Texture, roughness: number) {
    super()
    this.diffuseBRDF = new DiffuseBRDF(baseColor)
    this.specularBRDF = new MicrofacetSpecularBRDF(baseColor, roughness)
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    const diffRec = this.diffuseBRDF.newSample(r, hRec)
    const specRec = this.specularBRDF.newSample(r, hRec)
    if (specRec.fresnel === null) {
      throw Error("internal error: specRec does not contain fresnel")
    }
    const oneMinusF = specRec.fresnel.mult(-1).add(new Vector3(1, 1, 1))
    const fresnelLuminance = RGB2Luminance(specRec.fresnel)
    const probSpec = 1 / (2 - fresnelLuminance)
    if (Math.random() < probSpec) {
      rec.l = specRec.l
    } else {
      rec.l = diffRec.l
    }
    rec.pdf = (diffRec.pdf * (1 - fresnelLuminance) + specRec.pdf) / (2 - fresnelLuminance)
    rec.brdf = diffRec.brdf.mult(oneMinusF).add(specRec.brdf)
    return rec
  }
}

class NormalDiffuseBRDF extends Material {

  constructor() {
    super()
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    const diffuseColor = hRec.binormal.add(new Vector3(1, 1, 1)).mult(0.5)
    rec.brdf = diffuseColor.div(Math.PI)
    rec.pdf = 1 / (2 * Math.PI)
    let l = randomOnUnitSphere()
    let lnDot = hRec.normal.dot(l)
    if (lnDot < 0) {
      l = l.mult(-1)
    }
    rec.l = l
    return rec
  }
}

class NormalMetalBRDF extends Material {

  constructor() {
    super()
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    const v = r.direction.normalized().mult(-1)
    rec.l = reflect(v, hRec.normal)
    const metalColor = hRec.normal.add(new Vector3(1, 1, 1)).mult(0.5)
    rec.brdf = metalColor.div(rec.l.dot(hRec.normal))
    rec.pdf = 1
    return rec
  }
}

class SimpleEmitter extends Material {
  color: Vector3
  emittance: number
  constructor(color: Vector3, emittance: number) {
    super()
    this.color = color
    this.emittance = emittance
  }

  newSample (r: Ray, hRec: HitRecord) {
    const rec = new MaterialSampleRecord()
    hRec.deletePath = true
    rec.brdf = new Vector3(0, 0, 0)
    rec.pdf = 1
    rec.Le = this.color.mult(this.emittance)
    return rec
  }
}

export {
  MaterialSampleRecord, Material, DiffuseBRDF,
  MetalBRDF, MicrofacetSpecularBRDF, NormalDiffuseBRDF, NormalMetalBRDF,
  DiffuseSpecularBRDF, SimpleEmitter
}