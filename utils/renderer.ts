import p5Types from 'p5'
import { Scene } from './scene'
import { Ray } from './ray'
import { Vector3 } from './vector'

class Renderer {
  nSamples: number
  
  constructor(nSamples: number) {
    this.nSamples = nSamples
  }

  render = (p5: p5Types, scene: Scene, nSamples?: number) => {
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

  renderPixel = (p5: p5Types, i: number, j: number, nSamples: number, scene: Scene) => {
    const pixelColor = new Vector3(0, 0, 0)
    for (let sample = 0; sample < nSamples; sample++) {
      let ray = scene.camera.generateRay(j, i, p5.width, p5.height)
      const max_depth = 10
      pixelColor.add(this.trace(ray, scene, max_depth))
    }
    return pixelColor.div(nSamples)
  }

  trace = (ray: Ray, scene: Scene,  max_depth: number) => {
    const rayColor = new Vector3(0, 0, 0)
    const throughput = new Vector3(1, 1, 1)
    let depth = 0
    while (depth < max_depth) {
      const rec = scene.hit(ray)
      if (rec.success) {
        if (rec.Le) {
          rayColor.add(rec.Le.mult(throughput))
        }
        if (rec.deletePath) {
          break
        }
        let lnDot = rec.normal.dot(rec.l)
        throughput.mult(rec.brdf).mult(lnDot).div(rec.pdf)
        ray = new Ray(rec.pos, rec.l)
      } else {
        rayColor.add(scene.ambientColor.mult(throughput))
        break
      }
      depth++
    }
    return rayColor
  }
}

export { Renderer }