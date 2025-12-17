export interface CustomerData {
  id?: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionData {
  id?: string;
  customerId: string;
  priceId: string;
  status?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

export interface ProductData {
  id?: string;
  name: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, string>;
}

export interface PriceData {
  id?: string;
  productId: string;
  unitAmount: number;
  currency: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
  };
}

export interface PaymentIntentData {
  id?: string;
  amount: number;
  currency: string;
  customerId?: string;
  status?: string;
  clientSecret?: string;
}

export interface RefundData {
  id?: string;
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

export interface PaymentLinkData {
  id?: string;
  url?: string;
  priceId: string;
  quantity?: number;
}

export interface BalanceData {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
}

export interface WebhookEvent {
  type:
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.deleted'
    | 'checkout.completed'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'unknown';
  data: {
    customerId: string;
    subscriptionId?: string;
    status?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    priceId?: string;
    userId?: string;
  };
}

export interface BillingPortalSession {
  url: string;
}

export interface IPaymentGateway {
  readonly providerName: string;

  createCustomer(data: CustomerData): Promise<CustomerData>;
  getCustomer(customerId: string): Promise<CustomerData | null>;
  listCustomers(): Promise<CustomerData[]>;

  createProduct(data: ProductData, price?: PriceData): Promise<ProductData>;
  getProduct(productId: string): Promise<ProductData | null>;
  listProducts(): Promise<ProductData[]>;

  createSubscription(data: SubscriptionData): Promise<SubscriptionData>;
  getSubscription(subscriptionId: string): Promise<SubscriptionData | null>;
  cancelSubscription(
    subscriptionId: string,
    immediate?: boolean,
  ): Promise<void>;

  createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntentData>;

  createRefund(data: RefundData): Promise<RefundData>;

  createPaymentLink(data: PaymentLinkData): Promise<PaymentLinkData>;
  createPaymentLink(data: PaymentLinkData): Promise<PaymentLinkData>;

  getBalance(): Promise<BalanceData>;

  constructWebhookEvent(payload: Buffer, signature: string): WebhookEvent;

  createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<BillingPortalSession>;
}
