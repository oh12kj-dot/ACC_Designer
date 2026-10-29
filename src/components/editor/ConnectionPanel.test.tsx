// @vitest-environment jsdom
import { afterEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import ConnectionPanel from './ConnectionPanel';
afterEach(cleanup);
const point={id:'c',name:'接続点',type:'ring',xNorm:1,yNorm:.5,directionDeg:0,maxConnections:1};
const parts=[{id:'p',name:'パーツ',geometryKind:'node',widthMm:10,heightMm:10,connectionPoints:[point]}] as Part[];
const aggregate={design:{editorConfig:{}},nodes:[{id:'a',partId:'p',xMm:0,yMm:0,rotationDeg:0,scaleX:1,scaleY:1,locked:false},{id:'b',partId:'p',xMm:20,yMm:20,rotationDeg:15,scaleX:1,scaleY:1,locked:false}],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
it('commits the chosen rotation mode and offset through the real connection command',()=>{
 const onChange=vi.fn(),onMessage=vi.fn();
 render(<ConnectionPanel aggregate={aggregate} parts={parts} nodeId="b" busy={false} onChange={onChange} onMessage={onMessage}/>);
 fireEvent.change(screen.getByLabelText('Point接続の向き'),{target:{value:'keep_rotation'}});
 expect(screen.queryByLabelText('接続方向からの回転差（度）')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'接続点同士を接続'}));
 expect(onChange.mock.calls[0][0].nodes[1].rotationDeg).toBe(15);
 expect(onChange.mock.calls[0][0].pointAttachments[0]).toMatchObject({orientationMode:'keep_rotation',relativeRotationDeg:0});
 fireEvent.change(screen.getByLabelText('Point接続の向き'),{target:{value:'align_opposite'}});
 fireEvent.change(screen.getByLabelText('接続方向からの回転差（度）'),{target:{value:'30'}});
 fireEvent.click(screen.getByRole('button',{name:'接続点同士を接続'}));
 expect(onChange.mock.calls[1][0].nodes[1].rotationDeg).toBe(210);
 expect(onChange.mock.calls[1][0].pointAttachments[0].relativeRotationDeg).toBe(30);
});
