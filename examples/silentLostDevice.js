var ICloud = require('../index');

var email = "you@example.com";
var password = "PASSWORD_GOES_HERE!";

var iCloud = new ICloud(email, password);

iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  iCloud.silentLostDevice(devices[7].id, false, function(err) {
    if (err) return console.err(err);
    console.log("Successfully enabled silent lost device mode!");
  });
});
