var ICloud = require('../index');

var email = "you@example.com";
var password = "PASSWORD_GOES_HERE!";

var iCloud = new ICloud(email, password);

iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  iCloud.alertDevice(devices[0].id, "This is a test alert!", function(err) {
    if (err) return console.err(err);
    console.log("Successfully alerted device!");
  });
});
