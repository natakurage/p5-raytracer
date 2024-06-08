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

  render (p5: p5Types, scene: Scene, nSamples?: number) {
    nSamples = nSamples ?? this.nSamples

    console.log("render started")
    
    for (let i = 0; i < p5.height; i++) {
      for (let j = 0; j < p5.width; j++) {
        const pixelColor = this.renderPixel(p5, i, j, nSamples, scene)
        p5.set(j, i, this.toP5Color(pixelColor))
      }
      if (i !== 0 && i % 50 === 0) {
        console.log(`rendered ${i}th scan line...`)
      }
    }
    p5.updatePixels()
    console.log("render finished!")
  }

  renderProgressive(p5: p5Types, linearPixels: Vector3[], scene: Scene, steps: number, totalSteps: number) {
    if (linearPixels.length === 0) {
      for (let i = 0; i < p5.width * p5.height; i++) {
        linearPixels.push(new Vector3(0, 0, 0))
      }
    }
    for (let i = 0; i < p5.height; i++) {
      for (let j = 0; j < p5.width; j++) {
        const pixelColor = this.renderPixel(p5, i, j, steps, scene)
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

  renderPixel (p5: p5Types, i: number, j: number, nSamples: number, scene: Scene) {
    let pixelColor = new Vector3(0, 0, 0)
    for (let sample = 0; sample < nSamples; sample++) {
      let ray = scene.camera.generateRay(j, i, p5.width, p5.height)
      const max_depth = 10
      const traced = this.trace(ray, scene, max_depth)
      // console.log(`${pixelColor.toString()}と${traced.toString()}を足す直前`)
      const added = pixelColor.add(traced)
      // console.log(added.toString())
      pixelColor = added
    }
    return pixelColor.div(nSamples)
  }

  trace (ray: Ray, scene: Scene,  max_depth: number) {
    // const test = new Vector3(1, 1, 1)
    // // console.log(test.x, test.y, test.z)
    // return test
    let rayColor = new Vector3(0, 0, 0)
    let throughput = new Vector3(1, 1, 1)
    let depth = 0
    while (depth < max_depth) {
      const rec = scene.hit(ray)
      if (rec.success) {
        if (rec.Le) {
          rayColor = rayColor.add(rec.Le.mult(throughput))
        }
        if (rec.deletePath) {
          break
        }
        let lnDot = rec.normal.dot(rec.l)
        throughput = throughput.mult(rec.brdf).mult(lnDot).div(rec.pdf)
        ray = new Ray(rec.pos, rec.l)
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