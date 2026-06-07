/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

// https://docs.cycling74.com/apiref/lom/
//
// All control signals arrive at the single OSC address /control with a payload:
//   [type, action, path]          — for clip/track control
//   [type, object, path, value]   — for parameter control
//
// Max wiring: route /control → js control.js (as a list message)

inlets = 1
outlets = 1

function log(msg) {
  post(msg + '\n')
}

function bang() {
  /* no-op: required for Max js object compatibility */
}

// Entry point — receives all /control payloads as a list message
function list() {
  var type = arguments[0]
  var action = arguments[1]
  var path = arguments[2]
  var value = arguments[3]

  log('control: ' + type + ' ' + action + ' ' + path + (value !== undefined ? ' ' + value : ''))

  if (type === 'clip') {
    clip(action, path)
  } else if (type === 'track') {
    track(action, path)
  } else if (type === 'device') {
    device(action, path)
  } else if (type === 'device_parameter') {
    device_parameter(action, path, value)
  } else if (type === 'send') {
    send(action, path)
  } else if (type === 'setup_modifier_returns') {
    setup_modifier_returns()
  } else {
    log('unknown control type: ' + type)
  }
}

function clip(action, path) {
  var clip_slot = new LiveAPI(path)
  if (action === 'active') clip_slot.call('fire')
  else if (action === 'inactive') clip_slot.call('stop')
}

function track(action, path) {
  var t = new LiveAPI(path)
  if (action === 'active') t.set('mute', 0)
  else if (action === 'inactive') t.set('mute', 1)
}

function device(action, path) {
  var dev = new LiveAPI(path)
  if (action === 'active') dev.set('is_active', 1)
  else if (action === 'inactive') dev.set('is_active', 0)
}

function device_parameter(action, path, value) {
  var obj = new LiveAPI(path)
  if (action === 'value') obj.set('value', value)
}

function send(path, value) {
  var obj = new LiveAPI(path)
  obj.set('value', value)
}

function setup_modifier_returns() {
  var names = ['[Lily] Distortion', '[Lily] Reverb', '[Lily] Delay']
  var ls = new LiveAPI('live_set')
  var indices = []

  for (var i = 0; i < names.length; i++) {
    ls.call('create_return_track')
    var returnCount = ls.getcount('return_tracks')
    var idx = returnCount - 1
    var rt = new LiveAPI('live_set return_tracks ' + idx)
    rt.set('name', names[i])
    indices.push(idx)
    log('created return track: ' + names[i] + ' at index ' + idx)
  }

  // Output indices as comma-separated string for the bridge to capture
  outlet(0, 'modifier_returns ' + indices.join(','))
}
