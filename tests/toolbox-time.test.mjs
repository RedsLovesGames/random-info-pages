import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/time/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../tools/time/time-app.js', import.meta.url), 'utf8');

test('the entire time tool remains gated behind Tommy login', () => {
  assert.match(html, /id="accessGate"/);
  assert.match(html, /id="loginForm"/);
  assert.match(html, /id="loginUsername"/);
  assert.match(html, /id="loginPassword"/);
  assert.match(html, /id="protectedTimeApp"[^>]*hidden/);
  assert.match(html, /id="logoutAccess"/);
  assert.match(app, /time-auth\.js/);
  assert.match(app, /unlockTimeApp/);
  assert.match(app, /lockTimeApp/);
});

test('time workspace exposes Map, Planner, and Board views', () => {
  assert.match(html, /class="[^"]*time-view-tab[^"]*"[^>]*data-view="map"/);
  assert.match(html, /class="[^"]*time-view-tab[^"]*"[^>]*data-view="planner"/);
  assert.match(html, /class="[^"]*time-view-tab[^"]*"[^>]*data-view="board"/);
  assert.match(html, /id="mapView"/);
  assert.match(html, /id="plannerView"/);
  assert.match(html, /id="boardView"/);
});

test('map view exposes ZoneMap-style location rail, world map, markers, and shared timeline', () => {
  assert.match(html, /id="locationCards"/);
  assert.match(html, /id="worldMap"/);
  assert.match(html, /id="mapMarkers"/);
  assert.match(html, /id="timelineSlider"/);
  assert.match(html, /id="timelineLabel"/);
  assert.match(html, /id="liveTime"/);
  assert.match(html, /id="format"/);
  assert.match(html, /id="addPerson"/);
});

test('planner and board expose grouped-person interfaces', () => {
  assert.match(html, /id="plannerGrid"/);
  assert.match(html, /id="plannerSummary"/);
  assert.match(html, /id="peopleBoard"/);
  assert.match(html, /id="personDialog"/);
  assert.match(html, /id="personForm"/);
  assert.match(html, /id="personName"/);
  assert.match(html, /id="personCity"/);
  assert.match(html, /id="personAvailableStart"/);
  assert.match(html, /id="personAvailableEnd"/);
});

test('time app renders locations once and groups their people', () => {
  assert.match(app, /groupPeopleByLocation\(/);
  assert.match(app, /peopleForLocation/);
  assert.match(app, /data-location-id=/);
  assert.match(app, /data-person-id=/);
});
