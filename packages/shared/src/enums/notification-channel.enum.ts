// Channel a clinic can send patient notifications through. Values are stable
// identifiers persisted in the DB (clinic_notification_channels.channel and
// appointment_reminders.channel) — they never change when a channel's display
// name does; that lives in config/notification-channel.config.ts.
//
// Enabled per clinic by the PLATFORM_ADMIN in the backoffice: a clinic with no
// enabled channel sends nothing, which is the platform's opt-in.
export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
}
