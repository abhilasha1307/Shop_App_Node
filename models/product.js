const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  price:{
    type: Number,
    required: true
  },
  description:{
    type: String,
    required: true
  },
  imageUrl:{
    type: String,
    required: true
  },
  userId:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Product', ProductSchema);

// const mongodb = require('mongodb');

// class Product{
//   constructor(title, price, description, imageUrl, id, userId){
//     this.title = title;
//     this.price = price;
//     this.description =description;
//     this.imageUrl = imageUrl;
//     this._id = id ? new mongodb.ObjectId(id) : null;
//     this.userId = userId;
//   }

//   //save the product or save changes to the product
//   save() {
//     const db = getDb();
//     let dbOp;
//     if(this._id){
//       //update the product

//       dbOp = db.collection('products').updateOne({_id: this._id}, {$set: this});
//     }
//     else{
//       dbOp = db.collection('products').insertOne(this);
//     }
//     return dbOp.then(products =>{
//       console.log(products);
//     })
//     .catch(err =>{
//       console.log(err);
//     });
//   }

//   //get all the products
//   static fetchAll(){
//     const db = getDb();
//     return db.collection('products').find().toArray()
//     .then(products =>{
//       return products;
//     })
//     .catch(err =>{
//       console.log(err);
//     })
//   }

//   //get product by id (one)
//   static fetchOne(Id) {
//     const db = getDb();
//     return db.collection('products').find({_id: new mongodb.ObjectId(Id) })
//     .next() //if using find; use .next() before .then() as find gives a cursor, so next will give the last and the only document returned by find
//     .then(product =>{
//       return product;
//     })
//     .catch(err =>{
//       console.log(err);
//     })
//   }

//   static deleteById(Id){
//     const db = getDb();
//     return db.collection('products').deleteOne({_id: new mongodb.ObjectId(Id) })
//     .then(result =>{
//       console.log("DELETED");
//     })
//     .catch(err =>{
//       console.log(err);
//     })
//   }
// }

// module.exports = Product;
