---
publish: true
kind: writeup
---
# Nix

> Nix is a powerful, functional package manager for Linux, macOS, and other Unix-like systems. It emphasizes reproducibility, reliability, and declarative configuration, making it a cornerstone of the NixOS Linux distribution.

That being said, I *really* enjoy it, since it solved a couple different related issues that I was having: ease of development, [package availability](https://devops.com/wp-content/uploads/2023/05/E7A05D5F-6B38-4C03-8E35-8FF316E3A143.jpeg), and [community support](https://www.youtube.com/watch?v=sHQFGhTiyk0).

## Key Features and What It Does

- **Reproducible Builds**: Nix builds packages in a isolated environment using a hash-based dependency system. This ensures that the same source code and inputs always produce identical outputs, regardless of the system or time of build. Packages are stored immutably in the Nix store (typically `/nix/store`), identified by unique cryptographic hashes.

- **Multiple Versions Coexistence**: Unlike traditional package managers (e.g., apt or yum), Nix allows multiple versions of the same software to be installed simultaneously without conflicts. This is ideal for development environments where you might need different versions of tools like Python or Node.js.

- **Atomic Upgrades and Rollbacks**: Installing, upgrading, or removing packages is atomic—either everything succeeds or nothing changes. Nix also supports easy rollbacks to previous system states, which is particularly useful in NixOS for entire OS configurations.

- **Declarative Package Management**: Packages and system configurations are defined using the Nix language, a purely functional, domain-specific language. This allows you to describe your desired system state in a single file (e.g., `configuration.nix`), and Nix will ensure the system matches it.

- **Cross-Platform and Portable**: Nix works on Linux, macOS, and even Windows (via WSL). It can create portable environments, such as development shells with `nix-shell`, which set up dependencies without polluting the global system.

## Common Use Cases

- **Development Environments**: Use `nix-shell` to create temporary environments with specific tool versions (e.g., `nix-shell -p python39`).
- **System Management**: In NixOS, the entire operating system is managed declaratively.
- **Container-like Isolation**: Similar to Docker but at the package level, Nix enables reproducible deployments without virtual machines.
## Where it could be better, or I need to read more :(

- Admittingly, Nix has one massive downfall: the documentation has been lacking for a long time, and while it is being improved, it needs alot of work.
- [The package count is a bit of a stretch](https://www.reddit.com/r/NixOS/comments/1g1zn65/nix_has_actually_less_packages_than_aur/)

I do really like nix, and I do have alot more to say soon. Just wanted to place this filler page for now so I can work on it later.

## Want to Learn it?
- [Home-manager Guide (But actually good at explaining everything "experimental")](https://github.com/Evertras/simple-homemanager/tree/main)
- [Awesome Nix](https://github.com/nix-community/awesome-nix)

---
[[main/Resources|Resources]]
