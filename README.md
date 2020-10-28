# Magnetron Extension Pack

> An opinionated extension pack for VS Code.

This extension pack provides the following extensions:

- [Magnetron BPMN](https://github.com/QuarksEcosystem/vs-code-magnetron-bpmn) - VS Code Extension for Displaying and Editing BPMN Features Files

- [Swagger Viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) - Swagger Viewer lets you preview and validate Swagger 2.0 and OpenAPI files as you type in Visual Studio Code.


# Development

- Clone the repo

```bash
$ git clone https://github.com/robertoachar/vscode-extension-pack.git
```

- Build the extension file

```bash
$ npx vsce package
```

- Install the extension from a package file (.vsix)

1. Launch Visual Studio Code
2. Choose **Extensions** from menu
3. Click **More** > **Install from VSIX...**
4. Select the file `vscode-extension-pack-x.x.x.vsix`
5. Click **Reload Now** to reload the Code
