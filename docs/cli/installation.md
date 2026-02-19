# CLI Installation

## Homebrew (recommended)

```bash
brew tap feiyoug/tap/slab
```

or

```bash
brew tap feiyoug/tap
brew install slab
```

Verify installation:

```bash
slab --help
```

## Download from Releases

Download the single binary for your platform from:

- macOS ARM64: `slab-macos-arm64`
- Linux x64: `slab-linux-x64`
- Windows x64: `slab-windows-x64.exe`

Release page: `https://github.com/feiyoug/skill-lab/releases`

Install (macOS/Linux):

```bash
mkdir -p ~/.local/bin
mv slab-macos-arm64 ~/.local/bin/slab
chmod +x ~/.local/bin/slab
```

On Windows, rename `slab-windows-x64.exe` to `slab.exe` (optional) and place it
in a directory on your `PATH`.

Verify installation:

```bash
slab --help
```

On macOS, if Gatekeeper blocks the binary, run once:

```bash
xattr -dr com.apple.quarantine ~/.local/bin/slab
```

## Install from source (Deno)

```bash
git clone https://github.com/feiyoug/skill-lab.git
cd skill-lab

# Ensure rust and deno are installed, then run
deno task setup
deno task cli:install
```

Verify installation:

```bash
slab --help
```

## Build executable from source

```bash

# Ensure rust and deno are installed, then run
deno task setup
deno task cli:build
```
