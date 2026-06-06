/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

// https://docs.cycling74.com/apiref/lom/

inlets = 1
outlets = 1

function log(msg) {
  post(msg + '\n')
}

// Called by Max when the js object receives a 'bang'
function bang() {}

// /set/clip/active [path]
// Fire/launch the clip slot at the given LiveAPI path
function clip_active(path) {
  log('clip_active: ' + path)
  var clip_slot = new LiveAPI(path)
  clip_slot.call('fire')
}

// /set/clip/inactive [path]
// Stop the clip slot at the given LiveAPI path
function clip_inactive(path) {
  log('clip_inactive: ' + path)
  var clip_slot = new LiveAPI(path)
  clip_slot.call('stop')
}

// /set/track/active [path]
// Unmute the track at the given LiveAPI path
function track_active(path) {
  log('track_active: ' + path)
  var track = new LiveAPI(path)
  track.set('mute', 0)
}

// /set/track/inactive [path]
// Mute the track at the given LiveAPI path
function track_inactive(path) {
  log('track_inactive: ' + path)
  var track = new LiveAPI(path)
  track.set('mute', 1)
}

// /set/{type}/{object} [path, value]
// Set a property (e.g. device parameter value) at the given LiveAPI path
function set_param(path, value) {
  log('set_param: ' + path + ' = ' + value)
  var obj = new LiveAPI(path)
  obj.set('value', value)
}
