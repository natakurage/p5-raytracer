"use client"

import dynamic from 'next/dynamic'
import p5Types from 'p5'
import * as rt from "../utils/raytracing"

const Sketch = dynamic(() => import('react-p5').then((mod) => mod.default), {
  ssr: false,
})

export const RayTracingCanvas = () => {

  let scene: rt.scene.Scene
  let renderer: rt.renderer.Renderer

  const preload = (p5: p5Types) => {
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    const test1 = new rt.vector.Vector3(1, 2, 3)
    const test2 = new rt.vector.Vector3(4, 5, 6)

    const xSize = 500
    const ySize = 500
    p5.createCanvas(xSize, ySize).parent(canvasParentRef)
    p5.fill("gray")
    p5.text("click to render", p5.width / 2, p5.height / 2)

    const camera = new rt.camera.Camera(
      new rt.vector.Vector3(0, 0, 10),
      new rt.vector.Vector3(0, 0, -1).normalized(), 0.1
    )
    const tex1 = new rt.texture.CheckerTexture(
      new rt.vector.Vector3(0.7, 0.5, 0.5),
      new rt.vector.Vector3(0.8, 0.8, 0.8),
      5
    )
    const tex2 = new rt.texture.UniformColorTexture(
      new rt.vector.Vector3(0.5, 0.5, 0.5)
    )
    const mat1 = new rt.materials.DiffuseBRDF(tex1)
    const mat2 = new rt.materials.DiffuseSpecularBRDF(
      tex2,  0.2
    )
    const light = new rt.materials.SimpleEmitter(
      new rt.vector.Vector3(1, 1, 1), 1
    )
    const ambColor = new rt.vector.Vector3(0.5, 0.5, 0.5)
    scene = new rt.scene.Scene([
      new rt.primitives.Sphere(
        new rt.vector.Vector3(0.7, 0.7, 0.7), 0.1, light),
      new rt.primitives.Sphere(
        new rt.vector.Vector3(0, 0, 0), 1, mat1),
      new rt.primitives.Sphere(
        new rt.vector.Vector3(0, -101, 0), 100, mat2)
    ], camera, ambColor)

    renderer = new rt.renderer.Renderer(1)
  }

  const draw = (p5: p5Types) => {
    
  }

  // const windowResized = (p5: p5Types) => {
  //   p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  // }

  const mouseClicked = (p5: p5Types) => {
    renderer.render(p5, scene)
  }

  return (
    <Sketch
      preload={preload}
      setup={setup}
      draw={draw}
      // windowResized={windowResized}
      mouseClicked={mouseClicked}
    />
  )
}

export default RayTracingCanvas
