const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY) //private

const PDFDocument = require('pdfkit'); //gives constructor

const Order = require('../models/order');
const Product = require('../models/product');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
 const page = +req.query.page || 1; //will render 1st page if site = 'localhost:3000'. +req.query.page as without it its a string and we need a number
  let totalItems;

  Product.find().countDocuments().then(numProducts =>{
    totalItems = numProducts;
    return Product.find()
      .skip((page-1)*ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
  }).then(products => {
      res.render('shop/product-list', {
        prods: products,
        docTitle: 'Products',
        path: '/products',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        docTitle: product.title,
        path: '/products',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1; //will render 1st page if site = 'localhost:3000'. +req.query.page as without it its a string and we need a number
  let totalItems;

  Product.find().countDocuments().then(numProducts =>{
    totalItems = numProducts;
    return Product.find()
      .skip((page-1)*ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
  }).then(products => {
      res.render('shop/index', {
        prods: products,
        docTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId').execPopulate() //path. Populates the cart, returns the user though
    .then(user => {
        const products = user.cart.items
          res.render('shop/cart', {
            path: '/cart',
            docTitle: 'Your Cart',
            products: products,
          });
        })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.postCart = (req, res, next) => { //store embedded doc in user collection
  const prodId = req.body.productId;
  Product.findById(prodId).then(
    product =>{
      return req.user.addToCart(product);
    }
  ).then(
    result =>{
      console.log(result)
      res.redirect('/cart');
    }
  ).catch(err =>{
    const error = new Error(err);
    error.httpStatusCode(500);
    return next(error);
  })
  
}

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user.removeFromCart(prodId)
  .then(result =>{
    console.log('Removed Item From the Cart!')
    res.redirect('/cart');
  })
  .catch(err =>{
    const error = new Error(err);
    error.httpStatusCode(500);
    return next(error);
  })
};


exports.getCheckout = (req, res, next) =>{
  let products;
  let total = 0;
  req.user
    .populate('cart.items.productId').execPopulate() 
    .then(user => {
        products = user.cart.items;
        products.forEach(p =>{
          total += p.quantity * p.productId.price;
        })
        return stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: products.map(p =>{
            return {
            name: p.productId.title,
            description: p.productId.description,
            amount: p.productId.price * 100,
            currency: 'usd',
            quantity: p.quantity
            };
          }),
          success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000...
          cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'  
        });
        })
        .then(session => {
          res.render('shop/checkout', {
            path: '/checkout',
            docTitle: 'Checkout',
            products: products,
            totalSum: total,
            sessionId: session.id
          });
        }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
}

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i=>{
        return {quantity: i.quantity, product: {...i.productId._doc}};
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save()
    })
    .then(result =>{
      return req.user.clearCart();
    })
    .then(() =>{
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};


exports.getOrders = (req, res, next) => {
  Order.find({"user.userId": req.user._id})
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        docTitle: 'Your Orders',
        orders: orders,
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId).then(order =>{
    if(!order){ //is order present
      return next(new Error('No order found'));
    }
    if(order.user.userId.toString() !== req.user._id.toString()){ //can user access said order
      return next(new Error('Unauthorized'));
    }

    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName);

    const pdfDoc = new PDFDocument(); //readable stream
    res.setHeader('Content-Type', 'application/pdf'); 
    res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); 
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text('Invoice', {
      underline: true
    });
    pdfDoc.text('-------------------------------------------------');
    let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              ' - ' +
              prod.quantity +
              ' x ' +
              '$' +
              prod.product.price
          );
      });
      pdfDoc.text('---');
      pdfDoc.fontSize(20).text('Total Price: $' + totalPrice.toFixed(2));

    pdfDoc.end();

    //not suitable for large files. Memory on the server will overflow at some point
  //   fs.readFile(invoiePath, (err, data) =>{
  //     if(err) {
  //       return next(err);
  //     }
  //     res.setHeader('Content-Type', 'application/pdf'); //how the browser should handle incoming data
  //     res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); //how the browser should handle incoming data
  //     res.send(data);
  // })

  // const file = fs.createReadStream(invoicePath); //read file in chunks

  // file.pipe(res); //foward data on the stream to res obj. res is a writeable stream

}).catch(err =>{
    next(err);
  })
}
