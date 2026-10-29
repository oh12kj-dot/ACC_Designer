'use client';
import {useEffect,useRef,type ReactNode} from 'react';

/** Desktop sidebar; on small screens the same controls become a modal sheet. */
export default function EditorPanel({open,onClose,children}:{open:boolean;onClose:()=>void;children:ReactNode}){
 const panel=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open||!window.matchMedia('(max-width:1023px)').matches||!panel.current)return;
  const element=panel.current,previous=document.activeElement as HTMLElement|null;
  element.setAttribute('role','dialog');element.setAttribute('aria-modal','true');element.setAttribute('aria-label','パーツを探す・選択を調整する');
  const blocked:Array<[HTMLElement,boolean]>=[];
  let ancestor:HTMLElement=element;
  while(ancestor.parentElement){for(const sibling of Array.from(ancestor.parentElement.children)){if(sibling!==ancestor&&sibling instanceof HTMLElement){blocked.push([sibling,sibling.inert]);sibling.inert=true;}}ancestor=ancestor.parentElement;if(ancestor===document.body)break;}
  const media=window.matchMedia('(max-width:1023px)'),resized=()=>{if(!media.matches)close.current();};media.addEventListener('change',resized);
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const focusable=()=>Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')).filter(e=>e.getClientRects().length>0&&e.tabIndex>=0);
  element.querySelector<HTMLInputElement>('input[placeholder="名前・品番・色など"]')?.focus();
  function key(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();}if(event.key==='Tab'){const targets=focusable(),first=targets[0],last=targets.at(-1);if(!first)return;if(event.shiftKey&&(document.activeElement===first||!element.contains(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||!element.contains(document.activeElement))){event.preventDefault();first.focus();}}}
  document.addEventListener('keydown',key,true);
  return()=>{media.removeEventListener('change',resized);document.removeEventListener('keydown',key,true);element.removeAttribute('role');element.removeAttribute('aria-modal');element.removeAttribute('aria-label');for(const [e,inert]of blocked)e.inert=inert;document.body.style.overflow=overflow;if(element.contains(document.activeElement))previous?.focus({preventScroll:true});};
 },[open]);
 return <aside ref={panel} className={`editor-panel rounded-lg border bg-white p-4 ${open?'editor-panel-open':''}`}>{children}</aside>;
}
