const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const userModel = require('./schemas/users');
const roleModel = require('./schemas/roles');
const cartModel = require('./schemas/cart');
const { sendMailPassword } = require('./utils/sendMailHandler');
const { generateRandomPassword } = require('./utils/constants');
const path = require('path');

async function importUsersFromExcel() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/NNPTUD-C2');
    console.log('Connected to MongoDB');

    // Get user role
    let userRole = await roleModel.findOne({ name: "user" });
    if (!userRole) {
      console.log('Creating user role...');
      userRole = await roleModel.create({ name: "user", description: "Regular user role" });
    }
    console.log('User role ID:', userRole._id);

    // Read Excel file
    const excelFilePath = path.join(__dirname, 'uploads/1774252086147-992152487.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    const worksheet = workbook.worksheets[0];

    let results = [];
    let errors = [];
    let processedCount = 0;

    // Process each row (skip header)
    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const username = row.getCell(1).value;
      const email = row.getCell(2).value;

      if (!username || !email) {
        console.log(`Skipping row ${rowNum} - missing data`);
        continue;
      }

      try {
        console.log(`Processing row ${rowNum}: ${username} - ${email}`);

        // Generate random 16-character password
        const password = generateRandomPassword(16);

        // Create new user
        let session = await mongoose.startSession();
        session.startTransaction();

        try {
          let newUser = await new userModel({
            username: username.toString().trim(),
            password: password,
            email: email.toString().trim(),
            role: userRole._id,
            status: false
          }).save({ session });

          let newCart = new cartModel({
            user: newUser._id
          });
          await newCart.save({ session });

          await session.commitTransaction();
          session.endSession();

          // Send email with password
          try {
            console.log(`Sending email to ${email.toString().trim()}...`);
            await sendMailPassword(email.toString().trim(), password);
            console.log(`Email sent successfully to ${email.toString().trim()}`);
          } catch (emailErr) {
            console.log(`Email send warning for ${email}: ${emailErr.message}`);
          }

          results.push({
            username: username,
            email: email,
            password: password,
            status: "success"
          });

          processedCount++;
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          console.log(`Error creating user ${username}: ${err.message}`);
          errors.push({
            username: username,
            email: email,
            error: err.message
          });
        }
      } catch (err) {
        console.log(`Error at row ${rowNum}: ${err.message}`);
        errors.push({
          row: rowNum,
          error: err.message
        });
      }
    }

    console.log('\n========== IMPORT SUMMARY ==========');
    console.log(`Total users processed: ${processedCount}`);
    console.log(`Successful imports: ${results.length}`);
    console.log(`Errors: ${errors.length}`);
    
    if (results.length > 0) {
      console.log('\n===== Sample Imported Users (First 5) =====');
      results.slice(0, 5).forEach((user, idx) => {
        console.log(`${idx + 1}. Username: ${user.username}, Email: ${user.email}, Password: ${user.password}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n===== Errors (First 5) =====');
      errors.slice(0, 5).forEach((error, idx) => {
        console.log(`${idx + 1}.`, error);
      });
    }

    await mongoose.disconnect();
    console.log('\nImport complete and MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

importUsersFromExcel();
