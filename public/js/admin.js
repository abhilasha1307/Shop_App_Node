
//client side code. Listen to the click and gather ID and csrf token 
const deleteProduct = (btn) =>{
 const prodId = btn.parentNode.querySelector('[name=productId]').value;
 const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

 const productElement = btn.closest('article'); //gives closest ancestor with this selector

 fetch('/admin/product/' + prodId, {
  method: 'DELETE',
  headers: {
   'csrf-token': csrf //will look for this token 
  }
 }).then(result =>{
  return result.json()
 })
 .then(data =>{
  console.log(data);
  productElement.remove();
 })
 .catch(err =>{
  console.log(err);
 })
}