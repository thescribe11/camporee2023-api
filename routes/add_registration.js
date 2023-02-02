var express = require('express');
const {body, validationResult} = require('express-validator');
const { addRegistration, check_api_key } = require('../db');
var router = express.Router();

router.post('/',
    body('api_key').escape(),
    body('email').isEmail().normalizeEmail().escape(),
    body('troop').escape(),
    body('activity').trim().escape(),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            if (!await check_api_key(req.body.api_key)) {
                res.sendStatus(498);
                return;
            } else {
                res.sendStatus(await addRegistration(req.body.email, req.body.troop, req.body.activity, req.body.acoff, req.body.kcoff));
                return;
            }
        } else {
            res.sendStatus(400);
            return;
        }
    }
);

module.exports = router;