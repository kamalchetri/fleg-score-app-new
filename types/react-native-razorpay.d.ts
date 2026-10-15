declare module "react-native-razorpay" {
  export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: { email?: string; contact?: string; name?: string };
    theme?: { color?: string };
  }

  export interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayCheckout {
    open: (options: RazorpayOptions) => Promise<RazorpaySuccess>;
  }

  const checkout: RazorpayCheckout;
  export default checkout;
}
