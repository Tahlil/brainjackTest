const exec = require('child_process').exec;
const spawn = require("child_process").spawn;

module.exports = class EnvironmentSpecificOperations {
    constructor() {

    }

    static WinCheckIfRunningAsAdmin() {
        return new Promise(function (resolve, reject) {
            exec('NET SESSION', async (err, so, se) => {
                resolve(se.length === 0 ? true : false);
            });
        });
    }

    static async WinSetAsStartupApp() {
        var isRunningAsAdmin = await this.WinCheckIfRunningAsAdmin();
        if (isRunningAsAdmin) {
            var child = spawn("powershell.exe", ["./startupShortcut.ps1 BrainJack.exe"]);
            child.stdout.on("data", function (data) {
                console.log("Powershell Data: " + data);
            });
            child.stderr.on("data", function (data) {
                console.log("Powershell Errors: " + data);
            });
            child.on("exit", function () {
                console.log("Powershell Script finished");
            });
            child.stdin.end(); //end input
        }
    }
}