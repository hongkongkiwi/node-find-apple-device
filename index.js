var FileCookieStore = require('tough-cookie-filestore');
var request = require('request');
var _ = require('underscore');
var uuid = require('node-uuid');
var fs = require('fs');
var random_useragent = require('random-useragent');
var phone = require('phone');
var debug = require('debug')('icloud:log');
var debugM = require('debug')('icloud:methods');

var ICloud = function (username, password, options) {
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
  } catch (e) {
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


ICloud.prototype._login = function (callback) {
  debugM("-> login");
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

  self.r(options, function (err, response, body) {
    if (err) {
      debug("Error processing HTTP request", err);
      if (_.isFunction(callback)) return callback(err);
    }
    if (!response || response.statusCode != 200) {
      debug("Error Logging In", body);
      return callback("Unable to login: HTTP:"+response.statusCode,null);
    } else {
      debug("Successfully Logged In!");
      self.reslogin = response;
      callback(null, response);
    }

  });
};


/**
 *
 * @param roption - HTTP request information passed to CloudRequest
 * @param webservicename - the Apple iCloud web services supported feature
 * @param callback
 * @private
 */
ICloud.prototype._icloudrequest = function (roption, webservicename, callback) {

  debugM("-> " + webservicename);
  debug("Logging in to iCloud", {username: this.username});

  // References to this can get messed up, so keep a copy of it
  var self = this;

  // Process Request
  var processCloudRequest = function () {
    var basepath;
    var options;

    if (self.reslogin.body.hasOwnProperty("webservices") && self.reslogin.body.webservices.hasOwnProperty(webservicename)) {
      basepath = self.reslogin.body.webservices[webservicename].url;


      options = roption;

      // Adjust url to include base path and tack on common params
      options.url = basepath + options.url;
      options.qs = {
        usertz: self.options.timeZone,
        lang:   "en-us", // TODO figure out how to make this env or request specific
        dsid:   self.reslogin.body.dsInfo.dsid
      };

      debug("Initializing Client", options.json);

      self.r(options, function (err, response, body) {
        if (err) {
          debug("Failed to Initialize Client", err);
          if (_.isFunction(callback)) {
            return callback(err);
          }
        }
        debug("Successfully Initialized Client");

        if (body) {
          debug("Discovered " + body.length + " response on iCloud Account");
        } else {
          debug("Could not find any response data on iCloud Account. Invalid body string", body);
        }

        if (_.isFunction(callback)) return callback(null, response);
      });
    }

  }

  // Has the iCloud instance been initialized and been populated w/ data?
  if (!self.reslogin) {
    // If not, login first, then process request.
    self._login(function (err, msg) {
      if (err) {
        return callback(err);
      } else {
        return processCloudRequest() ;
      }
    });

  } else {
    // logged in already, just process request
    return processCloudRequest();
  }

}


ICloud.prototype.addReminder = function (reminder, callback) {

  debugM("-> addReminders()");
  var self = this;

  // Initialize the template for a reminder.
  var rguid = uuid.v4().toUpperCase();

  var collections = _.map(self.resreminders.Collections, function (collection) {
    return {guid: collection.guid, ctag: collection.ctag};
  });


  reminder = _.extendOwn(
  {
    "title": "dummy title" + rguid,
    "description": null,
    "pGuid": null,
    "etag": null,
    "order": null,
    "priority": 0,
    "recurrence": null,
    "alarms": [],
    "createdDateExtended": new Date().valueOf(), // use the current date/time
    "guid": rguid,
    "startDate": null,
    "startDateTz": null,
    "startDateIsAllDay": false,
    "completedDate": null,
    "dueDate": null,
    "dueDateIsAllDay": false,
    "lastModifiedDate": null,
    "createdDate": null,
    "isFamily": null
  },reminder);


  // url is relative to base (will be prepended during the request (which does the actual startup/login)
  var options = {
    method: "POST",
    url: "/rd/reminders/" + reminder.pGuid,
    json: {
      "Reminders": reminder,
      "ClientState": {
        "Collections": collections
      }
    }
  };

  self._icloudrequest(options, "reminders", function (err, response) {
    if (err) {
      debug("Failed to Initialize Client", err);
      if (_.isFunction(callback)) return callback(err);
    }
    if (response.body) {
      debug("Successfully Initialized Client");
      self.ChangeSetupdates = response.body.ChangeSet.updates;

    } else {
      debug("Could not find Reminders on iCloud Account. Invalid body string", body);
    }

    if (_.isFunction(callback)) return callback(null, response.body.ChangeSet.updates);
  });


};


ICloud.prototype.getReminders = function (collectionname, callback) {
  var self = this;

  // Structure request

  //TODO verify if ClientContext is needed

  var options = {
    method: "GET",
    url: "/rd/startup",
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

  self._icloudrequest(options, "reminders", function (err, response) {
    var matchedreminders = [];
    if (err) {
      return callback(err, null);
    }
    // Ok... good request, process response.
    self.resreminders = response.body;

    if (response.body) {
      var collectionpGuid = _.where(self.resreminders.Collections, {title: collectionname});
      matchedreminders = _.where(self.resreminders.Reminders, {pGuid: collectionpGuid[0].guid});

      debug("Discovered " + self.resreminders.Reminders.length + " Reminders on iCloud Account");
      return callback(null, matchedreminders);
    }
  });
}


ICloud.prototype.getDevices = function (callback) {
  debugM("-> getDevices()");
  var self = this;

  var self = this;

  // Structure request

  //TODO verify if ClientContext is needed

  var options = {
    method: "POST",
    url:  "/fmipservice/client/web/initClient",
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

  self._icloudrequest(options, "findme", function (err, response) {
    var matchedreminders = [];
    if (err) {
      return callback(err, null);
    }
    // Ok... good request, process response.

    if (response.body) {
      self.resfindme = response.body;

      debug("Discovered " + self.resfindme.content.length + " Devices on iCloud Account");
      return callback(null, response.body.content);
    }
  });
};


ICloud.prototype.silentLostDevice = function (deviceId, emailUpdates, callback) {
  debugM("-> silentLostDevice(\"" + deviceId + "\", \"" + emailUpdates + "\")");
  return this.lostDevice(deviceId, null, null, emailUpdates, callback);
};

ICloud.prototype.lostDevice = function (deviceId, callNumber, text, emailUpdates, callback) {
  debugM("-> lostDevice(\"" + deviceId + "\", \"" + callNumber + "\", \"" + text + "\", \"" + emailUpdates + "\")");

  var self = this;

  var options = {
    method: "POST",
    url: "/fmipservice/client/web/lostDevice",
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

  self._icloudrequest(options, "findme", function (err, response) {
    if (err) {
      debug("Failed to Initialize Client", err);
      if (_.isFunction(callback)) return callback(err);
    }
    if (response.body) {
      debug("Successfully Initialized Client");
      self.resfindmelocked = response.body.content[0];

    } else {
      debug("Could not find device on iCloud Account. Invalid body string", response.body.content[0]);
    }

    if (_.isFunction(callback)) return callback(null, response.body.content[0]);
  });



};

ICloud.prototype.alertDevice = function (deviceId, subject, callback) {
  debugM("-> playSound(\"" + deviceId + "\", \"" + subject + "\")");

  var self = this;

  var options = {
    method: "POST",
    url:  "/fmipservice/client/web/playSound",
    json: {
      "subject": subject || "Find My iPhone Alert",
      "device": deviceId,
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

  self._icloudrequest(options, "findme", function (err, response) {
    var matchedreminders = [];
    if (err) {
      return callback(err, null);
    }
    // Ok... good request, process response.

    if (response.body) {
      self.resfindme = response.body;

      debug("Discovered " + self.resfindme.content.length + " Devices on iCloud Account");
      return callback(null, response.body.content);
    }
  });

};

ICloud.prototype.eraseDevice = function (deviceId, callback) {
  debugM("-> eraseDevice(\"" + deviceId + "\")");
  debug("FUNCTION NOT IMPLEMENTED.... Want to implement it and send me a PR? :-)");
};

ICloud.prototype.logout = function (callback) {
  var stats = false;
  try {
    stats = fs.lstatSync(this.options.cookieFile);
    fs.unlinkSync(this.options.cookieFile);
  } catch (e) {
    fs.closeSync(fs.openSync(this.options.cookieFile, 'a'));
    debug("Created new cookies file", {filename: this.options.cookieFile});
  }

  if (!this.options.hasOwnProperty("cookieJar") && this.options.cookieFile) {
    this.options.cookieJar = request.jar(new FileCookieStore(this.options.cookieFile));
  }
};

module.exports = ICloud;
