const http = require('http');
const fs = require('fs');
const Path = require('path');

const hostname = 'localhost';
const port = 3000;

const server = http.createServer((req, res) => {
  try {
    const stat = fs.lstatSync("." + req.url)
    if (stat.isDirectory()) {
      const files = fs.readdirSync("." + req.url)
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${req.url}</title>
          </head>
          <body>
            ${files.map(fileOrDictionary => {
              const url = req.url.replace(/\/$/, "");
              const fpath = url + "/" + fileOrDictionary
              const fstat = fs.lstatSync("." + fpath)
              if (fstat.isFile()) {
                return `<li><a href="${fpath}">${fileOrDictionary}</a></li>`
              }
              else if (fstat.isDirectory()) {
                return `<li><a href="${fpath}">${fileOrDictionary}</a></li>`
              } else {
                return `<li><a href="${fpath}">${fileOrDictionary}</a></li>`
              }
            }).join("\n")}
          </body>
        </html>
      `
      res.end(html);
    }
    else if (stat.isFile()) {
      const path = "." + req.url;
      const ext = Path.extname(path);
      if (ext === ".js") {
        const html = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>${req.url}</title>
            </head>
            <body>
              <div id="app"></div>
              <script src="......." />
            </body>
          </html>
        `
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      }
      else if (ext === ".html") {
        const content = fs.readFileSync(path, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(content);
      } else {
        const content = fs.readFileSync(path, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(content);
      }
    }
    else {
      throw new Error("Not a file or directory")
    }
  }
  catch (error) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain');
    res.end(error.toString())
  }
});


server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
