/**
 * GLSL Effect Presets for Audio-Reactive Keyword Shaders
 * Each preset includes vertex shader, fragment shader, and blend mode
 */

//
const glsl = (x) => x // for glsl highlighting with vscode extension glsl-literal https://marketplace.visualstudio.com/items?itemName=boyswan.glsl-literal

export interface EffectPreset {
  name: string
  description: string
  vertexShader: string
  fragmentShader: string
  blendMode: 'normal' | 'screen' | 'multiply' | 'add' | 'overlay'
}

/**
 * Standard vertex shader (shared by all effects)
 * Creates fullscreen quad with texture coordinates
 */
const STANDARD_VERTEX_SHADER = glsl`#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = (a_position + 1.0) * 0.5;
}
`

const TESTING_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_time;
uniform float u_amplitude;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;

void main() {
  fragColor = vec4(u_amplitude, u_amplitude, u_amplitude, 1.0);
}
`

const VOLTAGE_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_time;
uniform float u_amplitude;

// ---- GLSL ES 300–compatible hash/noise ----
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}

void main() {
    vec2 uv = v_texCoord;

    // Voltage-style jitter
    float jumpFreq = 30.0;
    float jitter = (hash(floor(u_time * jumpFreq)) - 0.5) * u_amplitude;

    float ripple = (noise(uv.y * 20.0 + u_time * 5.0) - 0.5) * u_amplitude;

    uv += vec2(jitter + ripple);

    // ---- Sample text ----
    vec4 textColor = texture(u_textTexture, uv);

    // Optional glow pulse
    float glow = smoothstep(0.2, 0.8, textColor.a)
                 * (0.5 + 0.5 * sin(u_time * 50.0)) * u_amplitude;

    fragColor = vec4(textColor.rgb + vec3(glow, glow * 0.5, glow),
                     textColor.a);
}`

const WAVEFORM_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_time;
uniform float u_signal[512];   // Raw signal input
uniform float u_amplitude;

// ---- MFCC continuous curve ----
float signalWave(float x) {
    // Map x ∈ [0,1] → index ∈ [0,511]
    float fx = x * 511.0;
    float i0 = floor(fx);
    float i1 = min(i0 + 1.0, 511.0);
    float t = fract(fx);

    float v0 = u_signal[int(i0)];
    float v1 = u_signal[int(i1)];

    return mix(v0, v1, t);
}

void main() {
    vec2 uv = v_texCoord;

    // Normalize MFCC waveform height
    // Assuming average range 0 - 13
    float wave = signalWave(uv.x) * 10.0 + 0.4;

    // Signed distance from the pixel to the line
    float dist = abs(uv.y - wave);

    // Sample text
    vec4 textColor = texture(u_textTexture, uv);

    vec4 waveColor = vec4(0.0, 1.0, 1.0, 1.0);
    vec4 backgroundColor = mix(vec4(u_amplitude), waveColor, abs(wave - 0.4));

    vec4 color = (textColor.a <= 0.01) ? backgroundColor : textColor;

    // Anti-aliased line thickness
    float thickness = 0.06;
    float lineMask = smoothstep(thickness, 0.0, dist);

    // Waveform color (cyan line)

    // Composite waveform on top of shaded text
    fragColor = mix(color, waveColor, lineMask);
}
`

/**
 * Effect 1: Kaleidoscope
 * Bass-driven kaleidoscope effect with variable segments
 */
const KALEIDOSCOPE_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_bass;
uniform float u_time;
uniform float u_amplitude;

void main() {
  vec2 uv = v_texCoord;
  vec2 center = vec2(0.5);

  // Kaleidoscope segments driven by bass (6-18 segments)
  float segments = 6.0 + u_bass * 12.0;

  vec2 pos = uv - center;
  float angle = atan(pos.y, pos.x);
  float radius = length(pos);

  // Mirror angle based on segment count
  angle = mod(angle, 6.28318 / segments) * segments;
  vec2 newPos = center + vec2(cos(angle), sin(angle)) * radius;

  // Sample text texture with kaleidoscope UV
  vec4 textColor = texture(u_textTexture, newPos);

  // Add subtle color shift based on amplitude
  vec3 color = textColor.rgb;
  color.r += u_amplitude * 0.2;
  color.g += u_bass * 0.15;

  fragColor = vec4(color, textColor.a);
}
`

/**
 * Effect 2: Chromatic Aberration
 * Amplitude-driven RGB channel separation
 */
const CHROMATIC_ABERRATION_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_amplitude;
uniform float u_time;

void main() {
  vec2 uv = v_texCoord;

  // RGB split amount driven by amplitude
  float offset = u_amplitude * 0.02;

  // Slight rotation over time
  float angle = u_time * 0.1;
  vec2 dir = vec2(cos(angle), sin(angle));

  // Sample each color channel with offset
  float r = texture(u_textTexture, uv + dir * offset).r;
  float g = texture(u_textTexture, uv).g;
  float b = texture(u_textTexture, uv - dir * offset).b;
  float a = texture(u_textTexture, uv).a;

  fragColor = vec4(r, g, b, a);
}
`

/**
 * Effect 3: Glitch
 * Beat-triggered glitch with horizontal line displacement
 */
const GLITCH_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_beat;
uniform float u_mid;
uniform float u_time;
uniform float u_amplitude;

// Random function
float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = v_texCoord;

  // Apply glitch when beat is detected
  if (u_beat > 0.5) {
    float glitchIntensity = u_mid * 0.8 + 0.2;

    // Horizontal line displacement
    float lineY = floor(uv.y * 20.0) / 20.0;
    float lineOffset = (random(vec2(lineY, u_time)) - 0.5) * glitchIntensity * 0.15;
    uv.x += lineOffset;

    // RGB shift on glitch lines
    float rShift = (random(vec2(lineY, u_time + 1.0)) - 0.5) * glitchIntensity * 0.03;
    float bShift = (random(vec2(lineY, u_time + 2.0)) - 0.5) * glitchIntensity * 0.03;

    float r = texture(u_textTexture, uv + vec2(rShift, 0.0)).r;
    float g = texture(u_textTexture, uv).g;
    float b = texture(u_textTexture, uv + vec2(bShift, 0.0)).b;
    float a = texture(u_textTexture, uv).a;

    fragColor = vec4(r, g, b, a);
  } else {
    // No glitch - render normally with subtle movement
    float drift = u_amplitude * 0.005 * sin(u_time * 2.0);
    fragColor = texture(u_textTexture, uv + vec2(drift, 0.0));
  }
}
`

/**
 * Effect 4: Pixelate
 * High-frequency driven pixelation
 */
const PIXELATE_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_high;
uniform float u_amplitude;

void main() {
  // Pixel size driven by high frequencies (2-32 pixels)
  float pixelSize = 2.0 + u_high * 30.0;

  // Add subtle variation based on amplitude
  pixelSize *= (1.0 + u_amplitude * 0.3);

  // Pixelate UV coordinates
  vec2 uv = v_texCoord;
  vec2 pixelatedUV = floor(uv * pixelSize) / pixelSize;

  fragColor = texture(u_textTexture, pixelatedUV);
}
`

/**
 * Effect 5: Wave Distortion
 * Amplitude-driven sine wave distortion
 */
const WAVE_DISTORTION_FRAGMENT = glsl`#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform float u_amplitude;
uniform float u_time;
uniform float u_bass;

void main() {
  vec2 uv = v_texCoord;

  // Vertical and horizontal wave distortion
  float waveAmountX = u_amplitude * 0.05;
  float waveAmountY = u_bass * 0.03;

  // Multiple wave frequencies
  float waveX = sin(uv.y * 10.0 + u_time * 2.0) * waveAmountX;
  float waveY = sin(uv.x * 8.0 + u_time * 1.5) * waveAmountY;

  uv.x += waveX;
  uv.y += waveY;

  fragColor = texture(u_textTexture, uv);
}
`

/**
 * Effect Preset Registry
 * Maps effect names to their shader implementations
 */
export const EFFECT_PRESETS: Map<string, EffectPreset> = new Map([
  [
    'testing',
    {
      name: 'testing',
      description: 'Testing shader',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: TESTING_FRAGMENT,
      blendMode: 'normal'
    }
  ],
  [
    'voltage',
    {
      name: 'voltage',
      description: 'Voltage shader driven by amplitude',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: VOLTAGE_FRAGMENT,
      blendMode: 'normal'
    }
  ],
  [
    'waveform',
    {
      name: 'waveform',
      description: 'Waveform visualizer masked to text',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: WAVEFORM_FRAGMENT,
      blendMode: 'normal'
    }
  ],
  [
    'kaleidoscope',
    {
      name: 'kaleidoscope',
      description: 'Kaleidoscope effect with bass-driven segment count',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: KALEIDOSCOPE_FRAGMENT,
      blendMode: 'screen'
    }
  ],
  [
    'chromatic-aberration',
    {
      name: 'chromatic-aberration',
      description: 'RGB channel split driven by amplitude',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: CHROMATIC_ABERRATION_FRAGMENT,
      blendMode: 'normal'
    }
  ],
  [
    'glitch',
    {
      name: 'glitch',
      description: 'Beat-triggered glitch effect with line displacement',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: GLITCH_FRAGMENT,
      blendMode: 'add'
    }
  ],
  [
    'pixelate',
    {
      name: 'pixelate',
      description: 'Pixelation effect driven by high frequencies',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: PIXELATE_FRAGMENT,
      blendMode: 'normal'
    }
  ],
  [
    'wave-distortion',
    {
      name: 'wave-distortion',
      description: 'Sine wave distortion driven by amplitude and bass',
      vertexShader: STANDARD_VERTEX_SHADER,
      fragmentShader: WAVE_DISTORTION_FRAGMENT,
      blendMode: 'screen'
    }
  ]
])

/**
 * Get list of available effect names
 */
export function getAvailableEffects(): string[] {
  return Array.from(EFFECT_PRESETS.keys())
}

/**
 * Check if an effect preset exists
 */
export function hasEffect(effectName: string): boolean {
  return EFFECT_PRESETS.has(effectName)
}
