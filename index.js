var FileCookieStore = require('tough-cookie-filestore');
var request = require('request');
var _ = require('underscore');
var fs = require('fs');
var random_useragent = require('random-useragent');
var phone = require('phone');
var debug = require('debug')('icloud:log');
var debugM = require('debug')('icloud:methods');

var ICloud = function(username, password, options) {
  debugM("-> new ICloud()");
  this.options = _.extendOwn({
    credentialsFile: __dirname + '/.credentials.json',
    cookieFile: __dirname + '/cookies.json',
    timeZone: require('system-timezone')() || 'US/Eastern',
    appName: "iCloud Find (Web)",
    appVersion: "2.0",
    apiVersion: "3.0",
    timeout: 3571,
    userAgent: random_useragent.getRandom(),
    requestOptions: {
      headers: {
        "Origin": "https://www.icloud.com"
      }
    },
  }, options);

  var self = this;

  if (username && password) {
    this.username = username;
    this.password = password;
  } else if (this.options.credentialsFile) {
    try {
      fs.lstatSync(self.options.credentialsFile);
      debug("Found credentials file!", self.options.credentialsFile);
      var credentials = require(self.options.credentialsFile) || {};
      self.username = credentials.username;
      self.password = credentials.password;
      console.log(credentials);
    } catch (e) {
      console.error(e);
    }
  }

  if (!this.username || !this.password) throw new Error("Must have username & password!");

  var stats = false;
  try {
    stats = fs.lstatSync(this.options.cookieFile);
    debug("Found existing cookies file", {filename: this.options.cookieFile});
  } catch(e) {
    fs.closeSync(fs.openSync(this.options.cookieFile, 'a'));
    debug("Created new cookies file", {filename: this.options.cookieFile});
  }

  if (!this.options.hasOwnProperty("cookieJar") && this.options.cookieFile) {
    this.options.cookieJar = request.jar(new FileCookieStore(this.options.cookieFile));
  }

  this.r = request.defaults(_.extendOwn({
    jar: this.options.cookieJar,
    userAgent: this.options.userAgent
  }, this.options.requestOptions));

  this.devices = [];
};

ICloud.prototype._login = function(callback) {
  debugM("-> _login()");
  debug("Logging in to iCloud", {username: this.username});

  // References to this can get messed up, so keep a copy of it
  var self = this;

  var options = {
    method: "POST",
    url: "https://setup.icloud.com/setup/ws/1/login",
    json: {
      "apple_id": self.username,
      "password": self.password,
      "extended_login": true
    }
  };

  this.r(options, function(err, response, body) {
    if (err) {
      debug("Error Logging In", err);
      if (_.isFunction(callback)) return callback(err);
    }
		if (!response || response.statusCode != 200) {
      debug("Error Logging In", body);
			return callback("Login Error");
		}
    debug("Successfully Logged In!");

    if (body.hasOwnProperty("webservices") && body.webservices.hasOwnProperty("findme")) {
      self.findMeBasePath = body.webservices.findme.url;

      options = {
        method: "POST",
        url: self.findMeBasePath + "/fmipservice/client/web/initClient",
        json: {
          "clientContext": {
            "appName": self.options.appName,
            "appVersion": self.options.appVersion,
            "timezone": self.options.timeZone,
            "inactiveTime": self.options.timeout,
            "apiVersion": self.options.apiVersion,
            "fmly": true
          }
        }
      };

      debug("Initializing Client", options.json);

      self.r(options, function(err, response, body) {
        if (err) {
          debug("Failed to Initialize Client", err);
          if (_.isFunction(callback)) return callback(err);
        }
        debug("Successfully Initialized Client");

  			self.devices = [];

        if (body) {
          // Retrieve each device on the account
    			body.content.forEach(function(device) {
    				self.devices.push({
    					id: device.id,
    					name: device.name,
    					deviceModel: device.deviceModel,
    					modelDisplayName: device.modelDisplayName,
    					deviceDisplayName: device.deviceDisplayName,
    					batteryLevel: device.batteryLevel,
    					isLocating: device.isLocating,
    					lostModeCapable: device.lostModeCapable,
    					location: device.location
    				});
    			});

          debug("Discovered " + self.devices.length + " Devices on iCloud Account");
        } else {
          debug("Could not find any devices on iCloud Account. Invalid body string", body);
        }

        if (_.isFunction(callback)) return callback(null, self.devices);
      });
    } else {
      if (_.isFunction(callback)) return callback("cannot parse webservice findme url");
    }
  });
};

ICloud.prototype.getDevices = function(callback) {
  debugM("-> getDevices()");
  var self = this;

  function getDevices(callback) {
    var deviceNames = _.pluck(self.devices, 'name');
    debug("Getting info for " + self.devices.length + " devices on iCloud account",deviceNames);
    if (_.isFunction(callback)) return callback(null, self.devices);
  }

  //https://p25-fmipweb.icloud.com/fmipservice/client/web/refreshClient

  this.isLoggedIn(function(err, loggedIn) {
    if (err) {
      if (_.isFunction(callback)) return callback(err);
    }

    if (!loggedIn) {
      debug("It seems we are not currently logged in!");
      self._login(function(err) {
        getDevices(callback);
      });
    } else {
      getDevices(callback);
    }
  });
};


ICloud.prototype.silentLostDevice = function(deviceId, emailUpdates, callback) {
  debugM("-> silentLostDevice(\"" + deviceId + "\", \"" + emailUpdates + "\")");
  return this.lostDevice(deviceId, null, null, emailUpdates, callback);
};

ICloud.prototype.lostDevice = function(deviceId, callNumber, text, emailUpdates, callback) {
  debugM("-> lostDevice(\"" + deviceId + "\", \"" + callNumber + "\", \"" + text + "\", \"" + emailUpdates + "\")");

  var options = {
    method: "POST",
    url: this.findMeBasePath + "/fmipservice/client/web/lostDevice",
    json: {
      "emailUpdates": emailUpdates || false,
      "lostModeEnabled": true,
      "trackingEnabled": true,
      "device": deviceId
    }
  };

  if (callNumber) {
    var phoneNumber = phone(callNumber);
    if (phoneNumber.length === 0) {
      return callback("Invalid Phone Number!");
    }
    options.json.ownerNbr = phoneNumber[0];
  }

  if (text) {
    options.json.userText = true;
    options.json.text = text;
  } else {
    options.json.userText = false;
  }

  this.r(options, function(err, response, body) {
    if (err) {
      debug("Error locking phone!", err);
      if (_.isFunction(callback)) return callback(err);
    }
    if (!response || response.statusCode !== 200) {
      debug("Unknown response from server", body);
      if (_.isFunction(callback)) return callback("Invalid response from server!");
    }
    debug("Successfully locked device!");
    if (_.isFunction(callback)) return callback();
  });
};

ICloud.prototype.alertDevice = function(deviceId, subject, callback) {
  debugM("-> playSound(\"" + deviceId + "\", \"" + subject + "\")");

  var options = {
    method: "POST",
    url: this.findMeBasePath + "/fmipservice/client/web/playSound",
    json: {
      "subject": subject || "Find My iPhone Alert",
      "device": deviceId
    }
  };
  this.r(options, function(err, response, body) {
    if (err) {
      debug("Error playing sound!", err);
      if (_.isFunction(callback)) return callback(err);
    }
    if (!response || response.statusCode !== 200) {
      debug("Unknown response from server", body);
      if (_.isFunction(callback)) return callback("Invalid response from server!");
    }
    debug("Successfully alerted device!");
    if (_.isFunction(callback)) return callback();
  });
};

ICloud.prototype.isLoggedIn = function(callback) {
  debugM("-> isLoggedIn()");
  if (_.isFunction(callback)) return callback(null, false);
};

ICloud.prototype.eraseDevice = function(deviceId, callback) {
  debugM("-> eraseDevice(\"" + deviceId + "\")");
  debug("FUNCTION NOT IMPLEMENTED.... Want to implement it and send me a PR? :-)");
};

ICloud.prototype.logout = function(callback) {
  var stats = false;
  try {
    stats = fs.lstatSync(this.options.cookieFile);
    fs.unlinkSync(this.options.cookieFile);
  } catch(e) {
    fs.closeSync(fs.openSync(this.options.cookieFile, 'a'));
    debug("Created new cookies file", {filename: this.options.cookieFile});
  }

  if (!this.options.hasOwnProperty("cookieJar") && this.options.cookieFile) {
    this.options.cookieJar = request.jar(new FileCookieStore(this.options.cookieFile));
  }
};

module.exports = ICloud;
