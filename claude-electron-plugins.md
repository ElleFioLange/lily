2:41 PMThis is a really common challenge in plugin architectures — you're essentially asking "how do I make dynamically loaded code work against a pre-built host application?" Let me walk through the real concerns here.
The core problem: Node/Electron native modules
For pure JavaScript plugins (no native addons, no .node files), you actually have very little to worry about. JS is JS — a built plugin bundle will load and run fine in any Lily instance regardless of when it was compiled, as long as the API contract is stable.
The danger zone is native Node modules (things like node-gyp compiled addons). These are compiled against a specific Node ABI (Application Binary Interface) version, and Electron ships its own Node runtime with its own ABI. If a plugin uses a native module compiled against Node 20's ABI but Lily embeds Electron with a different ABI, it will crash with something like was compiled against a different Node.js version. This is the same reason tools like electron-rebuild exist.
Are there random IDs in builds?
Not really in the way you're worried about. Electron doesn't inject random UUIDs into the runtime that would cause mismatches. What does vary between builds that could bite you:

Electron version → determines the Node ABI and V8 version
asar packaging — your app code may be bundled into an .asar archive, and plugins trying to require from within it have path quirks, but plugins outside the asar in a plugins/ folder are fine
Vite/bundler internals — if your plugin tries to import from Lily's own bundled code by path, those paths could change between builds, but a proper plugin API avoids this entirely

The versioning approach you mentioned
Yes, this is the right instinct. The thing you want to version is the Electron version (and thus Node ABI) plus your plugin API contract. Practically:
You'd expose a lily.pluginApiVersion (semver, e.g. "1.0.0") in the prebuilt app, and when Lily loads a plugin it checks the plugin's declared targetApiVersion against its own. If the major versions don't match, it refuses to load and tells the user. Plugin developers target a specific API version by pulling that version's type definitions from your repo.
For native modules specifically, you'd also want to document which Electron version Lily is built on, so plugin authors can run electron-rebuild correctly. But honestly — encourage plugin authors to avoid native modules entirely and you sidestep most of this.
What your plugin loading code actually needs to handle
When Lily scans the plugins folder and loads a bundle, you'll likely use something like require() or dynamic import(). A few things to nail down:
Sandboxing context — plugins loaded via require() in the main process run with full Node access. If you're loading in a renderer, you need nodeIntegration on or a preload bridge. Decide this early as it shapes the whole architecture.
Plugin entry point contract — your build script should produce a CommonJS or ESM bundle with a known export shape, e.g.:
jsmodule.exports = {
name: 'my-surface',
apiVersion: '1.0.0',
init(lilyApi) { ... },
destroy() { ... }
}
Isolation — each plugin should get its API instance through the init() call rather than reaching into Lily's module graph. This way the plugin never depends on Lily's internal bundle structure, only on the API you explicitly pass it.
The build script
Your separate build:plugin script should bundle the plugin to a single self-contained file (Rollup or esbuild work great for this) with all its dependencies inlined except for Node/Electron builtins and whatever you explicitly mark as external (like your own lily-plugin-api types package). This is what ensures the plugin doesn't have dangling require() calls that would fail in another person's Lily install.
The summary is: pure JS plugins with a stable API contract and a clean build pipeline will work reliably. The version parameter is worth adding for API compatibility checks. Native modules are the one area that demands explicit Electron version documentation or restrictions.
