var nodemailer = require('nodemailer');
var config = require('./config');
var logger = require('./logger');

exports.mail = function(to, subject, text, cb)
{
    if (!("mail" in config) || !("smtp" in config.mail))
    {
        return cb("no mailer transport specified");
    }

    if (!to || !subject || !text)
    {
        return cb("invalid mail, please specify to, subject and text");
    }

    logger.info("sending mail...");

    var transporter = nodemailer.createTransport(config.mail.smtp);

    var message =
    {
        from: config.mail.smtp.auth.user,
        to: to,
        subject: subject,
        text: text
    };

    transporter.sendMail(message, function(error, info)
    {
        logger.info("sending mail results", error, info);

        if (error)
            error = error.toString();

        if (info)
            info = "Mail to " + to + " successfully sent";

        cb(error, info);
        transporter.close();
    });
};