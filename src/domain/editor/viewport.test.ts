import { it,expect } from 'vitest';
import { screenToWorld,zoomAt } from './viewport';
it('keeps the world point under the pinch/wheel center, including zoom limits',()=>{
 const v={zoom:3,pan:{x:80,y:-20}},p={x:140,y:100};
 for(const zoom of [.01,6,100])expect(screenToWorld(p,zoomAt(v,p,zoom))).toEqual(screenToWorld(p,v));
});
