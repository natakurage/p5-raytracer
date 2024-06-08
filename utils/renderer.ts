import p5Types from 'p5'
import { Scene } from './scene'
import { Ray } from './ray'
import { Vector3 } from './vector'

class Renderer {
  nSamples: number
  
  constructor(nSamples: number) {
    this.nSamples = nSamples
  }

  readPixel(pixels: number[], i: number, j: number, width: number) {
    return pixels.slice((i * width + j) * 4, (i * width + j) * 4 + 4)
  }

  render (p5: p5Types, scene: Scene, nSamples?: number) {
    nSamples = nSamples ?? this.nSamples

    console.log("render started")
    
    for (let i = 0; i < p5.height; i++) {
      for (let j = 0; j < p5.width; j++) {
        const pixelColor = this.renderPixel(p5, i, j, nSamples, scene)
        p5.set(j, i, p5.color(
          255 * pixelColor.x,
          255 * pixelColor.y,
          255 * pixelColor.z))
      }
      if (i !== 0 && i % 50 === 0) {
        console.log(`rendered ${i}th scan line...`)
      }
    }
    p5.updatePixels()
    console.log("render finished!")
  }

  renderProgressive(p5: p5Types, scene: Scene, steps: number, totalSteps: number) {
    const currentPixels = p5.get()
    currentPixels.loadPixels()
    for (let i = 0; i < p5.height; i++) {
      for (let j = 0; j < p5.width; j++) {
        const pixelColor = this.renderPixel(p5, i, j, steps, scene)
        const currentColor = this.readPixel(currentPixels.pixels, i, j, p5.width)
        p5.set(j, i, p5.color(
          (currentColor[0] * totalSteps + 255 * pixelColor.x * steps) / (totalSteps + steps),
          (currentColor[1] * totalSteps + 255 * pixelColor.y * steps) / (totalSteps + steps),
          (currentColor[2] * totalSteps + 255 * pixelColor.z * steps) / (totalSteps + steps),
        ))
      }
    }
    p5.updatePixels()
    console.log(totalSteps + 1 + "th step rendered")
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