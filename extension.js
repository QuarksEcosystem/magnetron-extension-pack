// Ordinarily, all that's required for an extension pack is a package.json file.
// But we also need to install an unofficial fork of the vscode-styled-components extension as a workaround for this issue:
// https://github.com/styled-components/vscode-styled-components/issues/81
//
// That's the purpose of this entire extension.js file.
//
// IMPORTANT: If we ever need to upgrade the vscode-styled-components-FORK (or install any other unofficial extensions),
// remember to update the EXTENSION_VERSION constant to match the version number in package.json.

// The module 'vscode' contains the VS Code extensibility API
const vscode = require("vscode");
const http = require("http");
const https = require("https");
const fetch = require("node-fetch");
const fs = require("fs");
const { spawn } = require("child_process");
const { ensureDir } = require("fs-extra");
const {
  window: { showInformationMessage, showErrorMessage },
  commands,
} = vscode;

const quarksExtensions = ["vs-code-magnetron-bpmn"];
const marketplaceExtensions = ["arjun.swagger-viewer"];

function downloadFile(url, w) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res1) => {
        const protocol = /^https:/.exec(res1.headers.location) ? https : http;

        protocol
          .get(res1.headers.location, (res2) => {
            const total = parseInt(res2.headers["content-length"], 10);
            res2.pipe(w);
            res2.on("error", reject);
            res2.on("end", resolve);
          })
          .on("error", reject);
      })
      .on("error", reject);
  });
}

async function postInstallOrUpdate(context, ext, version, url) {
  // If we were using only extensions available in the VS Code marketplace, we would be done at this point.
  // But we also need to install an unofficial fork of the vscode-styled-components, as described above.
  //
  // The below code downloads the extension package for the forked version and installs it using the
  // 'code' command-line tool.

  showInformationMessage(`Downloading ${ext}...`);

  const tmpPath = "~/.quarks/vscode-quarks-extensions/";
  return ensureDir(tmpPath)
    .then(() => {
      const fileName = `${ext}-${version}.vsix`;
      const tempFile = tmpPath + fileName;
      const dest = fs.createWriteStream(tempFile);
      return downloadFile(url, dest)
        .then(() => {
          const codeProcess = spawn("code", ["--install-extension", tempFile]);
          const codeProcessErrors = [];
          codeProcess.on("close", async (exitCode) => {
            if (exitCode === 0) {
              showInformationMessage(
                `${ext} version ${version} installed successfully`
              );

              return await context.globalState.update(`${ext}-lastVersion`, version);
            } else {
              showInformationMessage(
                `Error installing ${ext}: code --install-extension command exited with code ${exitCode}.` +
                  `Error messages: ${codeProcessErrors.join(", ")}`
              );
            }
            fs.unlink(tmpPath, () => ({}));
          });
          codeProcess.stderr.on("data", (message) => {
            codeProcessErrors.push(message);
          });
        })
        .catch((err) => {
          showErrorMessage(err.message);
        });
    })
    .catch((err) => {
      showErrorMessage(err.message);
    });

  // const codeBin = vscode.env.appRoot
}

// this function is called when the extension is activated
exports.activate = async function activate(context) {
  // showInformationMessage('prevInstalledVersion', prevInstalledVersion)

  // We only need to run the below code when the extension is installed or updated;
  // exit early if the current version is already installed and activated.
  //
  // Unfortunately it doesn't seem that VS Code provides post-install or post-update hooks, so we have to do a manual
  // workaround to see if this extension was already installed - we log the version number whenever a new version is installed,
  // and then check the log on startup.
  //
  // @NB: The logged version number never gets removed because there seems to be no post-uninstall hook either.
  // So uninstalling and re-installing the same version of the extension will not cause the postInstall() function to run again.
  // But that should be OK as long as no one manually uninstalls vscode-styled-components-FORK.
  // And if they do, they can manually reinstall it by downloading and installing the VSIX file at the link above.
  // The command to install it manually looks like this:
  //     code --install-extension vscode-styled-components-fork-0.0.21.vsix
  //
  // Also note that if this extension pack is uninstalled, vscode-styled-components-FORK is not automatically uninstalled with it.
  const installedExtensions = await new Promise((resolve, reject) => {
    const resolveValue = [];
    spawn("code", ["--list-extensions"])
      .stdout.on("data", async (data) => {
        resolveValue.push(data.toString());
      })
      .on("end", () => resolve(resolveValue.join("")));
  });

  const installedVersions = await Promise.all(
    quarksExtensions.map((ext) => {
      return context.globalState.get(`${ext}-lastVersion`);
    })
  );

  const latestVersions = await Promise.all(
    quarksExtensions.map((ext) => {
      const options = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-agent": "node.js",
        },
      };
      return fetch(
        `https://api.github.com/repos/QuarksEcosystem/${ext}/releases/latest`,
        options
      );
    })
  )
    .then((res) => {
      return Promise.all(res.map((r) => r.json()));
    })
    .then((releases) => {
      return releases.map((r) => ({
        version: r.tag_name,
        assetUrl: r.assets[0].browser_download_url,
      }));
    });

  Promise.all(
    quarksExtensions.map((ext, index) => {
      if (
        latestVersions[index].version !== installedVersions[index] ||
        !installedExtensions.includes(ext)
      ) {
        return postInstallOrUpdate(
          context,
          ext,
          latestVersions[index].version,
          latestVersions[index].assetUrl
        );
      }

      return Promise.resolve(true);
    })
  ).then((installed) => {
    if (installed.filter(i => !i).length > 0) {
      showInformationMessage(
        "All Magnetron Extensions installed, reload VSCode",
        "Reload"
      ).then(async (action) => {
        if (action === "Reload")
          commands.executeCommand("workbench.action.reloadWindow");
      });
    }
  });
};
