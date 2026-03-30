const ExcelJS = require('exceljs');
const { sendMailPassword } = require('./utils/sendMailHandler');
const { generateRandomPassword } = require('./utils/constants');
const path = require('path');

async function testImportAndEmail() {
  try {
    console.log('========== USER IMPORT TEST ==========\n');

    // Read Excel file
    const excelFilePath = path.join(__dirname, 'uploads/users_sample.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    const worksheet = workbook.worksheets[0];

    console.log(`Excel file loaded: ${excelFilePath}`);
    console.log(`Total rows in Excel: ${worksheet.rowCount}\n`);

    let results = [];
    let emailsSent = 0;
    let emailsFailed = 0;

    // Process first 10 rows (skip header)
    for (let rowNum = 2; rowNum <= Math.min(worksheet.rowCount, 11); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const username = row.getCell(1).value;
      const email = row.getCell(2).value;

      if (!username || !email) {
        console.log(`Row ${rowNum}: SKIPPED (empty data)`);
        continue;
      }

      try {
        console.log(`\nRow ${rowNum}: Processing...`);
        console.log(`  Username: ${username}`);
        console.log(`  Email: ${email}`);

        // Generate random 16-character password
        const password = generateRandomPassword(16);
        console.log(`  Generated Password: ${password}`);

        // Attempt to send email
        try {
          console.log(`  Sending email...`);
          await sendMailPassword(email.toString().trim(), password);
          console.log(`  ✓ Email sent successfully!`);
          emailsSent++;
        } catch (emailErr) {
          console.log(`  ✗ Email send failed: ${emailErr.message}`);
          emailsFailed++;
        }

        results.push({
          rowNum: rowNum,
          username: username,
          email: email,
          password: password
        });
      } catch (err) {
        console.log(`Row ${rowNum}: ERROR - ${err.message}`);
        emailsFailed++;
      }
    }

    console.log('\n\n========== TEST SUMMARY ==========');
    console.log(`Total users processed: ${results.length}`);
    console.log(`Emails sent successfully: ${emailsSent}`);
    console.log(`Emails failed: ${emailsFailed}`);
    
    if (results.length > 0) {
      console.log('\n===== Processed Users Details =====');
      results.forEach((user) => {
        console.log(`Row ${user.rowNum}: ${user.username} (${user.email}) - Password: ${user.password}`);
      });
    }

    console.log('\n✓ Test complete! Check MailTrap inbox for sent emails.');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

testImportAndEmail();
