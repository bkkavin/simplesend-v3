require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const { google } = require('googleapis');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const multer = require('multer');
const Papa = require('papaparse');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3001;

// --- In-Memory Database Simulation ---
let users = [];
let campaigns = [];
let recipients = [];
let campaignIdCounter = 1;

// --- Middleware ---
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());
const upload = multer({ storage: multer.memoryStorage() });

// --- Passport (Google OAuth 2.0) Configuration ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send']
  },
  (accessToken, refreshToken, profile, done) => {
    let user = users.find(u => u.googleId === profile.id);
    if (user) {
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
    } else {
      user = {
        id: users.length + 1,
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        accessToken,
        refreshToken
      };
      users.push(user);
    }
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// --- Authentication Middleware ---
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'User not authenticated' });
};

// --- LIVE Email Sending Engine ---
const processEmailJob = (user, recipient, campaign, delay) => {
  console.log(`[QUEUE] Job for ${recipient.email_address} scheduled. Will run in ${delay / 60000} minutes.`);

  setTimeout(async () => {
    const currentCampaign = campaigns.find(c => c.id === recipient.campaign_id);
    if (!currentCampaign || currentCampaign.status !== 'In Progress') {
      console.log(`[QUEUE] CANCELLING JOB for ${recipient.email_address} as campaign status is ${currentCampaign ? currentCampaign.status : 'DELETED'}.`);
      return;
    }
    
    console.log(`[SENDING] Preparing to send email to ${recipient.email_address}`);

    try {
      // Set up OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.SERVER_URL}/auth/google/callback`
      );
      oauth2Client.setCredentials({ access_token: user.accessToken, refresh_token: user.refreshToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Personalize subject and body
      let personalizedBody = campaign.emailBody;
      let personalizedSubject = campaign.emailSubject;
      for (const key in recipient.recipient_data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        personalizedBody = personalizedBody.replace(regex, recipient.recipient_data[key]);
        personalizedSubject = personalizedSubject.replace(regex, recipient.recipient_data[key]);
      }

      // Create the raw email message
      const emailLines = [
        `From: "${user.displayName}" <${user.email}>`,
        `To: ${recipient.email_address}`,
        'Content-type: text/html;charset=iso-8859-1',
        'MIME-Version: 1.0',
        `Subject: ${personalizedSubject}`,
        '',
        personalizedBody
      ];
      const email = emailLines.join('\r\n');
      const base64EncodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      // Send the email
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64EncodedEmail
        }
      });

      recipient.send_status = 'Sent';
      recipient.sent_timestamp = new Date().toISOString();
      console.log(`[SUCCESS] Email sent to ${recipient.email_address}`);

    } catch (error) {
      recipient.send_status = 'Failed';
      recipient.failure_reason = error.message || 'Unknown error';
      console.error(`[FAILED] Email to ${recipient.email_address} failed:`, error.message);
    }

    // Update campaign progress
    const campaignRecipients = recipients.filter(r => r.campaign_id === currentCampaign.id);
    const sentCount = campaignRecipients.filter(r => r.send_status === 'Sent').length;
    const failedCount = campaignRecipients.filter(r => r.send_status === 'Failed').length;
    
    currentCampaign.progress.sent = sentCount;

    if (sentCount + failedCount === currentCampaign.progress.total) {
      currentCampaign.status = 'Completed';
      console.log(`[COMPLETE] Campaign "${currentCampaign.campaignName}" has finished.`);
    }

  }, delay);
};

// --- API ROUTES ---
app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: process.env.CLIENT_URL,
  failureRedirect: `${process.env.CLIENT_URL}/login/failed`
}));
app.get('/auth/logout', (req, res, next) => req.logout(err => err ? next(err) : res.redirect(process.env.CLIENT_URL)));
app.get('/api/auth/status', (req, res) => res.status(200).json({ isAuthenticated: !!req.isAuthenticated(), user: req.isAuthenticated() ? { email: req.user.email } : null }));

app.post('/api/campaigns', ensureAuthenticated, upload.single('file'), (req, res) => {
  try {
    const { campaignName, emailSubject, emailBody, emailColumn } = req.body;
    if (!req.file || !campaignName || !emailSubject || !emailBody || !emailColumn) {
        return res.status(400).json({ error: 'All fields and a file are required.' });
    }

    let recipientData;
    if (req.file.originalname.endsWith('.csv')) {
      recipientData = Papa.parse(req.file.buffer.toString('utf8'), { header: true, skipEmptyLines: true }).data;
    } else if (req.file.originalname.endsWith('.xlsx')) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      recipientData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }
    
    if (!recipientData[0] || !recipientData[0][emailColumn]) {
        return res.status(400).json({ error: `Email column "${emailColumn}" not found.` });
    }

    const newCampaign = {
      id: campaignIdCounter++, userId: req.user.id, campaignName, emailSubject, emailBody,
      status: 'In Progress', createdAt: new Date().toISOString(),
      progress: { sent: 0, total: recipientData.length }
    };
    campaigns.push(newCampaign);

    const PRODUCTION_DELAY = 3 * 60 * 1000; // 3 minutes

    recipientData.forEach((row, index) => {
      const newRecipient = {
        id: recipients.length + 1, campaign_id: newCampaign.id, recipient_data: row,
        email_address: row[emailColumn], send_status: 'Queued',
        failure_reason: null, sent_timestamp: null
      };
      recipients.push(newRecipient);
      // **FIX:** Calculate a sequential delay for each job
      const sequentialDelay = (index + 1) * PRODUCTION_DELAY;
      processEmailJob(req.user, newRecipient, newCampaign, sequentialDelay);
    });

    console.log(`[LAUNCH] Campaign "${campaignName}" launched for ${req.user.email} with ${recipientData.length} recipients.`);
    res.status(202).json(newCampaign);

  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

app.get('/api/campaigns', ensureAuthenticated, (req, res) => {
  const userCampaigns = campaigns.filter(c => c.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.status(200).json(userCampaigns);
});

app.get('/api/campaigns/:id', ensureAuthenticated, (req, res) => {
  const campaign = campaigns.find(c => c.id == req.params.id && c.userId === req.user.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  const campaignRecipients = recipients.filter(r => r.campaign_id == req.params.id);
  res.status(200).json({ ...campaign, recipients: campaignRecipients });
});

app.post('/api/campaigns/:id/cancel', ensureAuthenticated, (req, res) => {
    const campaign = campaigns.find(c => c.id == req.params.id && c.userId === req.user.id);
    if (campaign && campaign.status === 'In Progress') {
        campaign.status = 'Cancelled';
        console.log(`[CANCEL] Campaign ${campaign.id} was cancelled.`);
    }
    res.status(200).json(campaign);
});

app.get('/api/campaigns/:id/export', ensureAuthenticated, (req, res) => {
    const campaign = campaigns.find(c => c.id == req.params.id && c.userId === req.user.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    const campaignRecipients = recipients.filter(r => r.campaign_id == req.params.id);
    const exportData = campaignRecipients.map(r => ({ ...r.recipient_data, send_status: r.send_status, failure_reason: r.failure_reason || '', sent_timestamp: r.sent_timestamp || '' }));
    const csv = Papa.unparse(exportData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaign.id}_results.csv"`);
    res.status(200).send(csv);
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));

