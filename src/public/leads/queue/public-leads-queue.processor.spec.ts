import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PublicLeadsQueueProcessor } from './public-leads-queue.processor';
import { WelcomeLeadEmailJobData } from './public-leads-queue.service';

describe('PublicLeadsQueueProcessor', () => {
  let processor: PublicLeadsQueueProcessor;
  let mailer: jest.Mocked<MailerService>;

  const frontendUrlBackup = process.env.FRONTEND_URL;

  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://frontend.test';
  });

  afterAll(() => {
    process.env.FRONTEND_URL = frontendUrlBackup;
  });

  beforeEach(async () => {
    const mailerMock: Partial<jest.Mocked<MailerService>> = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicLeadsQueueProcessor,
        {
          provide: MailerService,
          useValue: mailerMock,
        },
      ],
    }).compile();

    processor = module.get(PublicLeadsQueueProcessor);
    mailer = module.get(MailerService);
  });

  it('should send welcome email with correct payload', async (): Promise<void> => {
    const jobData: WelcomeLeadEmailJobData = {
      email: 'test@example.com',
      name: 'John Doe',
      campaignTitle: 'Campaign X',
      referralCode: 'ABC123',
      verificationToken: 'token123',
      campaignSlug: 'campaign-x',
    };

    const job = { data: jobData } as Job<WelcomeLeadEmailJobData>;

    await processor.sendWelcomeLeadEmail(job);

    expect(mailer.sendMail.bind(mailer)).toHaveBeenCalledTimes(1);
    expect(mailer.sendMail.bind(mailer)).toHaveBeenCalledWith({
      to: jobData.email,
      from: 'Equipe ShareLock <noreply@sharelock.com>',
      subject: `Bem-vindo à ShareLock, ${jobData.name}!`,
      template: 'welcome-lead',
      context: {
        name: jobData.name,
        campaignTitle: jobData.campaignTitle,
        referralLink: `https://frontend.test/public/campaigns/${jobData.campaignSlug}?ref=${jobData.referralCode}`,
        verifyTokenURL: `https://frontend.test/public/campaigns/${jobData.campaignSlug}/verify-email?token=${jobData.verificationToken}`,
      },
    });
  });

  it('should log error and rethrow if sending fails', async (): Promise<void> => {
    const jobData: WelcomeLeadEmailJobData = {
      email: 'fail@example.com',
      name: 'Error User',
      campaignTitle: 'Error Campaign',
      referralCode: 'ERR123',
      verificationToken: 'token-err',
      campaignSlug: 'error-campaign',
    };

    const job = { data: jobData } as Job<WelcomeLeadEmailJobData>;

    const error = new Error('SMTP error');
    mailer.sendMail.mockRejectedValueOnce(error);

    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(processor.sendWelcomeLeadEmail(job)).rejects.toThrow(error);

    expect(mailer.sendMail.bind(mailer)).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send welcome lead email'),
    );

    loggerErrorSpy.mockRestore();
  });
});
