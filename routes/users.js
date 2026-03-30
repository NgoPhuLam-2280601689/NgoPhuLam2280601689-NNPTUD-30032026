var express = require("express");
var router = express.Router();
let { postUserValidator, validateResult } = require('../utils/validatorHandler')
let userController = require('../controllers/users')
let cartModel = require('../schemas/cart');
let { checkLogin, checkRole } = require('../utils/authHandler.js')
let { uploadExcel } = require('../utils/uploadHandler');
let { sendMailPassword } = require('../utils/sendMailHandler');
let { generateRandomPassword } = require('../utils/constants');
const ExcelJS = require('exceljs');
const roleModel = require('../schemas/roles');

let userModel = require("../schemas/users");
const { default: mongoose } = require("mongoose");
//- Strong password

router.get("/", checkLogin,
  checkRole("ADMIN", "MODERATOR"), async function (req, res, next) {
    let users = await userModel
      .find({ isDeleted: false })
      .populate({
        'path': 'role',
        'select': "name"
      })
    res.send(users);
  });

router.get("/:id", checkLogin, async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/",  postUserValidator, validateResult,
  async function (req, res, next) {
    let session = await mongoose.startSession()
    let transaction = session.startTransaction()
    try {
      let newItem = await userController.CreateAnUser(
        req.body.username,
        req.body.password,
        req.body.email,
        req.body.role,
        session
      )
      let newCart = new cartModel({
        user: newItem._id
      })
      let result = await newCart.save({ session })
      result = await result.populate('user')
      session.commitTransaction();
      session.endSession()
      res.send(result)
    } catch (err) {
      session.abortTransaction()
      session.endSession()
      res.status(400).send({ message: err.message });
    }
  });

router.put("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findById(id);
    for (const key of Object.keys(req.body)) {
      updatedItem[key] = req.body[key];
    }
    await updatedItem.save();

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// Import users from Excel file
router.post("/import-excel", uploadExcel.single('file'), async function (req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded" });
    }

    // Get user role ID
    let userRole = await roleModel.findOne({ name: "user" });
    if (!userRole) {
      return res.status(400).send({ message: "User role not found" });
    }

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    let results = [];
    let errors = [];

    // Process each row (skip header)
    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const username = row.getCell(1).value;
      const email = row.getCell(2).value;

      if (!username || !email) {
        continue; // Skip empty rows
      }

      try {
        // Generate random 16-character password
        const password = generateRandomPassword(16);

        // Create new user
        let session = await mongoose.startSession();
        session.startTransaction();

        try {
          let newItem = await new userModel({
            username: username.toString(),
            password: password,
            email: email.toString(),
            role: userRole._id,
            status: false
          }).save({ session });

          let newCart = new cartModel({
            user: newItem._id
          });
          await newCart.save({ session });

          await session.commitTransaction();
          session.endSession();

          // Send email with password
          try {
            await sendMailPassword(email.toString(), password);
          } catch (emailErr) {
            console.log("Email send failed:", emailErr.message);
          }

          results.push({
            username: username,
            email: email,
            password: password,
            status: "success"
          });
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          errors.push({
            username: username,
            email: email,
            error: err.message
          });
        }
      } catch (err) {
        errors.push({
          row: rowNum,
          error: err.message
        });
      }
    }

    res.send({
      message: "Import process completed",
      successCount: results.length,
      errorCount: errors.length,
      results: results,
      errors: errors
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;