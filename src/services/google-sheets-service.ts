
'use server';
/**
 * @fileOverview A service for interacting with the Google Sheets API.
 */

import { google } from 'googleapis';
import type { DemoConfig } from '@/types';

// --- Configuration ---

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Sales Demo Tracker'; // The name of the specific sheet (tab) in your spreadsheet
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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
 * @param demo - The full demo configuration object.
 */
export async function appendDemoToSheet(demo: DemoConfig) {
  if (!SPREADSHEET_ID) {
    console.warn('GOOGLE_SHEET_ID is not set. Skipping append to Google Sheet.');
    return;
  }
  
  try {
    const sheets = await getSheetsClient();
    
    const appUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : `https://${process.env.NEXT_PUBLIC_APP_HOSTNAME}`; // Use a production URL env var later

    // The order of values MUST match the column order in your sheet
    const values = [
      [
        demo.id,
        demo.websiteUrl,
        'Sales Rep', // Placeholder for Sales Rep Name
        new Date(demo.createdAt).toISOString(),
        'Pending',
        '', // Installation Date (blank initially)
        `${appUrl}/demo/${demo.id}`
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:G`, // Adjust range as needed
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
