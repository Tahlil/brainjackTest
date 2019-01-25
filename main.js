const { app, Menu} = require('electron');
const MainApp = require("./MainApp");

var application = new MainApp(app, Menu);
