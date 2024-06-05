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
    let validSamples = 0
    for (let sample = 0; sample < nSamples; sample++) {
      // const screen_pos = p5.createVector(
      //   2 * (j / p5.width) - 1,
      //   2 * (1 - i / p5.height) - 1,
      //   0
      // ).add(p5.createVector(
      //   p5.random(-0.5, 0.5) * 2 / p5.width,
      //   p5.random(-0.5, 0.5) * 2 / p5.height,
      //   0
      // ))
      // let ray = new rt.ray.Ray(scene.eyePos, (p5Types.Vector.sub(screen_pos, scene.eyePos)))
      let ray = scene.camera.generateRay(j, i, p5.width, p5.height)

      let depth = 0
      const max_depth = 10
      const ray_color = p5.createVector(1, 1, 1)
      while (depth < max_depth) {
        const rec = scene.hit(ray)
        if (rec.success) {
          let lnDot = p5Types.Vector.dot(rec.normal, rec.l)
          ray_color.mult(rec.brdf.mult(lnDot).div(rec.pdf))
          ray_color.add(rec.Le)
          if (rec.deletePath) {
            pixelColor.add(scene.ambientColor.copy().mult(ray_color))
            break
          }
          ray = new Ray(rec.pos, rec.l)
        } else {
          pixelColor.add(scene.ambientColor.copy().mult(ray_color))
          validSamples++
          break
        }
        depth++
      }
    }
    if (validSamples !== 0) {      
      pixelColor.div(validSamples)
    }
    return pixelColor
  }
}

export { Renderer }