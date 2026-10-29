// @vitest-environment jsdom
import {useState} from 'react';
import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import PartDefinitions from './PartDefinitions';
import type {ConnectionPoint,ThroughHole} from '../../types/domain';
afterEach(cleanup);
function Harness(){const [points,setPoints]=useState<ConnectionPoint[]>([]),[holes,setHoles]=useState<ThroughHole[]>([]);return <><PartDefinitions points={points} holes={holes} onPoints={setPoints} onHoles={setHoles}/><output data-testid="draft">{JSON.stringify({points,holes})}</output></>;}
it('adds, edits and removes definitions while distinguishing zero dimensions from unknown',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'接続点を追加'}));fireEvent.click(screen.getByRole('button',{name:'貫通穴を追加'}));
 fireEvent.change(screen.getByLabelText('X位置'),{target:{value:'0'}});fireEvent.change(screen.getByLabelText('局所内径（mm）'),{target:{value:'0'}});fireEvent.change(screen.getByLabelText('穴径（mm）'),{target:{value:'2'}});
 let draft=JSON.parse(screen.getByTestId('draft').textContent!);expect(draft.points[0]).toMatchObject({xNorm:0,localInnerDiameterMm:0});expect(draft.holes[0].diameterMm).toBe(2);
 fireEvent.change(screen.getByLabelText('穴径（mm）'),{target:{value:''}});draft=JSON.parse(screen.getByTestId('draft').textContent!);expect(draft.holes[0].diameterMm).toBeUndefined();
 fireEvent.click(screen.getByRole('button',{name:'この接続点を削除'}));fireEvent.click(screen.getByRole('button',{name:'この穴を削除'}));expect(JSON.parse(screen.getByTestId('draft').textContent!)).toEqual({points:[],holes:[]});
});
