var ICloud = require('../index');

var email = "you@example.com";
var password = "PASSWORD_GOES_HERE!";

var iCloud = new ICloud(email, password);

iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  iCloud.lostDevice(devices[7].id, "+852 1234 4567", "We are testing the lock functions!", false, function(err) {
    if (err) return console.err(err);
    console.log("Successfully enabled lost device mode!");
  });
});
