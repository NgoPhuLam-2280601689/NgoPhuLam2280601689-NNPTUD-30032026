const ExcelJS = require('exceljs');
const path = require('path');

async function createUserExcelFile() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Add headers
    worksheet.columns = [
      { header: 'username', key: 'username', width: 15 },
      { header: 'email', key: 'email', width: 30 }
    ];

    // Add sample user data
    const users = [
      { username: 'user01', email: 'user01@haha.com' },
      { username: 'user02', email: 'user02@haha.com' },
      { username: 'user03', email: 'user03@haha.com' },
      { username: 'user04', email: 'user04@haha.com' },
      { username: 'user05', email: 'user05@haha.com' },
      { username: 'user06', email: 'user06@haha.com' },
      { username: 'user07', email: 'user07@haha.com' },
      { username: 'user08', email: 'user08@haha.com' },
      { username: 'user09', email: 'user09@haha.com' },
      { username: 'user10', email: 'user10@haha.com' },
    ];

    // Add rows
    users.forEach(user => {
      worksheet.addRow(user);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };

    // Save file
    const filePath = path.join(__dirname, 'uploads/users_sample.xlsx');
    await workbook.xlsx.writeFile(filePath);

    console.log(`✓ Sample user Excel file created: ${filePath}`);
    console.log(`\nSample data (${users.length} users):`);
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.username} - ${user.email}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createUserExcelFile();
