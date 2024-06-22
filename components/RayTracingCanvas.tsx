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
  let totalSteps = 0
  let useNEE = true
  let rendering = false
  let linearPixels: rt.vector.Vector3[] = []

  const preload = (p5: p5Types) => {
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    renderBtn = p5.createButton("Click to render").position(10, 10)
    renderBtn.mouseClicked(() => {
      rendering = !rendering
    })

    const xSize = 500
    const ySize = 500
    p5.createCanvas(xSize, ySize).parent(canvasParentRef)

    scene = rt.scene.exampleScenes.cornellScene()

    renderer = new rt.renderer.Renderer(50)
  }

  const draw = (p5: p5Types) => {
    if (rendering) {
      linearPixels = renderer.renderProgressive(p5, linearPixels, scene, 1, totalSteps, useNEE)
      totalSteps++
    }
  }

  // const windowResized = (p5: p5Types) => {
  //   p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  // }

  const mouseClicked = (p5: p5Types, event?: UIEvent) => {
    if (p5.mouseX < 50 || p5.mouseY < 50) {
      return
    }
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
