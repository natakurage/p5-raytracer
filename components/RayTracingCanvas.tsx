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
  let renderBtn: p5Types.Element
  let renderBtnShown = true

  const preload = (p5: p5Types) => {
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    renderBtn = p5.createButton("Click to render").position(10, 10)
    renderBtn.mouseClicked(() => renderer.render(p5, scene))

    const xSize = 500
    const ySize = 500
    p5.createCanvas(xSize, ySize).parent(canvasParentRef)
    p5.fill("gray")

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

    renderer = new rt.renderer.Renderer(50)
  }

  const draw = (p5: p5Types) => {

  }

  // const windowResized = (p5: p5Types) => {
  //   p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  // }

  const mouseClicked = (p5: p5Types) => {
    if (renderBtnShown) {
      renderBtn.hide()
    } else {
      renderBtn.show()
    }
    renderBtnShown = !renderBtnShown
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
