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
              @-webkit-keyframes pulse {
                0% {
                  background: #2e83e3;
                }
                100% {
                  background: #88b4e7;
                }
              }
              @keyframes pulse {
                0% {
                  background: #2e83e3;
                }
                100% {
                  background: #88b4e7;
                }
              }
              body {
                margin: 0;
                padding: 40px;
                max-width: 600px;
                background: #f2f1f6;
              }
              .header {
                border-bottom: 10px solid #f2f1f6;
                padding: 24px;
                font-size: 18px;
                font-family: menlo;
                font-weight: bold;
                background: #fff;
              }
              .header__home {
                display: inline-block;
                text-decoration: none;
                color: #2e83e3;
              }
              .header__home:hover {
                text-decoration: underline;
              }
              .header__seg {
                display: inline-block;
                text-decoration: none;
                color: #303030;
              }
              .header__seg:hover {
                text-decoration: underline;
              }
              .header__sep {
                display: inline-block;
                color: #303030;
              }
              .list {
                margin: 0;
                padding: 0;
                background: #fff;
              }
              .list__item--file {
                margin: 0;
                padding: 0;
                list-style: none;
                border-bottom: 1px solid #f2f1f6;
              }
              .list__item--file svg {
                vertical-align: middle;
                width: 28px;
              }
              .list__item--dir {
                margin: 0;
                padding: 0;
                list-style: none;
                border-bottom: 1px solid #f2f1f6;
              }
              .list__item--dir svg {
                vertical-align: middle;
                width: 28px;
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
              .list__item_link.clicked,
              .list__item_link.clicked:hover {
                color: #fff;
                -webkit-animation: pulse 1s ease-in-out infinite alternate;
                animation: pulse 1s ease-in-out infinite alternate;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <a href="/" class="header__home">~</a>
              <span class="header__sep">/</span>
              ${path
                .split("/")
                .slice(1)
                .map((seg, i) => {
                  const href = path
                    .split("/")
                    .slice(1, i + 1)
                    .concat([seg])
                    .join("/");
                  return `<a class="header__seg" href="/${href}">${seg}</a>`;
                })
                .join(`\n<span class="header__sep">/</span>\n`)}
            </div>
            <ul class="list">
              ${files
                .map(x => ({ name: x, path: Path.resolve(__dirname, path, x) }))
                .filter(file => fs.lstatSync("." + file.path).isDirectory())
                .map(file => {
                  return `
                    <li class="list__item--dir">
                      <a class="list__item_link" href="${file.path}">
                        <svg id="Layer_1" version="1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                          <style>
                            .st4{fill:none;stroke:#444b54;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10}
                          </style>
                          <path d="M109 19H24c-3 0-5 2-5 5v85c0 3 2 5 5 5h85c3 0 5-2 5-5V24c0-3-2-5-5-5z" fill="#fff"/>
                          <path d="M96 59H59L49 49H24c-3 0-5 2-5 5v55c0 3 2 5 5 5h77V64c0-3-3-5-5-5z" fill="#fff0b3"/>
                          <path d="M39 109c0 3 2 5 5 5h57v-10H44c-3 0-5 2-5 5z" fill="#f2b630"/>
                          <path class="st4" d="M107 114H24c-3 0-5-2-5-5V54c0-3 2-5 5-5h22l5 2 6 6 5 2h34c2 0 5 2 5 5v43c0 4 3 7 6 7 4 0 7-3 7-7V59M114 59V24c0-3-2-5-5-5H24c-3 0-5 2-5 5v16"/>
                        </svg>
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
                        <svg id="Layer_1" version="1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                          <style>
                            .st8{fill:#c3dbea}
                          </style>
                          <path d="M99 114H29c-3 0-5-2-5-5V19c0-3 2-5 5-5h55l20 20v75c0 3-2 5-5 5z" fill="#fff"/>
                          <path d="M95 37H81V14H29c-3 0-5 2-5 5v90c0 3 2 5 5 5h70c3 0 5-2 5-5V34L84 14h-3" fill="none" stroke="#444b54" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"/>
                          <path class="st8" d="M79 79H49a15 15 0 1 0 30 0z"/>
                          <circle class="st8" cx="49" cy="59" r="8"/>
                          <path class="st8" d="M83 62h-9c-2 0-3-1-3-3s1-3 3-3h9c2 0 3 1 3 3s-1 3-3 3z"/>
                        </svg>
                        ${file.name}
                      </a>
                    </li>
                  `;
                })
                .join("\n")}
            </ul>
            <script type="text/javascript">
              document.querySelectorAll(".list__item_link").forEach(function(element) {
                element.addEventListener("click", function(event) {
                  event.target.classList.add("clicked");
                });
              });
            </script>
          </body>
        </html>
      `
        .split("\n")
        .map(s => s.trim())
        .join("\n");
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

app.use("/", express.static("./", { dotfiles: "allow" }));

app.listen(port, () =>
  console.log(
    `Go to <http://localhost:${port}> to see your project dashboard.`,
  ),
);
