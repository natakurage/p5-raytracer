import { HitRecord, Sphere } from './primitives';
import { Ray } from './ray';
import { Camera } from './camera';
import { Vector3 } from './vector';

class Scene {
  objects: Array<Sphere>
  camera: Camera
  ambientColor: Vector3
  
  constructor(objects: Array<Sphere>, camera: Camera, ambientColor: Vector3) {
    this.objects = objects
    this.camera = camera
    this.ambientColor = ambientColor
  }

  hit (r: Ray) {
    let min_t = Infinity
    let closest_rec: HitRecord | null = null
    for (let obj of this.objects) {
      const rec = obj.hit(r)
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
}

export { Scene }