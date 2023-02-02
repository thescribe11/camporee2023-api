var express = require('express');
const {body, validationResult} = require('express-validator');
const { delTroop, check_api_key } = require('../db');
var router = express.Router();

router.post('/',
    body('api_key').trim().escape(),
    body('id').isNumeric().escape(),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            if (!await check_api_key(req.body.api_key)) {
                res.sendStatus(498);
                return;
            } else {
                res.sendStatus(await delTroop(req.body.id));
                return;
            }
        } else {
            res.sendStatus(400);
            return;
        }
    }
);

module.exports = router;