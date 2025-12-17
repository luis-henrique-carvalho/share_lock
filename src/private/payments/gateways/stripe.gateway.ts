import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  IPaymentGateway,
  CustomerData,
  SubscriptionData,
  ProductData,
  PriceData,
  PaymentIntentData,
  RefundData,
  PaymentLinkData,
  BalanceData,
  WebhookEvent,
  BillingPortalSession,
} from '../interfaces/payment-gateway.interface';

interface StripeSubscriptionWithPeriod extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

interface StripeInvoiceWithSubscription extends Stripe.Invoice {
  subscription: string | Stripe.Subscription | null;
}

@Injectable()
export class StripeGateway implements IPaymentGateway {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeGateway.name);

  readonly providerName = 'stripe';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_API_KEY') || '';
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  // ==================== CUSTOMERS ====================

  async createCustomer(data: CustomerData): Promise<CustomerData> {
    const customer = await this.stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: data.metadata,
    });

    this.logger.log(`Customer created successfully with email: ${data.email}`);

    return {
      id: customer.id,
      email: customer.email || '',
      name: customer.name || undefined,
      metadata: customer.metadata as Record<string, string>,
    };
  }

  async getCustomer(customerId: string): Promise<CustomerData | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);

      if ((customer as Stripe.DeletedCustomer).deleted) {
        return null;
      }

      const c = customer as Stripe.Customer;
      return {
        id: c.id,
        email: c.email || '',
        name: c.name || undefined,
        metadata: c.metadata as Record<string, string>,
      };
    } catch {
      return null;
    }
  }

  async listCustomers(): Promise<CustomerData[]> {
    const customers = await this.stripe.customers.list();

    this.logger.log('Customers fetched successfully');

    return customers.data.map((c) => ({
      id: c.id,
      email: c.email || '',
      name: c.name || undefined,
      metadata: c.metadata as Record<string, string>,
    }));
  }

  // ==================== PRODUCTS ====================

  async createProduct(
    data: ProductData,
    price?: PriceData,
  ): Promise<ProductData> {
    const product = await this.stripe.products.create({
      name: data.name,
      description: data.description,
      metadata: data.metadata,
    });

    if (price) {
      await this.stripe.prices.create({
        product: product.id,
        unit_amount: price.unitAmount,
        currency: price.currency,
        recurring: price.recurring,
      });
    }

    this.logger.log(`Product created successfully: ${data.name}`);

    return {
      id: product.id,
      name: product.name,
      description: product.description || undefined,
      active: product.active,
      metadata: product.metadata as Record<string, string>,
    };
  }

  async getProduct(productId: string): Promise<ProductData | null> {
    try {
      const product = await this.stripe.products.retrieve(productId);

      this.logger.log(`Product ${productId} fetched successfully`);

      return {
        id: product.id,
        name: product.name,
        description: product.description || undefined,
        active: product.active,
        metadata: product.metadata as Record<string, string>,
      };
    } catch {
      return null;
    }
  }

  async listProducts(): Promise<ProductData[]> {
    const products = await this.stripe.products.list();

    this.logger.log('Products fetched successfully');

    return products.data.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      active: p.active,
      metadata: p.metadata as Record<string, string>,
    }));
  }

  // ==================== SUBSCRIPTIONS ====================

  async createSubscription(data: SubscriptionData): Promise<SubscriptionData> {
    const response = await this.stripe.subscriptions.create({
      customer: data.customerId,
      items: [{ price: data.priceId }],
      metadata: data.metadata,
    });

    const subscription = response as unknown as StripeSubscriptionWithPeriod;

    this.logger.log(
      `Subscription created successfully for customer ${data.customerId}`,
    );

    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      priceId: subscription.items.data[0]?.price.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionData | null> {
    try {
      const response = await this.stripe.subscriptions.retrieve(subscriptionId);

      const subscription = response as unknown as StripeSubscriptionWithPeriod;

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0]?.price.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    immediate = false,
  ): Promise<void> {
    if (immediate) {
      await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Subscription ${subscriptionId} canceled immediately`);
    } else {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      this.logger.log(
        `Subscription ${subscriptionId} set to cancel at period end`,
      );
    }
  }

  // ==================== PAYMENT INTENTS ====================

  async createPaymentIntent(
    data: PaymentIntentData,
  ): Promise<PaymentIntentData> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      customer: data.customerId,
    });

    this.logger.log(
      `PaymentIntent created successfully with amount: ${data.amount} ${data.currency}`,
    );

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  }

  // ==================== REFUNDS ====================

  async createRefund(data: RefundData): Promise<RefundData> {
    const refund = await this.stripe.refunds.create({
      payment_intent: data.paymentIntentId,
      amount: data.amount,
      reason: data.reason as Stripe.RefundCreateParams.Reason,
    });

    this.logger.log(
      `Refund processed successfully for PaymentIntent: ${data.paymentIntentId}`,
    );

    return {
      id: refund.id,
      paymentIntentId: refund.payment_intent as string,
      amount: refund.amount,
    };
  }

  // ==================== PAYMENT LINKS ====================

  async createPaymentLink(data: PaymentLinkData): Promise<PaymentLinkData> {
    const paymentLink = await this.stripe.paymentLinks.create({
      line_items: [{ price: data.priceId, quantity: data.quantity || 1 }],
    });

    this.logger.log('Payment link created successfully');

    return {
      id: paymentLink.id,
      url: paymentLink.url,
      priceId: data.priceId,
    };
  }

  // ==================== BALANCE ====================

  async getBalance(): Promise<BalanceData> {
    const balance = await this.stripe.balance.retrieve();

    this.logger.log('Balance retrieved successfully');

    return {
      available: balance.available.map((b) => ({
        amount: b.amount,
        currency: b.currency,
      })),
      pending: balance.pending.map((b) => ({
        amount: b.amount,
        currency: b.currency,
      })),
    };
  }

  // ==================== WEBHOOKS ====================

  constructWebhookEvent(payload: Buffer, signature: string): WebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );

    return this.mapStripeEvent(event);
  }

  private mapStripeEvent(event: Stripe.Event): WebhookEvent {
    switch (event.type) {
      case 'customer.subscription.created': {
        const sub = event.data.object;
        return {
          type: 'subscription.created',
          data: this.mapSubscriptionData(sub),
        };
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        return {
          type: 'subscription.updated',
          data: this.mapSubscriptionData(sub),
        };
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        return {
          type: 'subscription.deleted',
          data: this.mapSubscriptionData(sub),
        };
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        return {
          type: 'checkout.completed',
          data: {
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
            userId: session.client_reference_id || undefined,
          },
        };
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoiceWithSubscription;
        return {
          type: 'payment.succeeded',
          data: {
            customerId: invoice.customer as string,
            subscriptionId:
              typeof invoice.subscription === 'string'
                ? invoice.subscription
                : invoice.subscription?.id || '',
          },
        };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoiceWithSubscription;
        return {
          type: 'payment.failed',
          data: {
            customerId: invoice.customer as string,
            subscriptionId:
              typeof invoice.subscription === 'string'
                ? invoice.subscription
                : invoice.subscription?.id || '',
          },
        };
      }

      default:
        return {
          type: 'unknown',
          data: { customerId: '' },
        };
    }
  }

  private mapSubscriptionData(sub: Stripe.Subscription): WebhookEvent['data'] {
    const subWithPeriod = sub as StripeSubscriptionWithPeriod;
    return {
      customerId: sub.customer as string,
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodStart: new Date(subWithPeriod.current_period_start * 1000),
      currentPeriodEnd: new Date(subWithPeriod.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      priceId: sub.items?.data[0]?.price?.id,
    };
  }

  // ==================== BILLING PORTAL ====================

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<BillingPortalSession> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    this.logger.log(
      `Billing portal session created for customer ${customerId}`,
    );

    return { url: session.url };
  }
}
