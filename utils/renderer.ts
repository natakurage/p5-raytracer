import p5Types from 'p5'
import { Scene } from './scene'
import { Ray } from './ray'
import { Vector3 } from './vector'
import { saturate } from './utils'

class Renderer {
  nSamples: number
  gamma = 2.2
  
  constructor(nSamples: number) {
    this.nSamples = nSamples
  }

  toP5Color(color: Vector3) {
    const r = saturate(Math.pow(color.x, this.gamma))
    const g = saturate(Math.pow(color.y, this.gamma))
    const b = saturate(Math.pow(color.z, this.gamma))
    return [
      255 * r,
      255 * g,
      255 * b,
      255
    ]
  }

  render (p5: p5Types, scene: Scene, nSamples?: number, useNEE = false) {
    nSamples = nSamples ?? this.nSamples

    console.log("render started")
    
    for (let i = 0; i < p5.height; i++) {
      for (let j = 0; j < p5.width; j++) {
        const pixelColor = this.renderPixel(p5, i, j, nSamples, scene, useNEE = false)
        p5.set(j, i, this.toP5Color(pixelColor))
      }
      if (i !== 0 && i % 50 === 0) {
        console.log(`rendered ${i}th scan line...`)
      }
    }
    p5.updatePixels()
    console.log("render finished!")
  }

  renderProgressive(p5: p5Types, linearPixels: Vector3[], scene: Scene, steps: number, totalSteps: number, useNEE = false) {
    if (linearPixels.length === 0) {
      for (let i = 0; i < p5.width * p5.height; i++) {
        linearPixels.push(new Vector3(0, 0, 0))
      }
    }
    for (let i = 0; i < p5.height; i++) {
      for (let j = 0; j < p5.width; j++) {
        const pixelColor = this.renderPixel(p5, i, j, steps, scene, useNEE)
        const currentColor = linearPixels[i * p5.width + j]
        const nextColor = currentColor.mult(totalSteps).add(
          pixelColor.mult(steps)).div(totalSteps + steps)
        linearPixels[i * p5.width + j] = nextColor
        p5.set(j, i, this.toP5Color(nextColor))
      }
    }
    p5.updatePixels()
    console.log(totalSteps + 1 + "th step rendered")
    return linearPixels
  }

  renderPixel (p5: p5Types, i: number, j: number, nSamples: number, scene: Scene, useNEE = false) {
    let pixelColor = new Vector3(0, 0, 0)
    for (let sample = 0; sample < nSamples; sample++) {
      let ray = scene.camera.generateRay(j, i, p5.width, p5.height)
      const max_depth = 10
      const traced = this.trace(ray, scene, max_depth, useNEE)
      // console.log(`${pixelColor.toString()}と${traced.toString()}を足す直前`)
      const added = pixelColor.add(traced)
      // console.log(added.toString())
      pixelColor = added
    }
    return pixelColor.div(nSamples)
  }

  trace (ray: Ray, scene: Scene,  max_depth: number, useNEE: boolean) {
    let rayColor = new Vector3(0, 0, 0)
    let throughput = new Vector3(1, 1, 1)
    let eta = 1
    let depth = 0
    while (depth < max_depth) {
      const hRec = scene.hit(ray)
      if (hRec.success) {
        const v = ray.direction.mult(-1).normalized()
        const l = hRec.material.sampleDirection(ray, hRec, eta)
        const mRec = hRec.material.newSample(hRec.uv, v, l, hRec.normal, hRec.normalInverted, eta)
        if (mRec.Le) {
          rayColor = rayColor.add(mRec.Le.mult(throughput))
        }
        if (mRec.finishTrace) {
          break
        }
        /* sample emitter */
        if (useNEE && scene.hasEmitter()) {
          const emitter = scene.selectEmitter()
          const ERec = emitter.randomSample()
          const shadowRay = new Ray(hRec.pos, ERec.pos.sub(hRec.pos).normalized())
          const distance = ERec.pos.sub(hRec.pos).mag()
          if (!scene.hit(shadowRay, distance - 0.001).success) {
            const cos1 = hRec.normal.dot(shadowRay.direction)
            const cos2 = Math.abs(ERec.normal.dot(shadowRay.direction.mult(-1)))
            const G = cos1 * cos2 / distance ** 2
            const pdf = 1 / scene.sumSurfaceArea
            const shadowL = shadowRay.direction.normalized()
            const shadowRec = hRec.material.newSample(hRec.uv, v, shadowL, hRec.normal, hRec.normalInverted, eta)
            const value = shadowRec.bsdf.mult(ERec.Le).mult(G / pdf)
            rayColor = rayColor.add(value.mult(throughput))
          }
        }
        const normal = mRec.isBtdf ? hRec.normal.mult(-1) : hRec.normal
        let lnDot = normal.dot(l)
        throughput = throughput.mult(mRec.bsdf).mult(lnDot).div(mRec.pdf)
        ray = new Ray(hRec.pos, l)
      } else {
        rayColor = rayColor.add(scene.ambientColor.mult(throughput))
        break
      }
      depth++
    }
    return rayColor
  }
}

export { Renderer }