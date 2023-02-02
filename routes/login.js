var express = require('express');
const {body, validationResult} = require('express-validator');
const { check_api_key, login } = require('../db');
var router = express.Router();

router.post('/', 
    body('api_key').escape(),
    body('email').isEmail().escape(),
    body('pass').escape(),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            if (!await check_api_key(req.body.api_key)) {
                // API key validation failed; return error
                res.sendStatus(498);
                return;
            } else {
                let [result, key] = await login(req.body.email, req.body.pass);
                res.status(result);  // Tells client whether it succeeded.
                res.contentType("application/json");
                res.json(JSON.stringify(key));
                return;
            }
        } else {
            res.sendStatus(400); return;
        }
    }
);

module.exports = router;