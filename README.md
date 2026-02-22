# Create Marp Presentation

Create a new Marp presentation with a single command.

## Installation

```bash
npx create-marp-presentation my-presentation
```

## Usage

```bash
cd my-presentation
npm run dev     # Live preview
npm run build:all  # Build all formats
```

## Features

- 🚀 One-command setup
- 📝 Markdown slides
- 🎨 Marp themes
- 📦 HTML, PDF, PPTX export
- 📁 Static files support
- 🔥 Live preview

## Local Testing

To test project generation without publishing to npm:

```bash
# Clone the repository
git clone https://github.com/echernyshev/marp-presentation-template.git
cd marp-presentation-template

# Install dependencies for tests
npm install

# Run tests
npm test

# Create a test project (interactive mode)
node index.js test-project

# Check the contents
cd test-project
ls -la
npm run dev
```

Other example commands:

```bash
# Create a test project without examples
echo "n" | node index.js test-project-minimal
```

## Documentation

After creating a project, read the README in the project folder.

## License

MIT
