import { sendTelegramMessage } from './telegram';

interface OAuthHealth {
    email: string;
    isHealthy: boolean;
    expiresAt: Date | null;
    daysUntilExpiry: number | null;
    lastCheck: Date;
    error?: string;
}

export async function checkOAuthHealth(account: any): Promise<OAuthHealth> {
    const now = new Date();
    const expiresAt = account.expiresAt;

    if (!expiresAt) {
        return {
            email: account.email,
            isHealthy: false,
            expiresAt: null,
            daysUntilExpiry: null,
            lastCheck: now,
            error: 'No expiration date found'
        };
    }

    const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isHealthy = daysUntilExpiry > 3; // Alert if < 3 days

    return {
        email: account.email,
        isHealthy,
        expiresAt,
        daysUntilExpiry,
        lastCheck: now
    };
}

export async function sendOAuthAlert(accountEmail: string, error: string) {
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!chatId) {
        console.error('TELEGRAM_CHAT_ID not configured');
        return;
    }

    const message = `
🚨 *OAuth Token Alert*

*Account:* ${accountEmail}
*Status:* Token expired or expiring soon
*Error:* ${error}

⚠️ Email forwarding has stopped for this account.

*Action Required:*
1. Go to your dashboard
2. Navigate to Email Manager
3. Reconnect the Gmail account

🔗 Dashboard: ${process.env.NEXTAUTH_URL}
    `.trim();

    try {
        await sendTelegramMessage(chatId, message);
        console.log(`✅ OAuth alert sent for ${accountEmail}`);
    } catch (err) {
        console.error('Failed to send OAuth alert:', err);
    }
}

export async function attemptTokenRefresh(account: any, refreshGmailToken: Function): Promise<boolean> {
    try {
        await refreshGmailToken(account._id.toString());
        console.log(`✅ Successfully refreshed token for ${account.email}`);
        return true;
    } catch (error: any) {
        console.error(`❌ Failed to refresh token for ${account.email}:`, error.message);
        return false;
    }
}
