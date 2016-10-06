var ICloud = require('../index');

var email = "<EMAIL GOES HERE>";
var password = "<PASSWORD GOES HERE>";

var iCloud = new ICloud(email, password);

iCloud.getReminders("Phone reminder", function(err, reminders) {
    var self = this;
    if (err) return console.error('Error',err);
    if (reminders.length === 0) return console.log("No reminders found!");
    console.log(reminders);
});
