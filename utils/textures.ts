import p5Types from 'p5'

class Texture {
  p5: p5Types
  constructor(p5: p5Types) {
    this.p5 = p5
  }

  sample = (uv: p5Types.Vector) => {
    throw new Error("not implemented")
    return this.p5.createVector(0, 0, 0)
  }
}

class UniformColorTexture extends Texture {
  color: p5Types.Vector
  constructor(p5: p5Types, color: p5Types.Vector) {
    super(p5)
    this.color = color
  }

  sample = (uv: p5Types.Vector) => {
    return this.color.copy()
  }
}

class CheckerTexture extends Texture {
  color1: p5Types.Vector
  color2: p5Types.Vector
  scale: number
  constructor(p5: p5Types, color1: p5Types.Vector, color2: p5Types.Vector, scale: number) {
    super(p5)
    this.color1 = color1
    this.color2 = color2
    this.scale = scale
  }

  sample = (uv: p5Types.Vector) => {
    const mod = (n: number , d: number) => ((n % d) + d) % d
    if ((mod(this.scale * uv.x, 1) < 0.5) === (mod(this.scale * uv.y, 1) < 0.5)) {
      return this.color1.copy()
    }
    return this.color2.copy()
  }
}

export { Texture, UniformColorTexture, CheckerTexture }