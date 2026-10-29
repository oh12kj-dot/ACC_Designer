'use client';
import Konva from 'konva';
import { useLayoutEffect,useRef,type RefObject } from 'react';
interface Props { canvasRef:RefObject<HTMLCanvasElement|null>;paint:(ctx:CanvasRenderingContext2D)=>void;onPointerDown:(e:React.PointerEvent<HTMLCanvasElement>)=>void;onPointerMove:(e:React.PointerEvent<HTMLCanvasElement>)=>void;onPointerUp:(e:React.PointerEvent<HTMLCanvasElement>)=>void;onPointerCancel:()=>void }
/** Konva owns scene lifetime and frame batching. Domain rendering stays independent of Konva. */
export default function EditorStage(props:Props){
 const container=useRef<HTMLDivElement>(null),latest=useRef(props),layerRef=useRef<Konva.Layer|null>(null);latest.current=props;
 useLayoutEffect(()=>{if(!container.current)return;const stage=new Konva.Stage({container:container.current,width:900,height:700,listening:false});const layer=new Konva.Layer({listening:false});layer.getCanvas().setPixelRatio(1);stage.add(layer);layerRef.current=layer;
  const canvas=layer.getNativeCanvasElement();canvas.setAttribute('aria-label','デザインキャンバス');canvas.tabIndex=0;canvas.style.width='100%';canvas.style.height='100%';canvas.style.touchAction='none';stage.getContent().style.width='100%';stage.getContent().style.height='100%';props.canvasRef.current=canvas;
  layer.add(new Konva.Shape({listening:false,sceneFunc:ctx=>latest.current.paint(ctx._context)}));
  const down=(e:PointerEvent)=>latest.current.onPointerDown(e as unknown as React.PointerEvent<HTMLCanvasElement>),move=(e:PointerEvent)=>latest.current.onPointerMove(e as unknown as React.PointerEvent<HTMLCanvasElement>),up=(e:PointerEvent)=>latest.current.onPointerUp(e as unknown as React.PointerEvent<HTMLCanvasElement>),cancel=()=>latest.current.onPointerCancel();
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);layer.draw();
  return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);props.canvasRef.current=null;layerRef.current=null;stage.destroy();};
 },[props.canvasRef]);
 useLayoutEffect(()=>{layerRef.current?.batchDraw();},[props.paint]);
 return <div ref={container} className="block w-full" style={{aspectRatio:'9 / 7',touchAction:'none'}}/>;
}
