import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { clarificationFixture, successFixture } from '../src/scheduling/scheduleFixtures.js';

let vite;
let Results;
let ResponseOutcome;
let TransportDisclosure;

before(async () => {
  vite = await createServer({ configFile: 'vite.config.js', server: { middlewareMode: true }, appType: 'custom' });
  ({ Results, ResponseOutcome, TransportDisclosure } = await vite.ssrLoadModule('/src/pages/SchedulePlanner.jsx'));
});

after(async () => { await vite?.close(); });

test('successful schedule rendering shows recommendation, savings and all three deadline scenarios', () => {
  const markup = renderToStaticMarkup(React.createElement(Results, { response: successFixture }));
  assert.match(markup, /Recommended schedule/);
  assert.match(markup, /£0\.98/);
  assert.match(markup, /Running-now baseline/);
  assert.match(markup, /Savings versus running now/);
  assert.match(markup, /£2\.06/);
  assert.match(markup, /£1\.08/);
  assert.match(markup, /Earlier deadline/);
  assert.match(markup, /Most likely deadline/);
  assert.match(markup, /Later deadline/);
  assert.match(markup, /£1\.26 flexibility spread/);
  assert.match(markup, /Credit: £0\.12/);
  assert.match(markup, /Sun 25 Oct, 02:00–03:30 GMT/);
  assert.match(markup, />02:00<\/time>/);
  assert.doesNotMatch(markup, />2026-10-25T02:00Z UTC</);
});

test('old responses derive the baseline and keep negative savings signed', () => {
  const oldResponse = structuredClone(successFixture);
  const expected = oldResponse.scenarios.expected_interpretation;
  delete expected.baseline_cost_gbp;
  expected.estimated_cost_gbp = 2.18;
  expected.savings_vs_now_gbp = -0.12;
  const markup = renderToStaticMarkup(React.createElement(Results, { response: oldResponse }));
  assert.match(markup, /Running-now baseline/);
  assert.match(markup, /£2\.06/);
  assert.match(markup, /−£0\.12/);
});

test('clarification rendering displays the question and suppresses scenario cards', () => {
  const markup = renderToStaticMarkup(React.createElement(ResponseOutcome, { response: clarificationFixture }));
  assert.match(markup, /How much energy should the EV receive/);
  assert.match(markup, /Your original description is still here/);
  assert.doesNotMatch(markup, /Earlier deadline|Most likely deadline|Later deadline/);
});

test('mock transport is visibly identified as cached demo data', () => {
  const markup = renderToStaticMarkup(React.createElement(TransportDisclosure, { mode: 'mock' }));
  assert.match(markup, /Mock preview/);
  assert.match(markup, /Cached demo response/);
  assert.equal(renderToStaticMarkup(React.createElement(TransportDisclosure, { mode: 'api' })), '');
});
