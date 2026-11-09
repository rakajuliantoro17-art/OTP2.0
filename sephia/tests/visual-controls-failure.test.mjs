import test from "node:test";
import assert from "node:assert/strict";
import { createVisualState } from "../src/visual/visual-state.js";
import { mountSephiaControls } from "../src/visual/mount-sephia-controls.js";

class Node {
  constructor() { this.children=[]; this.attributes={}; this.listeners={}; this.dataset={}; this.parentNode=null; }
  append(...items) { items.forEach((item)=>this.appendChild(item)); }
  appendChild(item) { item.parentNode=this; this.children.push(item); return item; }
  setAttribute(key,value) { this.attributes[key]=String(value); }
  addEventListener(key,fn) { this.listeners[key]=fn; }
  removeEventListener(key) { delete this.listeners[key]; }
  click() { this.listeners.click?.(); }
  remove() { if(this.parentNode) this.parentNode.children=this.parentNode.children.filter((x)=>x!==this); this.parentNode=null; }
}
class Document {
  constructor(){ this.head=new Node(); this.ids=new Map(); }
  createElement(){ const node=new Node(); Object.defineProperty(node,"id",{set:(v)=>this.ids.set(v,node),get:()=>""}); return node; }
  getElementById(id){ return this.ids.get(id)||null; }
}

test("failed runtime activation leaves visual state inactive", () => {
  const documentImpl=new Document(), container=new Node(), visualState=createVisualState();
  const errors=[];
  const runtime={isActive:false,activate(){throw new Error("observer start failed");},deactivate(){}};
  const controls=mountSephiaControls({container,runtime,visualState,documentImpl,onError:(e)=>errors.push(e)});
  controls.element.children[0].click();
  assert.equal(visualState.snapshot.active,false);
  assert.equal(visualState.snapshot.state,"inactive");
  assert.equal(errors.length,1);
  controls.dispose();
});

test("runtime deactivation failure still clears visual state", () => {
  const documentImpl=new Document(), container=new Node(), visualState=createVisualState();
  const errors=[];
  const runtime={isActive:false,activate(){this.isActive=true;},deactivate(){this.isActive=false;throw new Error("cleanup warning");}};
  const controls=mountSephiaControls({container,runtime,visualState,documentImpl,onError:(e)=>errors.push(e)});
  const trigger=controls.element.children[0];
  trigger.click();
  assert.equal(visualState.snapshot.active,true);
  trigger.click();
  assert.equal(visualState.snapshot.active,false);
  assert.equal(runtime.isActive,false);
  assert.equal(errors.length,1);
  controls.dispose();
});
