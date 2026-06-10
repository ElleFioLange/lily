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
  var is_playing = parseInt(clip_slot.get('is_playing'))
  if (action === 'active') {
    if (is_playing === 1) { log('clip already playing, skipping: ' + path); return }
    clip_slot.call('fire')
  } else if (action === 'inactive') {
    if (is_playing === 0) { log('clip already stopped, skipping: ' + path); return }
    clip_slot.call('stop')
  }
}

function track(action, path) {
  var t = new LiveAPI(path)
  var mute = parseInt(t.get('mute'))
  if (action === 'active') {
    if (mute === 0) return
    t.set('mute', 0)
  } else if (action === 'inactive') {
    if (mute === 1) return
    t.set('mute', 1)
  }
}

function device(action, path) {
  var dev = new LiveAPI(path)
  var is_active = parseInt(dev.get('is_active'))
  if (action === 'active') {
    if (is_active === 1) return
    dev.set('is_active', 1)
  } else if (action === 'inactive') {
    if (is_active === 0) return
    dev.set('is_active', 0)
  }
}

function device_parameter(action, path, value) {
  var obj = new LiveAPI(path)
  if (action === 'value') {
    if (parseFloat(obj.get('value')) === parseFloat(value)) return
    obj.set('value', value)
  }
}

function send(path, value) {
  var obj = new LiveAPI(path)
  if (parseFloat(obj.get('value')) === parseFloat(value)) return
  obj.set('value', value)
}

function setup_modifier_returns() {
  var names = ['Lily - !!', 'Lily - []', 'Lily - {}']
  var ls = new LiveAPI('live_set')
  var returnCount = ls.getcount('return_tracks')
  var indices = []

  for (var i = 0; i < names.length; i++) {
    // Check if a return track with this name already exists
    var existingIdx = -1
    for (var r = 0; r < returnCount; r++) {
      var existing = new LiveAPI('live_set return_tracks ' + r)
      if (existing.get('name').toString().includes(names[i])) {
        existingIdx = r
        break
      }
    }

    if (existingIdx >= 0) {
      log('return track already exists: ' + names[i] + ' at index ' + existingIdx)
      indices.push(existingIdx)
    } else {
      ls.call('create_return_track')
      returnCount = ls.getcount('return_tracks')
      var idx = returnCount - 1
      var rt = new LiveAPI('live_set return_tracks ' + idx)
      rt.set('name', names[i])
      indices.push(idx)
      log('created return track: ' + names[i] + ' at index ' + idx)
    }
  }

  outlet(0, 'modifier_returns ' + indices.join(','))
}
