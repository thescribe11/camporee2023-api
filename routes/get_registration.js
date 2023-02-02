var express = require('express');
const {body, validationResult} = require('express-validator');
const { getRegistrations, check_api_key } = require('../db');
var router = express.Router();

router.post('/',
    body('api_key').escape(),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            if (!await check_api_key(req.body.api_key)) {
                // API key validation failed; return error
                res.sendStatus(498);
                return;
            } else {
                // Validation successful; return requested resource.
                let result = await getRegistrations();
                res.status(200);
                res.contentType("application/json")
                res.json(JSON.stringify(result));
                return;
            }
        } else {
            // Oops! There was a problem with the key.
            res.sendStatus(400); return;
        }
    }
);

module.exports = router;