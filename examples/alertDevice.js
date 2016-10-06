var ICloud = require('../index');


var email = "<EMAIL GOES HERE>";
var password = "<PASSWORD GOES HERE>";


var iCloud = new ICloud(email, password);

iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  iCloud.alertDevice(devices[6].id, "This is a test alert!", function(err) {
    if (err) return console.error(err);
    console.log("Successfully alerted device!");
    console.log(devices[0]);
  });
});
