/**
 * Google Apps Script for Team Vacation Planner
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Name the first sheet "Vacations".
 * 3. Create headers in row 1: ID | Name | Startdatum | Enddatum | Vertreter
 * 4. Open Extensions > Apps Script.
 * 5. Replace the default code with this script.
 * 6. Click "Deploy" > "New Deployment" > "Web App".
 * 7. Set "Who has access" to "Anyone".
 * 8. Copy the Web App URL and paste it in your Next.js environment variables as NEXT_PUBLIC_GAS_URL.
 */

const SHEET_NAME = "Vacations";
const ADMIN_PASSWORD = "Admin";

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  const vacations = data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(vacations))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10s timeout
    
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (action === "ADD") {
      const newStart = new Date(params.start);
      const newEnd = new Date(params.end);
      
      // Overlap Validation: (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
      const data = sheet.getDataRange().getValues();
      data.shift(); // Remove headers
      
      const hasOverlap = data.some(row => {
        const existingStart = new Date(row[2]);
        const existingEnd = new Date(row[3]);
        return (newStart < existingEnd) && (newEnd > existingStart);
      });
      
      if (hasOverlap) {
        return createResponse(false, "Der gewählte Zeitraum überschneidet sich mit einer bestehenden Buchung.");
      }
      
      const id = Utilities.getUuid();
      sheet.appendRow([id, params.name, params.start, params.end, params.vertreter]);
      return createResponse(true, "Urlaub erfolgreich eingetragen.");
    } 
    
    if (action === "DELETE") {
      if (params.password !== ADMIN_PASSWORD) {
        return createResponse(false, "Falsches Admin-Passwort.");
      }
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.id) {
          sheet.deleteRow(i + 1);
          return createResponse(true, "Eintrag gelöscht.");
        }
      }
      return createResponse(false, "Eintrag nicht gefunden.");
    }

    return createResponse(false, "Ungültige Aktion.");
    
  } catch (err) {
    return createResponse(false, err.toString());
  } finally {
    lock.releaseLock();
  }
}

function createResponse(success, message) {
  return ContentService.createTextOutput(JSON.stringify({ success, message }))
    .setMimeType(ContentService.MimeType.JSON);
}
