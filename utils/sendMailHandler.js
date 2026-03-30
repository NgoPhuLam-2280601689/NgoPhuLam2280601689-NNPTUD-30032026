let nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false, // Use false for port 2525
    auth: {
        user: "7fa2a639f21c9e",
        pass: "152436681475fd",
    },
});
module.exports = {
    sendMail: async function (to, url) {
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "mail reset passwrod",
            text: "lick vo day de doi passs", // Plain-text version of the message
            html: "lick vo <a href=" + url + ">day</a> de doi passs", // HTML version of the message
        });
    },
    sendMailPassword: async function (to, password) {
        await transporter.sendMail({
            from: '"admin@" <admin@nnptud.com>',
            to: to,
            subject: "Your Account Password",
            text: `Your password is: ${password}`, // Plain-text version of the message
            html: `<h2>Welcome to NNPTUD-C2</h2><p>Your account has been created successfully.</p><p><strong>Password: ${password}</strong></p><p>Please keep this password safe.</p>`, // HTML version of the message
        });
    }
}