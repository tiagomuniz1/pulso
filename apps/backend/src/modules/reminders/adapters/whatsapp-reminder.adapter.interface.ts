export interface ISendWhatsAppReminderParams {
  toE164: string
  /**
   * Values for the approved WhatsApp template's placeholders, in order:
   * the first fills {{1}}, the second {{2}}, and so on.
   *
   * An ordered array rather than a map keyed by "1".."5": the template is
   * positional at the source (Meta), and a map would force whoever sends it to
   * rebuild the order by sorting stringified numbers.
   */
  variables: string[]
}

export interface ISendWhatsAppReminderResult {
  /** `sent` means the provider accepted the message, not that it was delivered. */
  status: 'sent' | 'skipped'
  providerMessageId: string | null
}

export abstract class IWhatsAppReminderAdapter {
  abstract sendReminder(params: ISendWhatsAppReminderParams): Promise<ISendWhatsAppReminderResult>
}
