// copied code from documentation of multer and modified it to use in our project  --- can see documnetation for details
// here i am  configuring multer to temporarily store uploaded files on our local disk.

import multer from 'multer';

//This tells Multer where and how to store the uploaded files on the disk.
const storage = multer.diskStorage({  
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
});
  
//created an upload middleware using the multer instance and pass it the custom storage configuration.
export const upload = multer({ 
    storage,
})