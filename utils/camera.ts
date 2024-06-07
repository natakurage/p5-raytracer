import { Ray } from './ray'
import { Vector3 } from './vector'

class Camera {
  pos: Vector3
  forward: Vector3
  right: Vector3
  up: Vector3
  focalLength: number
  sensorSize: number
  
  constructor(
    pos: Vector3, forward: Vector3,
    focalLength: number,
    globalUp? : Vector3, sensorSize = 0.036) {
    globalUp = globalUp ?? new Vector3(0, 1, 0)
    this.pos = pos
    this.forward = forward.normalized()
    this.right = this.forward.cross(globalUp).normalized()
    this.up = this.right.cross(this.forward).normalized()
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
    const screenCenter = this.forward.mult(this.focalLength).add(this.pos)
    const screenOrigin = screenCenter.sub(
      this.right.mult(0.5 * sensorX)
    ).add(this.up.mult(0.5 * sensorY))
    const pixelOrigin = screenOrigin.add(
      this.right.mult(nx)).sub(this.up.mult(ny))
    const randX = Math.random()
    const randY = Math.random()
    const sampleNoise = this.right.mult(dx * randX).sub(
      this.up.mult(dy * randY)
    )    
    return new Ray(this.pos, pixelOrigin.add(sampleNoise).sub(this.pos))
  }

}

export { Camera }