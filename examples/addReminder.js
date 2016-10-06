var ICloud = require('../index');
var _ = require('underscore');


var email = "<EMAIL GOES HERE>";
var password = "<PASSWORD GOES HERE>";

var iCloud = new ICloud(email, password);

var ctitle = "Phone reminder";
var reminder = {title: "Remember the milk", "description": "Must be lowfat and organic"};

iCloud.getReminders(ctitle,function (err,reminders){
    var self = iCloud;

    if(err){
        return console.error("Error:"+err);
    }
    var collection =  _.where(iCloud.resreminders.Collections,{title: ctitle});
    if(!collection){
        return console.error("No matching collections" +err);
    }
    // Need to add the Collection ID to the reminder
    reminder = _.extend({pGuid: collection[0].guid},reminder);

    iCloud.addReminder(reminder, function(err, reminders) {
        if (err) return console.error('Error',err);
        if (reminders.length === 0) return console.log("No reminders found!");
        console.log(reminders.Reminders[0].title+" has been added");
    });


})
