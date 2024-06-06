import p5Types from 'p5'
import { Scene } from './scene'
import { Ray } from './ray'

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
    const pixelColor = p5.createVector(0, 0, 0)
    for (let sample = 0; sample < nSamples; sample++) {
      let ray = scene.camera.generateRay(j, i, p5.width, p5.height)
      const max_depth = 10
      pixelColor.add(this.trace(p5, ray, scene, max_depth))
    }
    return pixelColor.div(nSamples)
  }

  trace = (p5: p5Types, ray: Ray, scene: Scene,  max_depth: number) => {
    const rayColor = p5.createVector(0, 0, 0)
    const throughput = p5.createVector(1, 1, 1)
    let depth = 0
    while (depth < max_depth) {
      const rec = scene.hit(ray)
      if (rec.success) {
        if (rec.Le) {
          rayColor.add(rec.Le.copy().mult(throughput))
        }
        if (rec.deletePath) {
          break
        }
        let lnDot = p5Types.Vector.dot(rec.normal, rec.l)
        throughput.mult(rec.brdf).mult(lnDot).div(rec.pdf)
        ray = new Ray(rec.pos, rec.l)
      } else {
        rayColor.add(scene.ambientColor.copy().mult(throughput))
        break
      }
      depth++
    }
    return rayColor
  }
}

export { Renderer }