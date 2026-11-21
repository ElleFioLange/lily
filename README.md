# lily

Hi! Here's a repo walkthrough I made for anyone who looks at this between now (monday at 3am) and saturday when I (hopefully) have it cleaned up and not ridiculously messy and broken
https://youtu.be/XcjRbLw4HAY

A Hydra-only live video mixer, built as an Electron app with React and TypeScript.

Poiesis (the poetic text layer) is optional and on by default. Run or build with
`VITE_LILY_POIESIS=false` to leave it out, e.g. `VITE_LILY_POIESIS=false pnpm dev`.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```
