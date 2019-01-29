const path = require("path"),
  fs = require("fs"),
//  sqlite3 = require("sqlite3").verbose(),
  sqliteDatabase = require("../node_modules/better-sqlite3"),
  uuidV4 = require("uuid/v4"),
  moment = require("moment"),
  copyFileSync = require("fs-copy-file-sync");

let edge = null,
  browserHistoryDllPath = "",
  getInternetExplorerHistory = null,
  browsers = require("./browsers");

if (process.platform === "win32") {
  // Check to see if electron is installed for people that want to use this with any electron applications
  edge = process.versions.electron
    ? require("electron-edge-js")
    : require("edge-js");

  if (
    fs.existsSync(
      path.resolve(
        path.join(
          __dirname,
          "..",
          "..",
          "src",
          "renderer",
          "assets",
          "dlls",
          "IEHistoryFetcher.dll"
        )
      )
    )
  ) {
    browserHistoryDllPath = path.join(
      __dirname,
      "..",
      "..",
      "src",
      "renderer",
      "assets",
      "dlls",
      "IEHistoryFetcher.dll"
    );
  } else if (
    fs.existsSync(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "src",
        "renderer",
        "assets",
        "dlls",
        "IEHistoryFetcher.dll"
      )
    )
  ) {
    browserHistoryDllPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "src",
      "renderer",
      "assets",
      "dlls",
      "IEHistoryFetcher.dll"
    );
  } else {
    browserHistoryDllPath = path.resolve(
      path.join(__dirname, "dlls", "IEHistoryFetcher.dll")
    );
  }

  getInternetExplorerHistory = edge.func({
    assemblyFile: browserHistoryDllPath,
    typeName: "BrowserHistory.Fetcher",
    methodName: "getInternetExplorer"
  });
}

let allBrowserRecords = [];

/**
 * Runs the the proper function for the given browser. Some browsers follow the same standards as
 * chrome and firefox others have their own syntax.
 * Returns an empty array or an array of browser record objects
 * @param paths
 * @param browserName
 * @param historyTimeLength
 * @returns {Promise<array>}
 */
function oldGetBrowserHistory(paths = [], browserName, historyTimeLength) {
  return new Promise((resolve, reject) => {
    if (
      browserName === browsers.FIREFOX ||
      browserName === browsers.SEAMONKEY
    ) {
      getMozillaBasedBrowserRecords(paths, browserName, historyTimeLength).then(
        foundRecords => {
          allBrowserRecords = allBrowserRecords.concat(foundRecords);
          resolve(foundRecords);
        },
        error => {
          reject(error);
        }
      );
    } else if (
      browserName === browsers.CHROME ||
      browserName === browsers.OPERA ||
      browserName === browsers.TORCH ||
      browserName === browsers.VIVALDI
    ) {
      getChromeBasedBrowserRecords(paths, browserName, historyTimeLength).then(
        foundRecords => {
          allBrowserRecords = allBrowserRecords.concat(foundRecords);
          resolve(foundRecords);
        },
        error => {
          reject(error);
        }
      );
    } else if (browserName === browsers.MAXTHON) {
      getMaxthonBasedBrowserRecords(paths, browserName, historyTimeLength).then(
        foundRecords => {
          allBrowserRecords = allBrowserRecords.concat(foundRecords);
          resolve(foundRecords);
        },
        error => {
          reject(error);
        }
      );
    } else if (browserName === browsers.SAFARI) {
      getSafariBasedBrowserRecords(paths, browserName, historyTimeLength).then(
        foundRecords => {
          allBrowserRecords = allBrowserRecords.concat(foundRecords);
          resolve(foundRecords);
        },
        error => {
          reject(error);
        }
      );
    } else if (browserName === browsers.INTERNETEXPLORER) {
      //Only do this on Windows we have to do t his here because the DLL manages this
      if (process.platform !== "win32") {
        resolve();
      }
      getInternetExplorerBasedBrowserRecords(historyTimeLength).then(
        foundRecords => {
          allBrowserRecords = allBrowserRecords.concat(foundRecords);
          resolve(allBrowserRecords);
        },
        error => {
          reject(error);
        }
      );
    }
  });
}

function getBrowserHistory(paths = [], browserName, historyTimeLength) {
  return (function() {
    var foundRecords;
    if (
      browserName === browsers.FIREFOX ||
      browserName === browsers.SEAMONKEY
    ) {
      foundRecords = getMozillaBasedBrowserRecords(
        paths,
        browserName,
        historyTimeLength
      );
      return foundRecords;
    } else if (
      browserName === browsers.CHROME ||
      browserName === browsers.OPERA ||
      browserName === browsers.TORCH ||
      browserName === browsers.VIVALDI
    ) {
      foundRecords = getChromeBasedBrowserRecords(
        paths,
        browserName,
        historyTimeLength
      );
      return foundRecords;
    }
    else if (browserName === browsers.MAXTHON) {
      foundRecords = getMaxthonBasedBrowserRecords(
        paths,
        browserName,
        historyTimeLength
      );
    //  allBrowserRecords = allBrowserRecords.concat(foundRecords);
      return foundRecords;
    }
    else if (browserName === browsers.SAFARI) {
      foundRecords = getSafariBasedBrowserRecords(
        paths,
        browserName,
        historyTimeLength
      );
      return foundRecords;
    }

    // else if (browserName === browsers.INTERNETEXPLORER) {
    //   //Only do this on Windows we have to do t his here because the DLL manages this
    //   if (process.platform !== 'win32') {
    //     resolve()
    //   }
    //   getInternetExplorerBasedBrowserRecords(historyTimeLength).then(foundRecords => {
    //     allBrowserRecords = allBrowserRecords.concat(foundRecords)
    //     resolve(allBrowserRecords)
    //   }, error => {
    //     reject(error)
    //   })
    // }
    return allBrowserRecords;
  })();
}

function getInternetExplorerBasedBrowserRecords(historyTimeLength) {
  let internetExplorerHistory = [];
  return new Promise((resolve, reject) => {
    getInternetExplorerHistory(null, (error, s) => {
      if (error) {
        throw error;
      } else {
        let currentTime = moment.utc();
        let fiveMinutesAgo = currentTime.subtract(historyTimeLength, "minutes");
        s.forEach(record => {
          let lastVisited = moment.utc(record.LastVisited);
          if (lastVisited > fiveMinutesAgo) {
            if (!record.URL.startsWith("file:///")) {
              internetExplorerHistory.push({
                title: record.Title,
                utc_time: lastVisited.valueOf(),
                url: record.URL,
                browser: browsers.INTERNETEXPLORER
              });
            }
          }
        });
        resolve(internetExplorerHistory);
      }
    });
  });
}

function getOldChromeBasedBrowserRecords(
  paths,
  browserName,
  historyTimeLength
) {
  let browserHistory = [];
  let h = [];
  console.log("Chrome");
  return new Promise((resolve, reject) => {
    if (!paths || paths.length === 0) {
      resolve(browserHistory);
    }

    for (let i = 0; i < paths.length; i++) {
      console.log("Try to read");
      if (paths[i] || paths[i] !== "") {
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".sqlite"
        );
        //Assuming the sqlite file is locked so lets make a copy of it
        console.log(paths[i]);
        let readStream = fs.createReadStream(paths[i]);
        let writeStream = fs.createWriteStream(newDbPath);
        let stream = readStream.pipe(writeStream);
        let stats = fs.statSync(paths[i]);
        console.log("file size: " + stats.size);

        stream.on("finish", () => {
          console.log("file size(copied): " + fs.statSync(newDbPath).size);
          let db = new sqlite3.Database(newDbPath, err => {
            if (err) {
              console.error(err.message);
            }
            console.log("Connected to the database: " + db);
            db.serialize(() => {
              console.log("after Connection and Serialized");
              //    console.log(db);
              db.each(
                "",
                function(err, row) {
                  if (err) {
                    console.log("Erron");
                    reject(err);
                  } else {
                    console.log("Row: " + row);
                    let t = moment.unix(
                      row.last_visit_time / 1000000 - 11644473600
                    );
                    browserHistory.push({
                      title: row.title,
                      utc_time: t.valueOf(),
                      url: row.url,
                      browser: browserName
                    });
                  }
                }
              );
              db.close(() => {
                console.log("Closed");
                fs.unlink(newDbPath, err => {
                  if (err) {
                    return reject(err);
                  }
                });
                resolve(browserHistory);
              });
            });
          });
        });
      }
    }
  });
}
//sqlite command for get history within specific time
//SELECT title, last_visit_time, url from urls WHERE DATETIME (last_visit_time/1000000 + (strftime('%s', '1601-01-01')), 'unixepoch')  >= DATETIME('now', '-" + historyTimeLength +" minutes')
function getChromeBasedBrowserRecords(paths, browserName, historyTimeLength) {
  return (function() {
    var browserHistory = [];
    if (!paths || paths.length === 0) {
      return browserHistory;
    }
    for (let i = 0; i < paths.length; i++) {
      if (paths[i] || paths[i] !== "") {
        if (paths[i].includes("Profile")) {
          console.log("Contains profile");
          continue;
        }
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".sqlite"
        );
        copyFileSync(paths[i], newDbPath);
        // console.log("\n\nChrome History:" + paths[i]);
        const db = new sqliteDatabase(newDbPath, { readonly: true });
        // const rows = db.prepare("SELECT * FROM urls").all();
        //get the last record
        //SELECT * FROM urls WHERE ID = (MAX(ID) FROM urls )
        // last 3 rec

        const rows = db.prepare('SELECT * FROM urls ORDER BY id DESC limit 200').all();
        console.log("length: " + db.prepare('SELECT * FROM urls').all().length);
        console.log("rows:");
    //    console.log(rows);
        // if (
        //   row.url.split(":")[0] === "http" ||
        //   row.url.split(":")[0] === "https"
        // ) {
        //   let temp = row.url.split("/");
        //   browserHistory.push({
        //     title: row.title,
        //     url: temp[0] + temp[1] + temp[2],
        //     time: moment(row.last_visit_time / 1000).format("MMM DD, YYYY")
        //   });
        // }
        //return rows;
        for (let row of rows) {
          if (
            row.url.split(":")[0] === "http" ||
            row.url.split(":")[0] === "https"
          ) {
            let temp = row.url.split("/");
            browserHistory.push({
              title: row.title,
              url: temp[0] + temp[1] + temp[2],
              time: moment(row.last_visit_time / 1000).format("MMM DD, YYYY")
            });
          }
        }
      // console.log("One set done");
      }
    }
    return browserHistory;
  })();
}

function oldGetMozillaBasedBrowserRecords(
  paths,
  browserName,
  historyTimeLength
) {
  let browserHistory = [];
  return new Promise((resolve, reject) => {
    if (!paths || paths.length === 0) {
      resolve(browserHistory);
    }
    for (let i = 0; i < paths.length; i++) {
      if (paths[i] || paths[i] !== "") {
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".sqlite"
        );

        //Assuming the sqlite file is locked so lets make a copy of it
        const originalDB = new sqlite3.Database(paths[i]);
        originalDB.serialize(() => {
          // This has to be called to merge .db-wall, the in memory db, to disk so we can access the history when
          // the browser is open
          originalDB.run("PRAGMA wal_checkpoint(FULL)");
          originalDB.close(() => {
            //Assuming the sqlite file is locked so lets make a copy of it
            let readStream = fs.createReadStream(paths[i]),
              writeStream = fs.createWriteStream(newDbPath),
              stream = readStream.pipe(writeStream);

            stream.on("finish", function() {
              const db = new sqlite3.Database(newDbPath);
              db.serialize(function() {
                db.each(
                  "SELECT title, last_visit_date, url from moz_places WHERE DATETIME (last_visit_date/1000000, 'unixepoch')  >= DATETIME('now', '-" +
                    historyTimeLength +
                    " minutes')",
                  function(err, row) {
                    if (err) {
                      reject(err);
                    } else {
                      let t = moment.unix(row.last_visit_date / 1000000);
                      browserHistory.push({
                        title: row.title,
                        utc_time: t.valueOf(),
                        url: row.url,
                        browser: browserName
                      });
                    }
                  }
                );
                db.close(() => {
                  fs.unlink(newDbPath, err => {
                    if (err) {
                      return reject(err);
                    }
                  });
                  resolve(browserHistory);
                });
              });
            });
          });
        });
      }
    }
  });
}

function getMozillaBasedBrowserRecords(paths, browserName, historyTimeLength) {
  return (function() {
    var browserHistory = [];
    if (!paths || paths.length === 0) {
      return browserHistory;
    }
    for (let i = 0; i < paths.length; i++) {
      console.log("Try to read");
      if (paths[i] || paths[i] !== "") {
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".sqlite"
        );
        copyFileSync(paths[i], newDbPath);
        console.log("\n\n\nFirefox History File Name " + paths[i]);
        const db = new sqliteDatabase(newDbPath, { readonly: true });
        const rows = db.prepare("select * from moz_places  ORDER BY id DESC limit 200").all();
        console.log("Rows: ");
        //get the last record
      //  const rows = db.prepare('SELECT * FROM moz_places WHERE ID = (SELECT MAX(ID) FROM moz_places)').get();
      //   console.log(rows);
        for (let row of rows) {
          if (
            row.url.split(":")[0] === "http" ||
            row.url.split(":")[0] === "https"
          ) {
            let temp = row.url.split("/");
            browserHistory.push({
              title: row.title,
              url: temp[0] + temp[1] + temp[2],
              time: moment(row.last_visit_date / 1000).format("MMM DD, YYYY")
            });
          }
        }
        console.log("Finished reding.");
      }
    }
    return browserHistory;
  })();
}

function oldGetMaxthonBasedBrowserRecords(paths, browserName, historyTimeLength) {
  let browserHistory = [];
  return new Promise((resolve, reject) => {
    if (!paths || paths.length === 0) {
      resolve(browserHistory);
    }
    for (let i = 0; i < paths.length; i++) {
      if (paths[i] || paths[i] !== "") {
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".db"
        );

        //Assuming the sqlite file is locked so lets make a copy of it
        const originalDB = new sqlite3.Database(paths[i]);
        originalDB.serialize(() => {
          // This has to be called to merge .db-wall, the in memory db, to disk so we can access the history when
          // safari is open
          originalDB.run("PRAGMA wal_checkpoint(FULL)");
          originalDB.close(() => {
            let readStream = fs.createReadStream(paths[i]),
              writeStream = fs.createWriteStream(newDbPath),
              stream = readStream.pipe(writeStream);

            stream.on("finish", function() {
              const db = new sqlite3.Database(newDbPath);
              db.serialize(() => {
                db.run("PRAGMA wal_checkpoint(FULL)");
                db.each(
                  "SELECT `zlastvisittime`, `zhost`, `ztitle`, `zurl` FROM   zmxhistoryentry WHERE  Datetime (`zlastvisittime` + 978307200, 'unixepoch') >= Datetime('now', '-" +
                    historyTimeLength +
                    " minutes')",
                  function(err, row) {
                    if (err) {
                      reject(err);
                    } else {
                      let t = moment.unix(
                        Math.floor(row.ZLASTVISITTIME + 978307200)
                      );
                      browserHistory.push({
                        title: row.ZTITLE,
                        utc_time: t.valueOf(),
                        url: row.ZURL,
                        browser: browserName
                      });
                    }
                  }
                );

                db.close(() => {
                  fs.unlink(newDbPath, err => {
                    if (err) {
                      return reject(err);
                    }
                  });
                  resolve(browserHistory);
                });
              });
            });
          });
        });
      }
    }
  });
}

function getMaxthonBasedBrowserRecords(paths, browserName, historyTimeLength) {
  return (function() {
    var browserHistory = [];
    if (!paths || paths.length === 0) {
      return browserHistory;
    }
    for (let i = 0; i < paths.length; i++) {
      console.log("Try to read");
      if (paths[i] || paths[i] !== "") {
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".sqlite"
        );
        copyFileSync(paths[i], newDbPath);
        console.log("\n\n\nMaxthon History File Name " + paths[i]);
        const db = new sqliteDatabase(newDbPath, { readonly: true });
        db.prepare("PRAGMA wal_checkpoint(FULL)").run();
        const rows = db
          .prepare(
            "SELECT * FROM zmxhistoryentry"
          )
          .all();
        console.log("Rows: ");
        //console.log(rows);
        // for (let row of rows) {
        //   if(row.url.split(':')[0] === "http" || row.url.split(':')[0] === "https"){
        //     let temp = row.ZURL.split('/');
        //     browserHistory.push({
        //       url: temp[0] + temp[1]+ temp[2],
        //       time: moment(row.ZLASTVISITTIME/1000).format('MMM DD, YYYY')
        //     });
        //   }
        // }
        console.log("Finished reding.");
      }
    }
    return browserHistory;
  })();
}

function oldGetSafariBasedBrowserRecords(
  paths,
  browserName,
  historyTimeLength
) {
  let browserHistory = [];
  return new Promise((resolve, reject) => {
    if (!paths || paths.length === 0) {
      resolve(browserHistory);
    }
    for (let i = 0; i < paths.length; i++) {
      if (paths[i] || paths[i] !== "") {
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".db"
        );

        //Assuming the sqlite file is locked so lets make a copy of it
        const originalDB = new sqlite3.Database(paths[i]);
        originalDB.serialize(() => {
          // This has to be called to merge .db-wall, the in memory db, to disk so we can access the history when
          // safari is open
          originalDB.run("PRAGMA wal_checkpoint(FULL)");
          originalDB.close(() => {
            let readStream = fs.createReadStream(paths[i]),
              writeStream = fs.createWriteStream(newDbPath),
              stream = readStream.pipe(writeStream);

            stream.on("finish", function() {
              const db = new sqlite3.Database(newDbPath);
              db.serialize(() => {
                db.run("PRAGMA wal_checkpoint(FULL)");
                db.each(
                  "SELECT i.id, i.url, v.title, v.visit_time FROM history_items i INNER JOIN history_visits v on i.id = v.history_item WHERE DATETIME (v.visit_time + 978307200, 'unixepoch')  >= DATETIME('now', '-" +
                    historyTimeLength +
                    " minutes')",
                  function(err, row) {
                    if (err) {
                      reject(err);
                    } else {
                      let t = moment.unix(
                        Math.floor(row.visit_time + 978307200)
                      );
                      browserHistory.push({
                        title: row.title,
                        utc_time: t.valueOf(),
                        url: row.url,
                        browser: browserName
                      });
                    }
                  }
                );

                db.close(() => {
                  fs.unlink(newDbPath, err => {
                    if (err) {
                      return reject(err);
                    }
                  });
                  resolve(browserHistory);
                });
              });
            });
          });
        });
      }
    }
  });
}

function getSafariBasedBrowserRecords(paths, browserName, historyTimeLength) {
  return (function() {
    var browserHistory = [];
    if (!paths || paths.length === 0) {
      return browserHistory;
    }
    for (let i = 0; i < paths.length; i++) {
      console.log("Try to read");
      if (paths[i] || paths[i] !== "") {
        let newDbPath = path.join(
          process.env.TMP ? process.env.TMP : process.env.TMPDIR,
          uuidV4() + ".sqlite"
        );
        copyFileSync(paths[i], newDbPath);
        console.log("\n\n\nSafari History File Name " + paths[i]);
        const db = new sqliteDatabase(newDbPath, { readonly: true });
        db.prepare("PRAGMA wal_checkpoint(FULL)").run();
        const rows = db
          .prepare(
            "SELECT i.id, i.url, v.title, v.visit_time FROM history_items i INNER JOIN history_visits v on i.id = v.history_item"
          )
          .all();
        console.log("Rows: ");
        console.log(rows);
        // for (let row of rows) {
        //   if(row.url.split(':')[0] === "http" || row.url.split(':')[0] === "https"){
        //     let temp = row.url.split('/');
        //     browserHistory.push({
        //       url: temp[0] + temp[1]+ temp[2],
        //       time: moment(row.last_visit_date/1000).format('MMM DD, YYYY')
        //     });
        //   }
        // }
        console.log("Finished reding.");
      }
    }
    return browserHistory;
  })();
}

function oldGetMicrosoftEdgePath(microsoftEdgePath) {
  return new Promise(function(resolve, reject) {
    fs.readdir(microsoftEdgePath, function(err, files) {
      if (err) {
        resolve(null);
        return;
      }
      for (let i = 0; i < files.length; i++) {
        if (files[i].indexOf("Microsoft.MicrosoftEdge") !== -1) {
          microsoftEdgePath = path.join(
            microsoftEdgePath,
            files[i],
            "AC",
            "MicrosoftEdge",
            "User",
            "Default",
            "DataStore",
            "Data",
            "nouser1"
          );
          break;
        }
      }
      fs.readdir(microsoftEdgePath, function(err2, files2) {
        if (err) {
          resolve(null);
        }
        //console.log(path.join(microsoftEdgePath, files2[0], "DBStore", "spartan.edb"));
        resolve(
          path.join(microsoftEdgePath, files2[0], "DBStore", "spartan.edb")
        );
      });
    });
  });
}
function getMicrosoftEdgePath(microsoftEdgePath) {
  return function() {
    fs.readdirSync(microsoftEdgePath, function(err, files) {
      if (err) {
        console.log(err);;
        return;
      }
      for (let i = 0; i < files.length; i++) {
        if (files[i].indexOf("Microsoft.MicrosoftEdge") !== -1) {
          microsoftEdgePath = path.join(
            microsoftEdgePath,
            files[i],
            "AC",
            "MicrosoftEdge",
            "User",
            "Default",
            "DataStore",
            "Data",
            "nouser1"
          );
          break;
        }
      }
      fs.readdirSync(microsoftEdgePath, function(err2, files2) {
        if (err) {
          resolve(null);
        }
        //console.log(path.join(microsoftEdgePath, files2[0], "DBStore", "spartan.edb"));
        resolve(
          path.join(microsoftEdgePath, files2[0], "DBStore", "spartan.edb")
        );
      });
    });
  }();
}

function getFirefoxHistory(historyTimeLength = 5) {
  return (function(historyTimeLength) {
    browsers.browserDbLocations.firefox = browsers.findPaths(
      browsers.defaultPaths.firefox,
      browsers.FIREFOX
    );
    let getPaths = browsers.findPaths(
      browsers.defaultPaths.firefox,
      browsers.FIREFOX
    );
    console.log("historyTimeLength: " + historyTimeLength);
    console.log("firefox");
    console.log(getPaths);
    let records = getBrowserHistory(
      browsers.browserDbLocations.firefox,
      browsers.FIREFOX,
      historyTimeLength
    );
    return records;
  })(historyTimeLength);
}

/**
 * Gets Firefox history
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function oldGetFirefoxHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.firefox, browsers.FIREFOX)
        .then(foundPaths => {
          browsers.browserDbLocations.firefox = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.firefox,
            browsers.FIREFOX,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

/**
 * Gets Seamonkey History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function getSeaMonkeyHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.seamonkey, browsers.SEAMONKEY)
        .then(foundPaths => {
          browsers.browserDbLocations.seamonkey = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.seamonkey,
            browsers.SEAMONKEY,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

/**
 * Gets Chrome History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function oldGetChromeHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.chrome, browsers.CHROME)
        .then(foundPaths => {
          browsers.browserDbLocations.chrome = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.chrome,
            browsers.CHROME,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

function getChromeHistory(historyTimeLength) {
  return (function(historyTimeLength) {
    browsers.browserDbLocations.chrome = browsers.findPaths(
      browsers.defaultPaths.chrome,
      browsers.CHROME
    );
    let getPaths = browsers.findPaths(
      browsers.defaultPaths.chrome,
      browsers.CHROME
    );
    let getRecords = getBrowserHistory(
      browsers.browserDbLocations.chrome,
      browsers.CHROME,
      historyTimeLength
    );
    return getRecords;
  //  console.log("Records");
  //  console.log(getRecords);
  })(historyTimeLength);
}
/**
 * Get Opera History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function oldGetOperaHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.opera, browsers.OPERA)
        .then(foundPaths => {
          browsers.browserDbLocations.opera = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.opera,
            browsers.OPERA,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

function getOperaHistory(historyTimeLength = 5) {
  return (function(historyTimeLength) {
    browsers.browserDbLocations.opera = browsers.findPaths(
      browsers.defaultPaths.opera,
      browsers.OPERA
    );
    let getPaths = browsers.findPaths(
      browsers.defaultPaths.opera,
      browsers.OPERA
    );
    console.log("historyTimeLength: " + historyTimeLength);
    console.log("Chrome");
    console.log(getPaths);
    let getRecords = getBrowserHistory(
      browsers.browserDbLocations.opera,
      browsers.OPERA,
      historyTimeLength
    );
    console.log("Records");
    console.log(getRecords);
  })(historyTimeLength);
}

/**
 * Get Torch History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function oldGetTorchHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.torch, browsers.TORCH)
        .then(foundPaths => {
          browsers.browserDbLocations.torch = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.torch,
            browsers.TORCH,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

function getTorchHistory(historyTimeLength = 5) {
  return (function(historyTimeLength) {
    browsers.browserDbLocations.torch = browsers.findPaths(
      browsers.defaultPaths.torch,
      browsers.TORCH
    );
    let getPaths = browsers.findPaths(
      browsers.defaultPaths.torch,
      browsers.TORCH
    );
    console.log("historyTimeLength: " + historyTimeLength);
    console.log("Chrome");
    console.log(getPaths);
    let getRecords = getBrowserHistory(
      browsers.browserDbLocations.torch,
      browsers.TORCH,
      historyTimeLength
    );
    console.log("Records");
    console.log(getRecords);
  })(historyTimeLength);
}
/**
 * Get Safari History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function oldGetSafariHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.safari, browsers.SAFARI)
        .then(foundPaths => {
          browsers.browserDbLocations.safari = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.safari,
            browsers.SAFARI,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

function getSafariHistory(historyTimeLength = 5) {
  return (function(historyTimeLength) {
    browsers.browserDbLocations.safari = browsers.findPaths(
      browsers.defaultPaths.safari,
      browsers.SAFARI
    );
    let getPaths = browsers.findPaths(
      browsers.defaultPaths.safari,
      browsers.SAFARI
    );
    console.log("historyTimeLength: " + historyTimeLength);
    console.log("Safari");
    console.log(getPaths);
    let getRecords = getBrowserHistory(
      browsers.browserDbLocations.safari,
      browsers.SAFARI,
      historyTimeLength
    );
    console.log("Records");
    console.log(getRecords);
  })(historyTimeLength);
}

/**
 * Get Maxthon History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function oldGetMaxthonHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.maxthon, browsers.MAXTHON)
        .then(foundPaths => {
          browsers.browserDbLocations.maxthon = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.maxthon,
            browsers.MAXTHON,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}
function getMaxthonHistory() {
  return (function(historyTimeLength) {
    browsers.browserDbLocations.maxthon = browsers.findPaths(
      browsers.defaultPaths.maxthon,
      browsers.MAXTHON
    );
    let getPaths = browsers.findPaths(
      browsers.defaultPaths.maxthon,
      browsers.MAXTHON
    );
    console.log("historyTimeLength: " + historyTimeLength);
    console.log("MAXTHON");
    console.log(getPaths);
    let getRecords = getBrowserHistory(
      browsers.browserDbLocations.maxthon,
      browsers.MAXTHON,
      historyTimeLength
    );
    console.log("Records");
    console.log(getRecords);
  })(historyTimeLength);
}

/**
 * Get Vivaldi History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function oldGetVivaldiHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.vivaldi, browsers.VIVALDI)
        .then(foundPaths => {
          browsers.browserDbLocations.vivaldi = foundPaths;
        })
    ];
    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.vivaldi,
            browsers.VIVALDI,
            historyTimeLength
          )
        ];
        Promise.all(getRecords).then(
          records => {
            resolve(records);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

function getVivaldiHistory(historyTimeLength = 5) {
  return (function(historyTimeLength) {
    browsers.browserDbLocations.vivaldi = browsers.findPaths(
      browsers.defaultPaths.vivaldi,
      browsers.VIVALDI
    );
    let getPaths = browsers.findPaths(
      browsers.defaultPaths.vivaldi,
      browsers.VIVALDI
    );
    console.log("historyTimeLength: " + historyTimeLength);
    console.log("Chrome");
    console.log(getPaths);
    let getRecords = getBrowserHistory(
      browsers.browserDbLocations.vivaldi,
      browsers.VIVALDI,
      historyTimeLength
    );
    console.log("Records");
    console.log(getRecords);
  })(historyTimeLength);
}
/**
 * Get Internet Explorer History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
function getIEHistory(historyTimeLength = 5) {
  return new Promise((resolve, reject) => {
    let getRecords = [
      getBrowserHistory([], browsers.INTERNETEXPLORER, historyTimeLength)
    ];
    Promise.all(getRecords).then(
      records => {
        resolve(records);
      },
      error => {
        reject(error);
      }
    );
  });
}

/**
 * Gets the history for the Specified browsers and time in minutes.
 * Returns an array of browser records.
 * @param historyTimeLength | Integer
 * @returns {Promise<array>}
 */
function getAllHistory(historyTimeLength = 5) {
  allBrowserRecords = [];
  return new Promise((resolve, reject) => {
    let getPaths = [
      browsers
        .findPaths(browsers.defaultPaths.firefox, browsers.FIREFOX)
        .then(foundPaths => {
          browsers.browserDbLocations.firefox = foundPaths;
        }),
      browsers
        .findPaths(browsers.defaultPaths.chrome, browsers.CHROME)
        .then(foundPaths => {
          browsers.browserDbLocations.chrome = foundPaths;
        }),
      browsers
        .findPaths(browsers.defaultPaths.seamonkey, browsers.SEAMONKEY)
        .then(foundPaths => {
          browsers.browserDbLocations.seamonkey = foundPaths;
        }),
      browsers
        .findPaths(browsers.defaultPaths.opera, browsers.OPERA)
        .then(foundPaths => {
          browsers.browserDbLocations.opera = foundPaths;
        }),
      browsers
        .findPaths(browsers.defaultPaths.torch, browsers.TORCH)
        .then(foundPaths => {
          browsers.browserDbLocations.torch = foundPaths;
        }),
      browsers
        .findPaths(browsers.defaultPaths.safari, browsers.SAFARI)
        .then(foundPath => {
          browsers.browserDbLocations.safari = foundPath;
        }),
      browsers
        .findPaths(browsers.defaultPaths.seamonkey, browsers.SEAMONKEY)
        .then(foundPath => {
          browsers.browserDbLocations.seamonkey = foundPath;
        }),
      browsers
        .findPaths(browsers.defaultPaths.maxthon, browsers.MAXTHON)
        .then(foundPath => {
          browsers.browserDbLocations.maxthon = foundPath;
        }),
      browsers
        .findPaths(browsers.defaultPaths.vivaldi, browsers.VIVALDI)
        .then(foundPath => {
          browsers.browserDbLocations.vivaldi = foundPath;
        })
    ];

    Promise.all(getPaths).then(
      () => {
        let getRecords = [
          getBrowserHistory(
            browsers.browserDbLocations.firefox,
            browsers.FIREFOX,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.seamonkey,
            browsers.SEAMONKEY,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.chrome,
            browsers.CHROME,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.opera,
            browsers.OPERA,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.torch,
            browsers.TORCH,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.safari,
            browsers.SAFARI,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.vivaldi,
            browsers.VIVALDI,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.seamonkey,
            browsers.SEAMONKEY,
            historyTimeLength
          ),
          getBrowserHistory(
            browsers.browserDbLocations.maxthon,
            browsers.MAXTHON,
            historyTimeLength
          ),

          //No Path because this is handled by the dll
          getBrowserHistory([], browsers.INTERNETEXPLORER, historyTimeLength)
        ];
        Promise.all(getRecords).then(
          stuff => {
            resolve(allBrowserRecords);
          },
          error => {
            reject(error);
          }
        );
      },
      error => {
        reject(error);
      }
    );
  });
}

var test = "test";
module.exports = {
  getAllHistory,
  getFirefoxHistory,
  getSeaMonkeyHistory,
  getChromeHistory,
  getOperaHistory,
  getTorchHistory,
  getSafariHistory,
  getMaxthonHistory,
  getVivaldiHistory,
  getIEHistory
};
