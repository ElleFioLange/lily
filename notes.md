- incorporate hydra-text and also manage library of images and videos for hydra
- beautiful gradient images as source material for hydra transformations will get by the "digital colorspace" feel that hydra is usually stuck in

- primary flow of ableton control
  REPL
- Read:
  - read the content of the text input on ctrl+shift+enter
- Evaluate:
  - evalute the user input
  - pull in the configuration file
    - configuration file is JSON
    - top level keys are keywords
    - keywords have:
      - the live object they are associated with
        - track
        - scene
        - clip
        - device
        - mixer
        - device parameter
      - the live object is stored as a UUID
      - when the hook is instantiated, a lily-id max for live device is added to the track with the closest relationship to the object
      - lily-id devices deduplicate, only one per track
      - they listen for udp signals of the object UUID and return the canonical path
      -

need to create functionality for adding custom javascript
example:
brine(sin(t)) sends a sin(time) control signal to the value corresponding to the brine action
brine(sin(wings())) follows the value of the wings() operator and performs a sin() transform on the value
brine(brine(brine())) modulation feedback ꉂ(˵˃ ᗜ ˂˵)

brine().smooth()

extendEnvelope(brine())

Lily Project Structure

- hydra patches
  - active patch
- lily inputs
  = active input
  = ableton project

Browsers highlight the project specific structures (like configs, patches, or inputs). Users can also export a structure from a project into their library to be accessible in any other project.

allow configs to be either yaml files which the user manually writes or could be a script file that exports a function "generateConfig" which outputs a ConfigurationJSON object usable by the system, so someone could write say an automatic config generator script that would take the state of the strudel patch and create keywords out of the commented track name labels in the patch
