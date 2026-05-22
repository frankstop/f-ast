using System;
using System.Collections.Generic;

namespace Legacy.Billing
{
    public class InvoiceService
    {
        private InvoiceRepository repository;

        public InvoiceService(InvoiceRepository repository)
        {
            this.repository = repository;
        }

        public Invoice FindInvoice(string id)
        {
            Invoice invoice = repository.FindById(id);
            Audit(invoice);
            return invoice;
        }

        private void Audit(Invoice invoice)
        {
            Console.WriteLine(invoice.Number);
        }
    }
}
