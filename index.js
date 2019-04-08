const http = require("http");
const fs = require("fs");
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
          </head>
          <body>
            ${files
              .map(fileOrDictionary => {
                const fpath = Path.resolve(__dirname, path, fileOrDictionary);
                const fstat = fs.lstatSync("." + fpath);
                if (fstat.isFile()) {
                  return `<li><a href="${fpath}">${fileOrDictionary}</a></li>`;
                } else if (fstat.isDirectory()) {
                  return `<li><a href="${fpath}">${fileOrDictionary}</a></li>`;
                } else {
                  return `<li><a href="${fpath}">${fileOrDictionary}</a></li>`;
                }
              })
              .join("\n")}
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
          if (err || stats.hasErrors()) {
            throw "COMPILER ERROR";
          }

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
                  { loader: "elm-hot-webpack-loader" },
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
          if (err || stats.hasErrors()) {
            throw "COMPILER ERROR";
          }

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
    throw new Error(error.toString());
  }
});

app.use("/", express.static(__dirname));

app.listen(port, () =>
  console.log(
    `Go to <http://localhost:${port}> to see your project dashboard.`,
  ),
);
