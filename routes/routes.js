const express = require('express');
const router = express.Router();

const controller = require('../controller/controller');

// Home route
router.get('/', controller.homePage);

// Customer information routes
router.get('/customerinfo', controller.getPersonalInformation);
router.get('/createcustomer', (req, res) => {
    res.render('createCustomer');
});
router.post('/createcustomer', controller.createCustomer);
router.post('/deletecustomer/:accountNumber', controller.deleteCustomer);
router.get('/updatecustomer/:accountNumber', controller.getCustomerToUpdate);
router.post('/updatecustomer/:accountNumber', controller.updateCustomer);

// Account routes
router.get('/chequing', controller.chequingAccount);
router.get('/saving', controller.savingAccount);

module.exports = router;
