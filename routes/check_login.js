var express = require('express');
const {body, validationResult} = require('express-validator');
const { check_login_key, check_api_key } = require('../db');
var { Buffer } = require('node:buffer');
var router = express.Router();

router.post('/',
    body('api_key').escape(),
    body('login_key').escape(),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            if (!await check_api_key(req.body.api_key)) {
                // API key validation failed; return error
                res.sendStatus(498);
                return;
            } else {
                let deciphered = Buffer.from(req.body.login_key, 'base64').toString('ascii');
                res.sendStatus(await check_login_key(deciphered));
                return;
            }
        } else {
            res.sendStatus(400); 
            return;
        }
    }
);

module.exports = router;