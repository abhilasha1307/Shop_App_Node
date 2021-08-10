//core
const path = require('path')
//installed
const express = require('express');
const {body} = require('express-validator');
//files
const adminController = require('../controllers/admin')
const isAuth = require('../middleware/isAuth');

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct); 

router.get('/products', isAuth, adminController.getProducts);

router.post('/add-product', [
 body('title', 'Enter a name with numbers and letters at least 3 characters long').isLength({min: 3}).isString().trim(),
 body('price', 'Enter a valid price').isNumeric(),
 body('description', 'Enter Description with at least 3 characters').isLength({min: 3, max: 400}).trim()
], isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);


router.post('/edit-product', [
 body('title', 'Enter a name with numbers and letters at least 3 characters long').isLength({min: 3}).isString().trim(),
 body('price', 'Enter a valid price').isNumeric(),
 body('description', 'Enter Description with at least 3 characters').isLength({min: 3, max: 400}).trim()

], isAuth, adminController.postEditProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
