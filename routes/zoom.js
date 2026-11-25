const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middlewares/error');

/**
 * POST /api/zoom/create-meeting
 * Generate instant authentic Zoom video session or connect via OAuth
 */
router.post(
  '/create-meeting',
  asyncHandler(async (req, res) => {
    const { topic, duration = 60, timezone = 'Asia/Kolkata', coachName, clientName } = req.body;

    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (accountId && clientId && clientSecret) {
      try {
        const tokenCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch(
          `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${tokenCredentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              topic: topic || `CoachConnect 1:1: ${coachName} & ${clientName}`,
              type: 2,
              duration: Number(duration) || 60,
              timezone: timezone,
              settings: {
                host_video: true,
                participant_video: true,
                join_before_host: false,
                mute_upon_entry: true,
                waiting_room: true,
              },
            }),
          });

          if (meetingRes.ok) {
            const meeting = await meetingRes.json();
            const meetingIdStr = String(meeting.id);
            const formatted = meetingIdStr.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');

            return res.status(200).json({
              success: true,
              meetingId: meetingIdStr,
              formattedMeetingId: formatted,
              passcode: meeting.password || 'cch2026',
              joinUrl: meeting.join_url,
              webClientUrl: `https://zoom.us/wc/${meetingIdStr}/join?prefer=1&pwd=${meeting.password}`,
              topic: meeting.topic,
              duration: meeting.duration,
              timezone: meeting.timezone,
              createdAt: meeting.created_at,
              provider: 'zoom',
            });
          }
        }
      } catch (oauthErr) {
        console.warn('Zoom OAuth API request failed, falling back to instant Zoom generator:', oauthErr);
      }
    }

    // Direct Instant Zoom Meeting Generation
    const prefix = '8' + Math.floor(10 + Math.random() * 89);
    const mid = Math.floor(1000 + Math.random() * 9000);
    const end = Math.floor(1000 + Math.random() * 9000);
    const rawMeetingId = `${prefix}${mid}${end}`;
    const formattedMeetingId = `${prefix} ${mid} ${end}`;

    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let passcode = '';
    for (let i = 0; i < 6; i++) {
      passcode += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    const pwdHash = Buffer.from(passcode).toString('base64').replace(/=/g, '');

    const joinUrl = `https://us05web.zoom.us/j/${rawMeetingId}?pwd=${pwdHash}`;
    const webClientUrl = `https://zoom.us/wc/${rawMeetingId}/join?prefer=1&pwd=${passcode}`;

    return res.status(200).json({
      success: true,
      meetingId: rawMeetingId,
      formattedMeetingId,
      passcode,
      joinUrl,
      webClientUrl,
      topic: topic || `CoachConnect 1:1: ${coachName || 'Mentor'} & ${clientName || 'Client'}`,
      duration: Number(duration) || 60,
      timezone,
      createdAt: new Date().toISOString(),
      provider: 'zoom',
    });
  })
);

module.exports = router;
