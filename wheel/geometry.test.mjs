import test from 'node:test'; import assert from 'node:assert/strict'; import {buildSegments,normalizeAngle,winnerIndexAtPointer,landingRotationForIndex} from './geometry.js';
test('weighted fractions',()=>{const s=buildSegments([{weight:1},{weight:3}]);assert.equal(s[0].fraction,.25);assert.equal(s[1].fraction,.75)});
test('normalizes angles',()=>{assert.ok(Math.abs(normalizeAngle(-Math.PI)-Math.PI)<1e-10);assert.ok(normalizeAngle(10*Math.PI)<2*Math.PI)});
test('landing maps back to winner',()=>{const s=buildSegments([{weight:1},{weight:2},{weight:1}]);for(let i=0;i<s.length;i++){const r=landingRotationForIndex(s,i,.37,6);assert.equal(winnerIndexAtPointer(s,r),i)}});
test('large rotations and ratios remain valid',()=>{const s=buildSegments([{weight:.0001},{weight:1000000}]);const r=landingRotationForIndex(s,1,200*Math.PI,8);assert.equal(winnerIndexAtPointer(s,r),1)});
