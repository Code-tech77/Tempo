import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { clarificationFixture, successFixture } from '../src/scheduling/scheduleFixtures.js';

let vite;
let Results;
let ResponseOutcome;

before(async () => {
  vite = await createServer({ configFile: 'vite.config.js', server: { middlewareMode: true }, appType: 'custom' });
  ({ Results, ResponseOutcome } = await vite.ssrLoadModule('/src/pages/SchedulePlanner.jsx'));
});

after(async () => { await vite?.close(); });

test('successful schedule rendering shows recommendation, savings and all three deadline scenarios', () => {
  const markup = renderToStaticMarkup(React.createElement(Results, { response: successFixture }));
  assert.match(markup, /Recommended schedule/);
  assert.match(markup, /£0\.98/);
  assert.match(markup, /Save £1\.08 vs running now/);
  assert.match(markup, /Earliest finish/);
  assert.match(markup, /Expected finish/);
  assert.match(markup, /Latest finish/);
  assert.match(markup, /42p potential flexibility saving/);
  assert.match(markup, /2026-10-25T02:00Z UTC/);
});

test('clarification rendering displays the question and suppresses scenario cards', () => {
  const markup = renderToStaticMarkup(React.createElement(ResponseOutcome, { response: clarificationFixture }));
  assert.match(markup, /How much energy should the EV receive/);
  assert.match(markup, /Your original description is still here/);
  assert.doesNotMatch(markup, /Earliest finish|Expected finish|Latest finish/);
});
