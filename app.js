var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');

var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const { config } = require('dotenv');
config();

var getRegistrationRouter = require('./routes/get_registration');
var loginRouter = require('./routes/login');
var checkLoginRouter = require('./routes/check_login');
var addRegistrationRouter = require('./routes/add_registration');
var delRegistrationRouter = require('./routes/del_registration');

app.use('/get_registration', getRegistrationRouter);
app.use('/login', loginRouter);
app.use('/check_login', checkLoginRouter);
app.use('/add_registration', addRegistrationRouter);
app.use('/del_registration', delRegistrationRouter);

const { checkExists, addRegistration, getRegistrations, initialize, takedown, check_api_key, login, delTroop } = require('./db');
async function getStarted() {
    await initialize();
}
getStarted();

module.exports = app;