export interface ContactReceiptMessage {
  caseId: string;
  to: string;
  locale: string;
  submittedAt: string;
}

export interface MailReceipt {
  accepted: true;
  transportId: string;
}

export interface MailTransport {
  sendContactReceipt(message: ContactReceiptMessage): Promise<MailReceipt>;
}

export class MockMailTransport implements MailTransport {
  readonly messages: ContactReceiptMessage[] = [];

  async sendContactReceipt(message: ContactReceiptMessage): Promise<MailReceipt> {
    this.messages.push(structuredClone(message));
    return { accepted: true, transportId: `mock-${this.messages.length}` };
  }
}

export class DisabledMailTransport implements MailTransport {
  async sendContactReceipt(_message: ContactReceiptMessage): Promise<never> {
    throw new Error("mail_transport_not_configured");
  }
}
