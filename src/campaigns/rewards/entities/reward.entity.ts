export class Reward {
  id: number;
  campaignId: string;
  title: string;
  description: string;
  type: 'file' | 'link' | 'coupon_code' | 'text';
  content: string;
  goalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
