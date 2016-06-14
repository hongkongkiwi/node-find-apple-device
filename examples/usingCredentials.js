var ICloud = require('../index');

// By not passing username or password we will attempt to use the credentials file
//var iCloud = new ICloud(null, null, {});
// Or if you are not planning to pass any options then simply
var iCloud = new ICloud();

iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  console.log(devices);
});
