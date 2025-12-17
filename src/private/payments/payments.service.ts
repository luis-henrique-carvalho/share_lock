import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from 'src/common/drizzle/schema';
import { DrizzleAsyncProvider } from 'src/common/drizzle/drizzle.provider';
import { CacheService } from 'src/common/cache/cache.service';
import { PAYMENT_GATEWAY } from './payments.constants';
import {
  IPaymentGateway,
  CustomerData,
  SubscriptionData,
  ProductData,
  PaymentIntentData,
  RefundData,
  PaymentLinkData,
  BalanceData,
  WebhookEvent,
} from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly cacheService: CacheService,
  ) {}

  // ==================== PRODUCTS ====================

  async getProducts(): Promise<ProductData[]> {
    const cacheKey = `products:${this.paymentGateway.providerName}`;
    const cached = await this.cacheService.get<ProductData[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const products = await this.paymentGateway.listProducts();
    await this.cacheService.set(cacheKey, products, 300);

    return products;
  }

  async getProductById(id: string): Promise<ProductData> {
    const cacheKey = `product:${this.paymentGateway.providerName}:${id}`;
    const cached = await this.cacheService.get<ProductData>(cacheKey);

    if (cached) {
      return cached;
    }

    const product = await this.paymentGateway.getProduct(id);

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.cacheService.set(cacheKey, product, 300);
    return product;
  }

  async createProduct(
    name: string,
    description: string,
    price: number,
  ): Promise<ProductData> {
    const product = await this.paymentGateway.createProduct(
      { name, description },
      { productId: '', unitAmount: price * 100, currency: 'usd' },
    );

    await this.cacheService.del(`products:${this.paymentGateway.providerName}`);

    return product;
  }

  // ==================== CUSTOMERS ====================

  async getCustomers(): Promise<CustomerData[]> {
    const cacheKey = `customers:${this.paymentGateway.providerName}`;
    const cached = await this.cacheService.get<CustomerData[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const customers = await this.paymentGateway.listCustomers();
    await this.cacheService.set(cacheKey, customers, 300);

    return customers;
  }

  async createCustomer(email: string, name: string): Promise<CustomerData> {
    const customer = await this.paymentGateway.createCustomer({ email, name });

    await this.cacheService.del(
      `customers:${this.paymentGateway.providerName}`,
    );

    return customer;
  }

  // ==================== SUBSCRIPTIONS ====================

  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<SubscriptionData> {
    const subscription = await this.paymentGateway.createSubscription({
      customerId,
      priceId,
    });

    return subscription;
  }

  async cancelSubscription(
    subscriptionId: string,
    immediate = false,
  ): Promise<void> {
    await this.paymentGateway.cancelSubscription(subscriptionId, immediate);
  }

  async getUserSubscription(userId: string) {
    const cacheKey = `subscription:user:${userId}`;
    const cached =
      await this.cacheService.get<typeof schema.subscription.$inferSelect>(
        cacheKey,
      );

    if (cached) {
      return cached;
    }

    const [subscription] = await this.db
      .select()
      .from(schema.subscription)
      .where(eq(schema.subscription.userId, userId))
      .limit(1);

    if (subscription) {
      await this.cacheService.set(cacheKey, subscription, 300);
    }

    return subscription || null;
  }

  // ==================== PAYMENT INTENTS ====================

  async createPaymentIntent(
    amount: number,
    currency: string,
  ): Promise<PaymentIntentData> {
    return this.paymentGateway.createPaymentIntent({ amount, currency });
  }

  // ==================== REFUNDS ====================

  async refundPayment(paymentIntentId: string): Promise<RefundData> {
    return this.paymentGateway.createRefund({ paymentIntentId });
  }

  // ==================== PAYMENT LINKS ====================

  async createPaymentLink(priceId: string): Promise<PaymentLinkData> {
    return this.paymentGateway.createPaymentLink({ priceId });
  }

  // ==================== BALANCE ====================

  async getBalance(): Promise<BalanceData> {
    return this.paymentGateway.getBalance();
  }

  // ==================== BILLING PORTAL ====================

  async createBillingPortal(
    userId: string,
    returnUrl: string,
  ): Promise<string> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      throw new NotFoundException('No subscription found for this user');
    }

    const session = await this.paymentGateway.createBillingPortalSession(
      subscription.providerCustomerId,
      returnUrl,
    );

    return session.url;
  }

  // ==================== WEBHOOKS ====================

  async handleWebhookEvent(signature: string, rawBody: Buffer) {
    let event: WebhookEvent;

    try {
      event = this.paymentGateway.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      throw new BadRequestException(`Webhook Error: ${message}`);
    }

    this.logger.log(`Received webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.completed':
        await this.handleCheckoutCompleted(event);
        break;

      case 'subscription.created':
      case 'subscription.updated':
        await this.handleSubscriptionUpsert(event);
        break;

      case 'subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;

      case 'payment.succeeded':
        this.logger.log(
          `Payment succeeded for customer: ${event.data.customerId}`,
        );
        break;

      case 'payment.failed':
        this.logger.warn(
          `Payment failed for customer: ${event.data.customerId}`,
        );
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(event: WebhookEvent) {
    const { userId, customerId, subscriptionId } = event.data;

    if (!userId || !customerId || !subscriptionId) {
      this.logger.warn('Checkout completed but missing required data');
      return;
    }

    // Busca os dados da subscription do provider
    const subscriptionData =
      await this.paymentGateway.getSubscription(subscriptionId);

    if (!subscriptionData) {
      this.logger.warn(`Subscription ${subscriptionId} not found in provider`);
      return;
    }

    // Cria a subscription no banco de dados
    await this.db.insert(schema.subscription).values({
      userId,
      providerCustomerId: customerId,
      providerSubscriptionId: subscriptionId,
      providerPriceId: subscriptionData.priceId || '',
      provider: this.paymentGateway.providerName,
      status:
        subscriptionData.status as (typeof schema.subscriptionStatusEnum.enumValues)[number],
      currentPeriodStart: subscriptionData.currentPeriodStart!,
      currentPeriodEnd: subscriptionData.currentPeriodEnd!,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
    });

    await this.invalidateUserSubscriptionCache(userId);

    this.logger.log(`Subscription created for user ${userId}`);
  }

  private async handleSubscriptionUpsert(event: WebhookEvent) {
    const {
      subscriptionId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      priceId,
    } = event.data;

    if (!subscriptionId) {
      return;
    }

    // Busca a subscription existente
    const [existingSubscription] = await this.db
      .select()
      .from(schema.subscription)
      .where(eq(schema.subscription.providerSubscriptionId, subscriptionId))
      .limit(1);

    if (existingSubscription) {
      // Atualiza a subscription existente
      await this.db
        .update(schema.subscription)
        .set({
          status:
            status as (typeof schema.subscriptionStatusEnum.enumValues)[number],
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: cancelAtPeriodEnd || false,
          providerPriceId: priceId,
        })
        .where(eq(schema.subscription.providerSubscriptionId, subscriptionId));

      await this.invalidateUserSubscriptionCache(existingSubscription.userId);

      this.logger.log(`Subscription ${subscriptionId} updated`);
    } else {
      this.logger.warn(
        `Subscription ${subscriptionId} not found in database. ` +
          `It may have been created outside of checkout flow.`,
      );
    }
  }

  private async handleSubscriptionDeleted(event: WebhookEvent) {
    const { subscriptionId } = event.data;

    if (!subscriptionId) {
      return;
    }

    const [existingSubscription] = await this.db
      .select()
      .from(schema.subscription)
      .where(eq(schema.subscription.providerSubscriptionId, subscriptionId))
      .limit(1);

    if (existingSubscription) {
      await this.db
        .update(schema.subscription)
        .set({
          status: 'canceled',
          canceledAt: new Date(),
        })
        .where(eq(schema.subscription.providerSubscriptionId, subscriptionId));

      await this.invalidateUserSubscriptionCache(existingSubscription.userId);

      this.logger.log(`Subscription ${subscriptionId} canceled`);
    }
  }

  private async invalidateUserSubscriptionCache(userId: string) {
    await this.cacheService.del(`subscription:user:${userId}`);
  }
}
