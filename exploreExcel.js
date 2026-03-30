const ExcelJS = require('exceljs');
const path = require('path');

async function exploreExcelStructure() {
  try {
    const excelFilePath = path.join(__dirname, 'uploads/1774252086147-992152487.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    
    console.log(`\n========== EXCEL FILE STRUCTURE ==========\n`);
    console.log(`File: ${excelFilePath}`);
    console.log(`Workbook contains ${workbook.worksheets.length} worksheet(s)\n`);

    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`\n--- Worksheet ${index + 1}: "${worksheet.name}" ---`);
      console.log(`Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);
      console.log(`\nFirst 15 rows data:\n`);
      
      for (let rowNum = 1; rowNum <= Math.min(worksheet.rowCount, 15); rowNum++) {
        const row = worksheet.getRow(rowNum);
        let rowData = [];
        for (let colNum = 1; colNum <= Math.min(5, worksheet.columnCount); colNum++) {
          const cell = row.getCell(colNum);
          rowData.push(`[${colNum}] ${cell.value}`);
        }
        console.log(`Row ${rowNum}: ${rowData.join(' | ')}`);
      }
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

exploreExcelStructure();
