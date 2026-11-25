function generateDeterministicZoomMeeting(options) {
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

  return {
    meetingId: rawMeetingId,
    formattedMeetingId,
    passcode,
    joinUrl,
    webClientUrl,
    topic: options.topic || `CoachConnect 1:1: ${options.coachName || 'Mentor'} & ${options.clientName || 'Client'}`,
    duration: options.duration || options.durationMinutes || 60,
    timezone: options.timezone || 'Asia/Kolkata (IST)',
    createdAt: new Date().toISOString(),
    provider: 'zoom'
  };
}

module.exports = {
  generateDeterministicZoomMeeting
};

