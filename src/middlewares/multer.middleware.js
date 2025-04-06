// copied code from documentation of multer and modified it to use in our project
// here i am  configuring multer to temporarily store uploaded files on our local disk.

import multer from 'multer';

const storage = multer.diskStorage({  
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ 
    storage,
})