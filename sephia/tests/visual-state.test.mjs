import test from "node:test";
import assert from "node:assert/strict";
import { createVisualState } from "../src/visual/visual-state.js";

test("visual state starts inactive and only accepts valid transitions", () => {
  const updates = [];
  const state = createVisualState({ onChange: (snapshot) => updates.push(snapshot) });
  assert.deepEqual(state.snapshot, { active: false, visualizerEnabled: true, state: "inactive" });
  assert.equal(state.setState("speaking"), false);
  assert.equal(state.activate(), true);
  assert.equal(state.setState("speaking"), true);
  assert.equal(state.snapshot.state, "speaking");
  assert.equal(state.deactivate(), true);
  assert.equal(state.snapshot.state, "inactive");
  assert.ok(updates.length >= 3);
});

test("visualizer can be disabled independently from SEPHIA activation", () => {
  const state = createVisualState();
  state.activate();
  assert.equal(state.setVisualizerEnabled(false), true);
  assert.equal(state.snapshot.active, true);
  assert.equal(state.snapshot.visualizerEnabled, false);
  assert.equal(state.snapshot.state, "standby");
  state.dispose();
});

test("disposed visual state rejects future changes", () => {
  const state = createVisualState();
  state.activate();
  state.dispose();
  assert.equal(state.activate(), false);
  assert.equal(state.setState("error"), false);
  assert.equal(state.setVisualizerEnabled(false), false);
  assert.equal(state.snapshot.state, "inactive");
});
