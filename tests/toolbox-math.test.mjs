import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { evaluateExpression, determinant2, solveLinear2, quadraticRoots, sampleFunction } from '../tools/math/calc-core.js';
import { convertUnit, listUnitsForDimension } from '../tools/math/units-core.js';
import {
  circleMetrics, sphereMetrics, kinematicsFinalVelocity, kinematicsDisplacement,
  kineticEnergy, vectorMagnitude, molarMass, molesFromMass, dilution,
  ohmsLaw, voltageDivider, equivalentResistance,
} from '../tools/math/science-core.js';
import { weightedGrade, requiredFinalScore } from '../tools/math/grade-core.js';

const html = readFileSync(new URL('../tools/math/index.html', import.meta.url), 'utf8');

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);

test('calculator evaluates arithmetic, powers, constants, and functions without eval', () => {
  near(evaluateExpression('2 + 3 * 4'), 14);
  near(evaluateExpression('2^3 + sqrt(16)'), 12);
  near(evaluateExpression('sin(pi / 2)'), 1, 1e-12);
  near(evaluateExpression('log(1000)'), 3, 1e-12);
  assert.throws(() => evaluateExpression('window.alert(1)'), /token|identifier|expression/i);
});

test('algebra supports 2x2 matrices, systems, and quadratic roots', () => {
  assert.equal(determinant2([[4, 7], [2, 6]]), 10);
  assert.deepEqual(solveLinear2([[2, 1], [1, -1]], [5, 1]), { x: 2, y: 1 });
  assert.deepEqual(quadraticRoots(1, -5, 6), [2, 3]);
});

test('graph sampling evaluates x over a bounded range', () => {
  const points = sampleFunction('x^2', -2, 2, 5);
  assert.deepEqual(points.map(point => point.x), [-2, -1, 0, 1, 2]);
  assert.deepEqual(points.map(point => point.y), [4, 1, 0, 1, 4]);
});

test('unit converter preserves dimensions and handles temperature offsets', () => {
  near(convertUnit(1, 'km', 'm'), 1000);
  near(convertUnit(60, 'mph', 'm/s'), 26.8224, 1e-4);
  near(convertUnit(32, 'F', 'C'), 0, 1e-9);
  near(convertUnit(0, 'C', 'K'), 273.15, 1e-9);
  assert.throws(() => convertUnit(1, 'kg', 'm'), /dimension/i);
  assert.ok(listUnitsForDimension('length').includes('mi'));
});

test('geometry returns transparent circle and sphere metrics', () => {
  const circle = circleMetrics(3);
  near(circle.area, Math.PI * 9);
  near(circle.circumference, Math.PI * 6);
  const sphere = sphereMetrics(2);
  near(sphere.volume, (4 / 3) * Math.PI * 8);
  near(sphere.surfaceArea, 16 * Math.PI);
});

test('physics fixtures cover kinematics, energy, and vectors', () => {
  near(kinematicsFinalVelocity({ initialVelocity: 5, acceleration: 2, time: 4 }), 13);
  near(kinematicsDisplacement({ initialVelocity: 5, acceleration: 2, time: 4 }), 36);
  near(kineticEnergy({ mass: 2, velocity: 3 }), 9);
  near(vectorMagnitude(3, 4), 5);
});

test('chemistry fixtures cover formula parsing, moles, and dilution', () => {
  near(molarMass('H2O'), 18.015, 0.01);
  near(molarMass('Ca(OH)2'), 74.092, 0.02);
  near(molesFromMass(36.03, 'H2O'), 2, 0.01);
  near(dilution({ c1: 2, v1: 50, c2: 0.5 }).v2, 200);
});

test('electronics fixtures cover Ohm law, divider, and equivalent resistance', () => {
  near(ohmsLaw({ voltage: 12, resistance: 6 }).current, 2);
  near(ohmsLaw({ current: 0.5, resistance: 20 }).voltage, 10);
  near(voltageDivider({ inputVoltage: 12, r1: 1000, r2: 1000 }), 6);
  near(equivalentResistance([100, 200], 'series'), 300);
  near(equivalentResistance([100, 100], 'parallel'), 50);
});

test('grades calculate weighted average and required final score', () => {
  near(weightedGrade([{ score: 90, weight: 0.4 }, { score: 80, weight: 0.6 }]), 84);
  near(requiredFinalScore({ currentGrade: 84, currentWeight: 0.8, targetGrade: 85, finalWeight: 0.2 }), 89);
});

test('Math & Science Lab exposes nine deep-linkable modes and formula/result regions', () => {
  for (const mode of ['calculator', 'units', 'algebra', 'graph', 'geometry', 'physics', 'chemistry', 'electronics', 'grades']) {
    assert.match(html, new RegExp(`data-math-mode="${mode}"`));
    assert.match(html, new RegExp(`data-math-panel="${mode}"`));
  }
  for (const asset of ['calc-core.js', 'units-core.js', 'science-core.js', 'grade-core.js', 'math-app.js']) assert.match(html, new RegExp(asset.replace('.', '\\.')));
  assert.match(html, /Formula/i);
  assert.match(html, /Units/i);
});