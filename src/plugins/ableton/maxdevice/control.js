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

function bang() {}

// Entry point — receives all /control payloads as a list message
function list() {
  var type = arguments[0]
  var action = arguments[1]
  var path = arguments[2]
  var value = arguments[3]

  log('control: ' + type + ' ' + action + ' ' + path + (value !== undefined ? ' ' + value : ''))

  if (type === 'clip') {
    if (action === 'active') clip_active(path)
    else if (action === 'inactive') clip_inactive(path)
    else log('unknown clip action: ' + action)
  } else if (type === 'track') {
    if (action === 'active') track_active(path)
    else if (action === 'inactive') track_inactive(path)
    else log('unknown track action: ' + action)
  } else {
    set_param(path, value)
  }
}

function clip_active(path) {
  var clip_slot = new LiveAPI(path)
  clip_slot.call('fire')
}

function clip_inactive(path) {
  var clip_slot = new LiveAPI(path)
  clip_slot.call('stop')
}

function track_active(path) {
  var track = new LiveAPI(path)
  track.set('mute', 0)
}

function track_inactive(path) {
  var track = new LiveAPI(path)
  track.set('mute', 1)
}

function set_param(path, value) {
  var obj = new LiveAPI(path)
  obj.set('value', value)
}
