#!/usr/bin/env node

const http = require("http");
const fs = require("graceful-fs");
const Path = require("path");
const express = require("express");
const webpack = require("webpack");
const MemoryFileSystem = require("memory-fs");
const ufs = require("unionfs").ufs;
const program = require("commander");
const mfs = new MemoryFileSystem();

ufs.use(mfs).use(fs);

program
  .version("0.1.0")
  .option("-p, --port <n>", "Port for the web server", parseInt)
  .parse(process.argv);

const port = program.port || 8000;
const app = express();

app.get("*", (req, res, next) => {
  try {
    const path = Path.resolve(__dirname, req.url);
    const relativePath = "." + path;
    if (!fs.existsSync(relativePath)) {
      return next();
    }
    const stat = fs.lstatSync(relativePath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(relativePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${path}</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                max-width: 600px;
                background: #f2f1f6;
              }
              .header {
                border: 1px solid #f2f1f6;
                padding: 24px;
                font-size: 18px;
                font-family: menlo;
                font-weight: bold;
                border-bottom-width: 4px;
                background: #fff;
              }
              .header__home {
                color: #2e83e3;
              }
              .header__path {
                color: #303030;
              }
              .list {
                margin: 0;
                padding: 0;
                border: 1px solid #f2f1f6;
                background: #fff;
              }
              .list__item--file {
                margin: 0;
                padding: 0;
                list-style: none;
                border-bottom: 1px solid #f2f1f6;
              }
              .list__item--dir {
                margin: 0;
                padding: 0;
                list-style: none;
                border-bottom: 1px solid #f2f1f6;
              }
              .list__item--dir svg {
                vertical-align: middle;
              }
              .list__item--file:last-child,
              .list__item--dir:last-child {
                border-bottom: none;
              }
              .list__item_link {
                text-decoration: none;
                color: #303030;
                fill: #303030;
                font-family: menlo;
                font-size: 14px;
                padding: 24px;
                display: block;
              }
              .list__item_link:hover {
                background: #2e83e3;
                color: #fff;
                fill: #fff;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <span class="header__home">~</span>
              <span class="header__path">${path}</span>
            </div>
            <ul class="list">
              ${files
                .map(x => ({ name: x, path: Path.resolve(__dirname, path, x) }))
                .filter(file => fs.lstatSync("." + file.path).isDirectory())
                .map(file => {
                  return `
                      <li class="list__item--dir">
                        <a class="list__item_link" href="${file.path}">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/><path d="M0 0h24v24H0z" fill="none"/></svg>
                          ${file.name}
                        </a>
                      </li>
                    `;
                })
                .join("\n")}
              ${files
                .map(x => ({ name: x, path: Path.resolve(__dirname, path, x) }))
                .filter(file => fs.lstatSync("." + file.path).isFile())
                .map(file => {
                  return `
                      <li class="list__item--file">
                        <a class="list__item_link" href="${file.path}">
                          ${file.name}
                        </a>
                      </li>
                    `;
                })
                .join("\n")}
            </ul>
          </body>
        </html>
      `;
      res.end(html);
    } else if (stat.isFile()) {
      const ext = Path.extname(path);
      if (ext === ".js") {
        const compiler = webpack({
          mode: "development",
          entry: relativePath,
          output: {
            filename: "bundle.js",
            path: "/",
          },
          resolveLoader: {
            modules: [Path.resolve(__dirname, "node_modules")],
          },
          module: {
            rules: [
              {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                  loader: "babel-loader",
                },
              },
            ],
          },
        });

        // compiler.inputFileSystem = fs;
        compiler.outputFileSystem = mfs;
        // compiler.resolvers.normal.fileSystem = memoryFs;
        // compiler.resolvers.context.fileSystem = memoryFs;

        compiler.run((err, stats) => {
          handleCompilerError(err, stats);

          const jsContent = stats.compilation.assets["bundle.js"].source();

          const html = `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <title>${req.url}</title>
              </head>
              <body>
                <div id="app"></div>
                <script type="text/javascript">${jsContent}</script>
              </body>
            </html>
          `;
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        });
      } else if (ext === ".elm") {
        mfs.writeFileSync(
          "/app.js",
          `const Elm = require("${Path.resolve(relativePath)}").Elm;
          function init(elm) {
            const elmModule = elm[Object.keys(elm)[0]];
            if (elmModule.init) {
              elmModule.init({ node: document.getElementById("app") });
            } else {
              init(elmModule);
            }
          };
          init(Elm);
          `,
          "utf-8",
        );
        const compiler = webpack({
          mode: "development",
          entry: "/app.js",
          module: {
            rules: [
              {
                test: /\.elm$/,
                exclude: [/elm-stuff/, /node_modules/],
                use: [
                  {
                    loader: "elm-webpack-loader",
                    options: {
                      debug: true,
                      forceWatch: true,
                    },
                  },
                ],
              },
            ],
          },
          resolveLoader: {
            modules: [Path.resolve(__dirname, "node_modules")],
          },
          output: {
            filename: "bundle.js",
            path: "/",
          },
        });

        compiler.inputFileSystem = ufs;
        compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
        compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
        compiler.outputFileSystem = mfs;

        compiler.run((err, stats) => {
          handleCompilerError(err, stats);

          const jsContent = stats.compilation.assets["bundle.js"].source();

          const html = `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <title>${req.url}</title>
              </head>
              <body>
                <div id="app"></div>
                <script type="text/javascript">${jsContent}</script>
              </body>
            </html>
          `;
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        });
      } else if (ext === ".html") {
        const content = fs.readFileSync(relativePath, "utf8");
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(content);
      } else {
        next();
      }
    } else {
      throw new Error("Not a file or directory");
    }
  } catch (error) {
    console.log(error);
  }
});

function handleCompilerError(err, stats) {
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    return;
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    console.error(info.errors);
  }

  if (stats.hasWarnings()) {
    console.warn(info.warnings);
  }
}

app.use("/", express.static("./"));

app.listen(port, () =>
  console.log(
    `Go to <http://localhost:${port}> to see your project dashboard.`,
  ),
);
