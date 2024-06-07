import { Vector2, Vector3 } from './vector'

class Texture {
  constructor() {
  }

  sample (uv: Vector2) {
    throw new Error("not implemented")
    return new Vector3(0, 0, 0)
  }
}

class UniformColorTexture extends Texture {
  color: Vector3
  constructor(color: Vector3) {
    super()
    this.color = color
  }

  sample (uv: Vector2) {
    return this.color
  }
}

class CheckerTexture extends Texture {
  color1: Vector3
  color2: Vector3
  scale: number
  constructor(color1: Vector3, color2: Vector3, scale: number) {
    super()
    this.color1 = color1
    this.color2 = color2
    this.scale = scale
  }

  sample (uv: Vector2) {
    const mod = (n: number , d: number) => ((n % d) + d) % d
    if ((mod(this.scale * uv.x, 1) < 0.5) === (mod(this.scale * uv.y, 1) < 0.5)) {
      return this.color1
    }
    return this.color2
  }
}

export { Texture, UniformColorTexture, CheckerTexture }