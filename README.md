iCloud Find My iPhone Node Module
=====================================

## What is this for?

Apple provides some really excellent find my phone functions using it's iCloud website. I wanted to use this programmibly so I could track my phone without consuming a lot of additional battery life.

I also wanted a way to send very urgent alerts, for example "Oh no, the house is burning down!" so it will sound an alert even if my phone is on silent.

Before playing with this module, I highly recommend that you activate 2-factor authentication incase you accidentally share your credentials with the world. It won't stop somebody from locking your phone, but it will stop them from doing other nasty stuff or stealing your photos.

There is already another find-my-iphone node module available, but I felt it was a little bit rough for my needs, so I decided to code up this one.

## Install

`npm install --save find-apple-device`


## Usage

You can create the instance using the following

```javascript
var ICloud = require('../index');

var email = "you@example.com";
var password = "PASSWORD_GOES_HERE!";

var iCloud = new ICloud(email, password);

iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  console.log(devices);
});
```


## Supported Methods

* getDevices(callback)
* silentLostDevice(deviceId, emailUpdates, callback)
* lostDevice(deviceId, callNumber, text, emailUpdates, callback)
* alertDevice(deviceId, subject, callback)



## Example data

All methods return JSON, please see the examples linked above for more info on how to call each method.

```javascript
iCloud.getDevices(function(err, devices) {
  if (err) return console.error('Error',err);
  if (devices.length === 0) return console.log("No devices found!");
  console.log(devices[0]);
});
```

Gives this json object (some data has been faked for privacy)

```json
{
  "id": "0c0fc335a3b69c8fd42fdb3a3+6ee64f9da0c0fc335+a3b69c8fd42fdb3a36ea61475e64f9da",
  "name": "My iPhone",
  "deviceModel": "iphone6splus-abcde-efghi",
  "modelDisplayName": "iPhone",
  "deviceDisplayName": "iPhone 6s Plus",
  "batteryLevel": "0.67",
  "isLocating": true,
  "lostModeCapable": true,
  "location":
   {
     "timeStamp": 1465896490086,
     "isOld": false,
     "isInaccurate": false,
     "locationFinished": false,
     "positionType": "Cell",
     "latitude": "12.123456938235353",
     "horizontalAccuracy": 1414,
     "locationType": null,
     "longitude": "22.125933956343"
   }
}
```

## TODO

* eraseDevice(deviceId, callback)
* can we stop these annoying emails?
* how can we refresh the session easily?
* how can we check if we are logged in?


## Contributing

Feel free to submit any pull requests or add functionality, I'm usually pretty responsive.

If you like the module, please consider donating some bitcoin or litecoin.

__Bitcoin__

![LNzdZksXcCF6qXbuiQpHPQ7LUeHuWa8dDW](http://i.imgur.com/9rsCfv5.png?1)

__LiteCoin__

![LNzdZksXcCF6qXbuiQpHPQ7LUeHuWa8dDW](http://i.imgur.com/yF1RoHp.png?1)
