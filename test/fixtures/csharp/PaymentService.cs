using System;

namespace Legacy.Payments
{
    public class PaymentService
    {
        private PaymentRepository repository;

        public Payment Load(string id)
        {
            Payment payment = repository.FindById(id);
            Notify(payment);
            return payment;
        }

        private void Notify(Payment payment)
        {
            Console.WriteLine(payment.ToString());
        }
    }
}
