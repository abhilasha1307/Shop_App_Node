const Product = require('../models/product');
const {validationResult} = require('express-validator');

const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    docTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  // const imageUrl = req.body.image;
  const image = req.file; //gives buffer, on logging. configure middleware to turn into file
  const price = req.body.price;
  const description = req.body.description;

  if(!image){
    return res.status(422).render('admin/edit-product', {
      docTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError : true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: 'Attached file is not an image',
      validationErrors: []
    });
  }
  const errors = validationResult(req);

  if(!errors.isEmpty()){
  return res.status(422).render('admin/edit-product', {
      docTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError : true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  const imageUrl = image.path; //image is the file Object we get from multer and from there retrieve path.This is path to file on OS

  const product = new Product({
    title: title, 
    price: price, 
    description: description, 
    imageUrl: imageUrl, 
    userId: req.user});

  product.save()
    .then(result => {
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        docTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        hasError: false,
        product: product, //
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if(!errors.isEmpty()){
  return res.status(422).render('admin/edit-product', {
      docTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError : true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId).then(product =>{ 
    if(product.userId.toString() !== req.user._id.toString()){
      return res.redirect('/');
    }
    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDesc;
    if(image){
      fileHelper.deleteFile(product.imageUrl); //delete old image
      product.imageUrl = image.path;
    }

    return product.save().then(result => {
      console.log('UPDATED PRODUCT!');
      res.redirect('/admin/products');
    })
  })
    .catch(err => {
      //res.redirect('/500')
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

//products created by the logged in user are displayed
exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})
    //.populate('userId')
    .then(products => {
      res.render('admin/products', {
        prods: products,
        docTitle: 'Admin Products',
        path: '/admin/products',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId).then(product =>{
    if(!product){
      return next(new Error('Product Not Found'));
    }
    fileHelper.deleteFile(product.imageUrl); //delete image referring to the path provided
    return Product.deleteOne({_id: prodId, userId: req.user._id});
  }).then(() => {
      console.log('DESTROYED PRODUCT');
      // res.redirect('/admin/products');
      res.status(200).json({message: 'Success!'})
    })
    .catch(err => {
      // const error = new Error(err);
      // error.httpStatusCode(500);
      // return next(error);
      res.status(500).json({message: 'Deleting Product Failed.'});
    });
};
