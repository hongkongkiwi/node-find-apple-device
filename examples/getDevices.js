var ICloud = require('../index');

var email = "you@example.com";
var password = "PASSWORD_GOES_HERE!";

var iCloud = new ICloud(email, password);

iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  console.log(devices);
});
