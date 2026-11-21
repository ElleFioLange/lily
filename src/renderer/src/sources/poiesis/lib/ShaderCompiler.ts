/**
 * Shader compilation utilities for WebGL2
 */
export class ShaderCompiler {
  /**
   * Compile a shader from source
   * @param gl - WebGL2 context
   * @param type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
   * @param source - GLSL source code
   * @returns Compiled shader
   */
  static compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) {
      console.error('Failed to create shader')
      return null
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    // Check compilation status
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      console.error('Shader compilation failed:', info)
      console.error('Shader source:', source)
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  /**
   * Link vertex and fragment shaders into a program
   * @param gl - WebGL2 context
   * @param vertexShader - Compiled vertex shader
   * @param fragmentShader - Compiled fragment shader
   * @returns Linked program
   */
  static linkProgram(
    gl: WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram | null {
    const program = gl.createProgram()
    if (!program) {
      console.error('Failed to create program')
      return null
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    // Check link status
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      console.error('Program linking failed:', info)
      gl.deleteProgram(program)
      return null
    }

    return program
  }

  /**
   * Compile and link vertex + fragment shaders into a program
   * @param gl - WebGL2 context
   * @param vertexSource - Vertex shader GLSL source
   * @param fragmentSource - Fragment shader GLSL source
   * @returns Compiled and linked program
   */
  static compile(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ): WebGLProgram {
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource)
    if (!vertexShader) {
      throw new Error('Failed to compile vertex shader')
    }

    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
    if (!fragmentShader) {
      gl.deleteShader(vertexShader)
      throw new Error('Failed to compile fragment shader')
    }

    const program = this.linkProgram(gl, vertexShader, fragmentShader)
    if (!program) {
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      throw new Error('Failed to link program')
    }

    // Clean up shaders (program keeps reference)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    return program
  }

  /**
   * Validate a program
   * @param gl - WebGL2 context
   * @param program - Program to validate
   * @returns True if valid
   */
  static validateProgram(gl: WebGL2RenderingContext, program: WebGLProgram): boolean {
    gl.validateProgram(program)

    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      console.error('Program validation failed:', info)
      return false
    }

    return true
  }
}
