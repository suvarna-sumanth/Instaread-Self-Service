
import * as React from 'react';
import { format } from 'date-fns';

interface PartnerInstallNotificationEmailProps {
  publication: string;
  websiteUrl: string;
  installedAt: string;
  dashboardUrl: string;
}

export const PartnerInstallNotificationEmail: React.FC<Readonly<PartnerInstallNotificationEmailProps>> = ({
  publication,
  websiteUrl,
  installedAt,
  dashboardUrl,
}) => {
  const formattedDate = format(new Date(installedAt), "MMMM d, yyyy 'at' h:mm a");

  return (
    <html lang="en">
      <head>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
          .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #888; padding-top: 20px; border-top: 1px solid #eee; }
          .button { display: inline-block; padding: 12px 24px; margin-top: 20px; background-color: #29ABE2; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .info-box { background-color: #f9f9f9; border: 1px solid #eee; border-radius: 5px; padding: 15px; margin-top: 20px; }
          .info-box p { margin: 0 0 5px 0; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1 style={{ color: '#29ABE2', margin: 0 }}>🎉 New Player Installation</h1>
          </div>
          <div className="content">
            <p>Hello Team,</p>
            <p>
              Great news! A new partner has successfully installed the AudioLeap audio player on their website.
            </p>
            <div className="info-box">
              <p><strong>Partner:</strong> {publication}</p>
              <p><strong>Website:</strong> <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#29ABE2' }}>{websiteUrl}</a></p>
              <p><strong>Installation Date:</strong> {formattedDate}</p>
            </div>
            <p>
              The partner's status has been automatically updated on the dashboard. You can view the details by clicking the button below.
            </p>
            <div style={{ textAlign: 'center' }}>
                <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" className="button" style={{ color: '#fff' }}>
                    View Dashboard
                </a>
            </div>
          </div>
          <div className="footer">
            <p>This is an automated notification from the AudioLeap Demo Generator.</p>
          </div>
        </div>
      </body>
    </html>
  );
};
