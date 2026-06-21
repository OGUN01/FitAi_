// Manual mock for react-native-razorpay.
//
// The real package is a native payment SDK (RazorpayCheckout.open launches the
// native payment sheet). It has no unit-testable logic and pulls in ESM
// transitively that crashes Jest's node env ("Cannot use import statement
// outside a module") in suites that import subscriptionStore → RazorpayService.
// Mocking it as a no-op `open` lets those suites run without the native module.
const open = jest.fn(() =>
  Promise.resolve({
    razorpay_payment_id: "mock_payment_id",
    status: "success",
  }),
);

module.exports = { default: { open } };
