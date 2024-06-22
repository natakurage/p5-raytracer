import { HitRecord, Quad, Shape, Sphere } from './primitives';
import { Ray } from './ray';
import { Camera } from './camera';
import { Vector3 } from './vector';
import { CheckerTexture, UniformColorTexture } from './textures';
import { DiffuseBRDF, DiffuseSpecularBRDF, GrassBSDF, SimpleEmitter } from './materials';
import { AreaLight, Emitter, PointLight } from './emitters';

class Scene {
  objects: Array<Shape>
  emitters: Array<Emitter>
  camera: Camera
  ambientColor: Vector3
  
  constructor(objects: Array<Shape>, emitters: Array<Emitter>, camera: Camera, ambientColor: Vector3) {
    this.objects = objects
    this.emitters = emitters
    this.camera = camera
    this.ambientColor = ambientColor
  }

  hit (r: Ray, maxt = Infinity) {
    let min_t = Infinity
    let closest_rec: HitRecord | null = null
    for (let obj of this.objects) {
      const rec = obj.hit(r, maxt)
      if (rec.success && rec.t < min_t) {
        min_t = rec.t
        closest_rec = rec
      }
    }
    if (closest_rec === null) {
      closest_rec = new HitRecord()
      closest_rec.success = false
    }
    return closest_rec
  }

  hasEmitter () {
    return this.emitters.length !== 0
  }

  selectEmitter () {
    const idx = Math.floor(Math.random() * this.emitters.length)
    return this.emitters[idx]
  }

  get sumSurfaceArea () {
    return this.emitters.map(e => e.surfaceArea()).reduce((a, b) => a + b)
  }
}

const defaultScene = () => {
  const camera = new Camera(
    new Vector3(0, 0, 10),
    new Vector3(0, 0, -1).normalized(), 0.1
  )
  const tex1 = new CheckerTexture(
    new Vector3(0.7, 0.5, 0.5),
    new Vector3(0.8, 0.8, 0.8),
    2.5
  )
  const tex2 = new UniformColorTexture(
    new Vector3(0.5, 0.5, 0.5)
  )
  const mat1 = new GrassBSDF(new Vector3(1, 1, 1), 1.4)
  const mat2 = new DiffuseSpecularBRDF(
    tex2,  0.01
  )
  const mat3 = new DiffuseBRDF(tex1)
  const light = new SimpleEmitter(
    new Vector3(1, 1, 1), 0
  )
  const ambColor = new Vector3(0.5, 0.5, 0.5)
  return new Scene([
    // new Sphere(
    //   new Vector3(0.7, 0.7, 0.7), 0.1, light),
    // new Quad(
    //   new Vector3(0, -1, -1),
    //   new Vector3(2, 0, 0),
    //   new Vector3(0, 2, 0),
    //   mat3
    // ),
    // new Quad(
    //   new Vector3(-1, -1, 11),
    //   new Vector3(2, 0, 0),
    //   new Vector3(0, 2, 0),
    //   light
    // ),
    new Sphere(
      new Vector3(0, 0, 0), 1, mat3),
    new Sphere(
      new Vector3(0, -101, 0), 100, mat2)
  ], [], camera, ambColor)
} 

const cornellScene = () => {
  const camera = new Camera(
    new Vector3(0, 1, 8),
    new Vector3(0, 0, -1).normalized(), 0.1
  )
  const redTex = new UniformColorTexture(
    new Vector3(0.8, 0.1, 0.1)
  )
  const greenTex = new UniformColorTexture(
    new Vector3(0.1, 0.8, 0.1)
  )
  const whiteTex = new UniformColorTexture(
    new Vector3(0.8, 0.8, 0.8)
  )
  const tex1 = new CheckerTexture(
    new Vector3(0.7, 0.5, 0.5),
    new Vector3(0.8, 0.8, 0.8),
    5
  )
  const tex2 = new UniformColorTexture(
    new Vector3(0.5, 0.5, 0.5)
  )
  const leftMat = new DiffuseBRDF(redTex)
  const rightMat = new DiffuseBRDF(greenTex)
  const wallMat = new DiffuseBRDF(whiteTex)
  const lightMat = new SimpleEmitter(new Vector3(1, 1, 1), 100)
  const mat1 = new DiffuseBRDF(tex1)
  const mat2 = new DiffuseSpecularBRDF(tex2, 0.1)
  const ambColor = new Vector3(0.0, 0.0, 0.0)
  return new Scene([
    new Quad(
      new Vector3(-1, 0, 1),
      new Vector3(0, 0, -2),
      new Vector3(0, 2, 0), leftMat
    ),
    new Quad(
      new Vector3(1, 0, 1),
      new Vector3(0, 0, -2),
      new Vector3(0, 2, 0), rightMat
    ),
    new Quad(
      new Vector3(-1, 0, 1),
      new Vector3(2, 0, 0),
      new Vector3(0, 0, -2), wallMat
    ),
    new Quad(
      new Vector3(-1, 0, -1),
      new Vector3(2, 0, 0),
      new Vector3(0, 2, 0), wallMat
    ),
    new Quad(
      new Vector3(-1, 2, 1),
      new Vector3(2, 0, 0),
      new Vector3(0, 0, -2), wallMat
    ),
    // new Quad(
    //   new Vector3(-0.3, 1.99, 0.3),
    //   new Vector3(0.6, 0, 0),
    //   new Vector3(0, 0, -0.6), lightMat
    // ),
    new Sphere(
      new Vector3(-0.5, 0.3, 0), 0.3, mat1),
    // new Sphere(
    //   new Vector3(0.6, 0.2, -0.3), 0.2, mat2)
  ], [
    new AreaLight(
      new Vector3(-0.3, 1.99, 0.3),
      new Vector3(0.6, 0, 0),
      new Vector3(0, 0, -0.6),
      30, new Vector3(1, 1, 1))
  ], camera, ambColor)
} 

const exampleScenes = { defaultScene, cornellScene }

export { Scene, exampleScenes }