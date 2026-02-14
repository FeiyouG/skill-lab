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

Download the archive for your platform from:

- macOS ARM64: `slab-macos-arm64.tar.gz`
- Linux x64: `slab-linux-x64.tar.gz`
- Windows x64: `slab-windows-x64.zip`

Release page: `https://github.com/feiyoug/skill-lab/releases`

Extract and install (macOS/Linux):

```bash
mkdir -p ~/.local/lib/slab
tar -xzf slab-macos-arm64.tar.gz -C ~/.local/lib/slab
mkdir -p ~/.local/bin
ln -sf ~/.local/lib/slab/slab ~/.local/bin/slab
```

Verify installation:

```bash
slab --help
```

On macOS, if Gatekeeper blocks `slab-bin` or `*-parser.so`, run once:

```bash
xattr -dr com.apple.quarantine ~/.local/lib/slab
```

For details about the runtime layout, see [development notes](/development/astgrep)

## Install from source (Deno)

```bash
git clone https://github.com/feiyoug/skill-lab.git
cd skill-lab
deno task cli:install
```

Verify installation:

```bash
slab --help
```

## Build executable from source

```bash
deno task cli:build
```
