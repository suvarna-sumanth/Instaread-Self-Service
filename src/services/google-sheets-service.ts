
'use server';
/**
 * @fileOverview A service for interacting with the Google Sheets API.
 */

import { google } from 'googleapis';
import type { DemoConfig } from '@/types';
import { format } from 'date-fns';

// --- Configuration ---

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Sheet1'; // The name of the specific sheet (tab) in your spreadsheet
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const HEADERS = [
    'Demo ID', 
    'Partner Website', 
    'Demo Created At', 
    'Status', 
    'Installation Date', 
    'Shareable Link'
];

// --- Authentication ---

/**
 * Creates an authenticated Google Sheets API client.
 */
async function getSheetsClient() {
  const { GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY } = process.env;

  if (!GOOGLE_SHEETS_CLIENT_EMAIL || !GOOGLE_SHEETS_PRIVATE_KEY) {
    throw new Error('Google Sheets API credentials are not set in environment variables.');
  }

  const jwtClient = new google.auth.JWT(
    GOOGLE_SHEETS_CLIENT_EMAIL,
    undefined,
    GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'), // Important: Replace \\n with \n
    SCOPES
  );

  await jwtClient.authorize();
  return google.sheets({ version: 'v4', auth: jwtClient });
}


// --- Public Service Functions ---

/**
 * Appends a new row to the configured Google Sheet with the demo details.
 * If the sheet is empty, it first adds a header row.
 * @param demo - The full demo configuration object.
 */
export async function appendDemoToSheet(demo: DemoConfig) {
  if (!SPREADSHEET_ID) {
    console.warn('GOOGLE_SHEET_ID is not set. Skipping append to Google Sheet.');
    return;
  }
  
  try {
    const sheets = await getSheetsClient();
    
    // Check if the sheet has a header row.
    const getResult = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:G1`,
    });

    if (!getResult.data.values || getResult.data.values.length === 0) {
        // Sheet is empty, add headers first.
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [HEADERS],
            },
        });
        
        // Now, make the header row bold
        const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheetId = sheetInfo.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;
        if (typeof sheetId === 'number') {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                            },
                            cell: {
                                userEnteredFormat: {
                                    textFormat: { bold: true }
                                }
                            },
                            fields: 'userEnteredFormat(textFormat)'
                        }
                    }]
                }
            });
        }
    }

    const appUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://your-production-domain.com');

    // The order of values MUST match the column order defined in HEADERS
    const values = [
      [
        demo.id,
        demo.websiteUrl,
        format(new Date(demo.createdAt), "MMMM d, yyyy 'at' h:mm a"),
        'Pending',
        '', // Installation Date (blank initially)
        `${appUrl}/demo/${demo.id}`
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`, // Append to the first column to find the next empty row
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    });

    console.log(`Successfully appended demo ${demo.id} to Google Sheet.`);

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error appending to Google Sheet: ${message}`);
    // We re-throw so the calling action can handle it if needed
    throw new Error(`Failed to append row to Google Sheet: ${message}`);
  }
}

/**
 * Finds a row by the demo ID and updates its status and installation date.
 * @param demoId The ID of the demo to update.
 * @param installedAt The ISO string of the installation date.
 */
export async function updateDemoStatusInSheet(demoId: string, installedAt: string) {
    if (!SPREADSHEET_ID) {
        console.warn('GOOGLE_SHEET_ID is not set. Skipping update to Google Sheet.');
        return;
    }

    try {
        const sheets = await getSheetsClient();

        // 1. Find the row number for the given demoId by reading the first column (A)
        const readResult = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:A`, // Only need to read the ID column
        });

        const rows = readResult.data.values;
        if (!rows || rows.length === 0) {
            console.warn(`[Google Sheets] Sheet "${SHEET_NAME}" is empty. Cannot update status for demo ${demoId}.`);
            return;
        }

        const rowIndex = rows.findIndex(row => row[0] === demoId);
        if (rowIndex === -1) {
            console.warn(`[Google Sheets] Demo ID ${demoId} not found in sheet. Cannot update status.`);
            return;
        }

        const rowNumber = rowIndex + 1; // Sheet rows are 1-based

        // 2. Update the Status (column D) and Installation Date (column E) for the found row.
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!D${rowNumber}:E${rowNumber}`, // Columns D and E
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [
                    [
                        '✅ Installed', // New status for column D
                        format(new Date(installedAt), "MMMM d, yyyy 'at' h:mm a") // New formatted installation date for column E
                    ]
                ],
            },
        });

        console.log(`[Google Sheets] Successfully updated status for demo ${demoId} in row ${rowNumber}.`);

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`[Google Sheets] Error updating sheet for demo ${demoId}: ${message}`);
        // We throw so the calling API route can know about the failure
        throw new Error(`Failed to update row in Google Sheet: ${message}`);
    }
}
