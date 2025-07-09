'use server';

import { renderToStaticMarkup } from 'react-dom/server';
import { PartnerInstallNotificationEmail } from '@/components/emails/partner-install-notification-email';

type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
}

export function renderInstallNotificationHtml(props: InstallNotificationArgs): string {
    return renderToStaticMarkup(
        PartnerInstallNotificationEmail(props)
    );
}
