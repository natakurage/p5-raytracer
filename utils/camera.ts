import p5Types from 'p5'
import { Ray } from './ray'

class Camera {
  p5: p5Types
  pos: p5Types.Vector
  forward: p5Types.Vector
  right: p5Types.Vector
  up: p5Types.Vector
  focalLength: number
  sensorSize: number
  
  constructor(
    p5: p5Types, pos: p5Types.Vector, forward: p5Types.Vector,
    focalLength: number,
    globalUp? : p5Types.Vector, sensorSize = 0.036) {
    globalUp = globalUp ?? p5.createVector(0, 1, 0)
    this.p5 = p5
    this.pos = pos
    this.forward = forward.normalize()
    this.right = this.forward.copy().cross(globalUp).normalize()
    this.up = this.right.copy().cross(this.forward).normalize()
    this.focalLength = focalLength
    this.sensorSize = sensorSize
  }

  generateRay = (j: number, i: number, width: number, height: number) => {
    // 2 * nx - 1,
    // 2 * ny - 1,
    // 0
    // forward = (0, 0, -1)
    // right = (1, 0, 0)
    // up = ()
    const aspectRatio = width / height
    const sensorX = this.sensorSize * aspectRatio
    const sensorY = this.sensorSize
    const dx = sensorX / width
    const dy = sensorY / height
    const nx = j * dx
    const ny = i * dy
    const screenCenter = this.forward.copy().mult(this.focalLength).add(this.pos)
    const screenOrigin = screenCenter.copy().sub(
      this.right.copy().mult(0.5 * sensorX)
    ).add(this.up.copy().mult(0.5 * sensorY))
    const pixelOrigin = screenOrigin.copy().add(
      this.right.copy().mult(nx)).sub(this.up.copy().mult(ny))
    const randX = this.p5.random()
    const randY = this.p5.random()
    const sampleNoise = this.right.copy().mult(dx * randX).sub(
      this.up.copy().mult(dy * randY)
    )    
    return new Ray(this.pos, pixelOrigin.copy().add(sampleNoise).sub(this.pos))
  }

}

export { Camera }