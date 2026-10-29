import type { Vec2 } from '../../types/domain';
export interface Viewport { zoom:number; pan:Vec2 }
export const screenToWorld=(p:Vec2,v:Viewport):Vec2=>({x:(p.x-v.pan.x)/v.zoom,y:(p.y-v.pan.y)/v.zoom});
export function zoomAt(v:Viewport,screen:Vec2,zoom:number):Viewport {
 const next=Math.max(.25,Math.min(20,zoom)),world=screenToWorld(screen,v);
 return {zoom:next,pan:{x:screen.x-world.x*next,y:screen.y-world.y*next}};
}
